"""
PageSpeed Insights API Tool
Core Web Vitals (LCP, INP, CLS), performance scores, and optimization suggestions.
Uses the free PageSpeed Insights API (no key required for basic use, key recommended for quota).
"""
import os
import json
import requests


# Optional API key for higher quota (default: 25K requests/day with key, 25/day without)
PSI_API_KEY = os.getenv("GOOGLE_PSI_API_KEY", os.getenv("GOOGLE_CUSTOM_SEARCH_API_KEY", ""))


def _call_psi(url: str, strategy: str = "mobile") -> dict:
    """Call PageSpeed Insights API."""
    endpoint = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"
    params = {
        "url": url,
        "strategy": strategy,
        "category": ["performance", "accessibility", "best-practices", "seo"]
    }
    if PSI_API_KEY:
        params["key"] = PSI_API_KEY

    response = requests.get(endpoint, params=params, timeout=60)
    response.raise_for_status()
    return response.json()


def pagespeed_audit_fn(url: str, strategy: str = "mobile") -> str:
    """
    Run a full PageSpeed Insights audit on a URL.
    Returns Core Web Vitals, Lighthouse scores, and optimization opportunities.
    
    Args:
        url: The URL to audit
        strategy: 'mobile' or 'desktop' (default: mobile — Google uses mobile-first indexing)
    """
    try:
        data = _call_psi(url, strategy)
        
        # Extract Lighthouse scores
        categories = data.get("lighthouseResult", {}).get("categories", {})
        scores = {}
        for cat_key, cat_data in categories.items():
            scores[cat_key] = int((cat_data.get("score", 0) or 0) * 100)
        
        # Extract Core Web Vitals from CrUX (real user data)
        crux = data.get("loadingExperience", {}).get("metrics", {})
        cwv = {}
        cwv_map = {
            "LARGEST_CONTENTFUL_PAINT_MS": {"name": "LCP", "unit": "ms", "good": 2500, "poor": 4000},
            "INTERACTION_TO_NEXT_PAINT": {"name": "INP", "unit": "ms", "good": 200, "poor": 500},
            "CUMULATIVE_LAYOUT_SHIFT_SCORE": {"name": "CLS", "unit": "", "good": 0.1, "poor": 0.25},
            "FIRST_CONTENTFUL_PAINT_MS": {"name": "FCP", "unit": "ms", "good": 1800, "poor": 3000},
            "FIRST_INPUT_DELAY_MS": {"name": "FID", "unit": "ms", "good": 100, "poor": 300},
            "EXPERIMENTAL_TIME_TO_FIRST_BYTE": {"name": "TTFB", "unit": "ms", "good": 800, "poor": 1800},
        }
        
        for metric_key, meta in cwv_map.items():
            if metric_key in crux:
                pct = crux[metric_key].get("percentile", None)
                category = crux[metric_key].get("category", "N/A")
                if pct is not None:
                    value = pct / 100 if meta["name"] == "CLS" else pct
                    cwv[meta["name"]] = {
                        "value": value,
                        "unit": meta["unit"],
                        "rating": category,
                        "good_threshold": meta["good"],
                        "poor_threshold": meta["poor"]
                    }
        
        has_crux = len(cwv) > 0
        
        # Extract lab data as fallback
        audits = data.get("lighthouseResult", {}).get("audits", {})
        lab_metrics = {}
        lab_keys = {
            "largest-contentful-paint": "LCP",
            "interactive": "TTI",
            "speed-index": "Speed Index",
            "total-blocking-time": "TBT",
            "cumulative-layout-shift": "CLS",
            "first-contentful-paint": "FCP",
            "server-response-time": "TTFB",
        }
        for audit_key, label in lab_keys.items():
            if audit_key in audits:
                lab_metrics[label] = {
                    "value": audits[audit_key].get("displayValue", "N/A"),
                    "score": int((audits[audit_key].get("score", 0) or 0) * 100),
                    "numeric_value": audits[audit_key].get("numericValue")
                }
        
        # Extract top opportunities (optimizations)
        opportunities = []
        for key, audit in audits.items():
            if audit.get("details", {}).get("type") == "opportunity" and audit.get("score") is not None and audit["score"] < 0.9:
                savings = audit.get("details", {}).get("overallSavingsMs", 0)
                if savings > 0:
                    opportunities.append({
                        "audit": audit.get("title", key),
                        "description": audit.get("description", ""),
                        "savings_ms": savings,
                        "score": int(audit["score"] * 100)
                    })
        
        opportunities.sort(key=lambda x: x["savings_ms"], reverse=True)
        
        # Extract diagnostics (issues)
        diagnostics = []
        for key, audit in audits.items():
            if audit.get("details", {}).get("type") == "table" and audit.get("score") is not None and audit["score"] < 0.5:
                diagnostics.append({
                    "audit": audit.get("title", key),
                    "description": audit.get("description", "")[:200],
                    "score": int(audit["score"] * 100)
                })
        
        result = {
            "url": url,
            "strategy": strategy,
            "scores": scores,
            "core_web_vitals": cwv if has_crux else {"note": "No CrUX (real user) data available — site may not have enough traffic. Lab data shown instead."},
            "lab_metrics": lab_metrics,
            "top_opportunities": opportunities[:10],
            "diagnostics": diagnostics[:10],
            "source": "Google PageSpeed Insights API",
            "has_real_user_data": has_crux
        }
        
        return json.dumps(result, indent=2)
        
    except Exception as e:
        return json.dumps({"error": str(e), "tool": "pagespeed_audit", "url": url})


def pagespeed_compare_fn(urls: list, strategy: str = "mobile") -> str:
    """
    Compare PageSpeed scores across multiple URLs (e.g., your page vs competitors).
    
    Args:
        urls: List of URLs to compare
        strategy: 'mobile' or 'desktop'
    """
    try:
        results = []
        for url in urls[:5]:  # Limit to 5 to avoid timeout
            try:
                data = _call_psi(url, strategy)
                categories = data.get("lighthouseResult", {}).get("categories", {})
                scores = {}
                for cat_key, cat_data in categories.items():
                    scores[cat_key] = int((cat_data.get("score", 0) or 0) * 100)
                
                # Get LCP from lab
                audits = data.get("lighthouseResult", {}).get("audits", {})
                lcp_val = audits.get("largest-contentful-paint", {}).get("numericValue")
                cls_val = audits.get("cumulative-layout-shift", {}).get("numericValue")
                
                results.append({
                    "url": url,
                    "scores": scores,
                    "lcp_ms": round(lcp_val) if lcp_val else None,
                    "cls": round(cls_val, 3) if cls_val else None,
                })
            except Exception as e:
                results.append({"url": url, "error": str(e)})
        
        return json.dumps({
            "strategy": strategy,
            "comparison": results,
            "source": "Google PageSpeed Insights API"
        }, indent=2)
        
    except Exception as e:
        return json.dumps({"error": str(e), "tool": "pagespeed_compare"})


def core_web_vitals_fn(url: str) -> str:
    """
    Get Core Web Vitals for a URL — both mobile and desktop.
    Quick check focused on the 3 CWV metrics Google uses for ranking.
    """
    try:
        results = {}
        for strategy in ["mobile", "desktop"]:
            data = _call_psi(url, strategy)
            crux = data.get("loadingExperience", {}).get("metrics", {})
            audits = data.get("lighthouseResult", {}).get("audits", {})
            
            # Prefer CrUX data, fall back to lab
            lcp = crux.get("LARGEST_CONTENTFUL_PAINT_MS", {}).get("percentile")
            inp = crux.get("INTERACTION_TO_NEXT_PAINT", {}).get("percentile")
            cls = crux.get("CUMULATIVE_LAYOUT_SHIFT_SCORE", {}).get("percentile")
            
            if not lcp:
                lcp = audits.get("largest-contentful-paint", {}).get("numericValue")
            if not cls:
                cls_raw = audits.get("cumulative-layout-shift", {}).get("numericValue")
                cls = round(cls_raw * 100) if cls_raw else None  # Convert to match CrUX scale
            
            def _rate(val, good, poor):
                if val is None: return "N/A"
                if val <= good: return "GOOD"
                if val <= poor: return "NEEDS_IMPROVEMENT"
                return "POOR"
            
            results[strategy] = {
                "LCP_ms": lcp,
                "LCP_rating": _rate(lcp, 2500, 4000),
                "INP_ms": inp,
                "INP_rating": _rate(inp, 200, 500),
                "CLS": round(cls / 100, 3) if cls else None,
                "CLS_rating": _rate(cls, 10, 25) if cls else "N/A",
                "overall_assessment": crux.get("LARGEST_CONTENTFUL_PAINT_MS", {}).get("category", "N/A"),
                "data_source": "CrUX (real users)" if crux.get("LARGEST_CONTENTFUL_PAINT_MS", {}).get("percentile") else "Lab (Lighthouse)"
            }
        
        # Overall pass/fail
        mobile = results.get("mobile", {})
        cwv_pass = all([
            mobile.get("LCP_rating") == "GOOD",
            mobile.get("INP_rating") in ["GOOD", "N/A"],
            mobile.get("CLS_rating") == "GOOD"
        ])
        
        return json.dumps({
            "url": url,
            "core_web_vitals_assessment": "PASS" if cwv_pass else "FAIL",
            "mobile": results.get("mobile"),
            "desktop": results.get("desktop"),
            "source": "Google PageSpeed Insights API",
            "note": "Google uses mobile CWV for ranking signals"
        }, indent=2)
        
    except Exception as e:
        return json.dumps({"error": str(e), "tool": "core_web_vitals"})
