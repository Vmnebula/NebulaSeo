"""
NebulaSEO SEO Automation Orchestrator v5.3
Runs the full closed-loop SEO workflow AUTONOMOUSLY.
Called by Cloud Scheduler twice daily (8AM & 8PM UTC).

Workflow:
1. DETECT  → Scan keywords, pages, Core Web Vitals for issues
2. ANALYZE → PageSpeed audit, schema validation on top pages
3. FIX     → Auto-generate fixes, create GitHub PRs (NO human approval needed)
4. INDEX   → Submit changed URLs for re-indexing + ping sitemap
5. REPORT  → Compile summary of all actions taken
"""

import json
import logging
import time
import traceback
from collections import deque
from datetime import UTC, datetime
from typing import Any

# Import all tool functions
from src.tools.bigquery_tool import analyze_keyword_drops_fn
from src.tools.gsc_api_tool import (
    gsc_live_country_breakdown_fn,
    gsc_live_device_breakdown_fn,
    gsc_live_keywords_fn,
    gsc_live_pages_fn,
)
from src.tools.indexing_tool import request_indexing_fn, sitemap_ping_fn
from src.tools.pagespeed_tool import core_web_vitals_fn, pagespeed_audit_fn
from src.tools.schema_validator_tool import validate_schema_on_page_fn

# v5.3: Import SEO action functions for autonomous fixes
from src.tools.seo_actions import add_schema_markup_fn, fix_meta_tags_fn

logger = logging.getLogger("SEOAutomation")

# ============================================================================
# AUTOMATION CONFIGURATION
# ============================================================================

SITE_URL = "https://example.com"
SITEMAP_URL = "https://example.com/sitemap.xml"
TOP_PAGES_TO_AUDIT = 5  # Number of top pages to run PageSpeed on
CWV_THRESHOLDS = {
    "LCP": 2.5,   # seconds — Good threshold
    "INP": 200,    # ms — Good threshold
    "CLS": 0.1     # unitless — Good threshold
}
KEYWORD_DROP_THRESHOLD = -3  # positions

# Map NebulaSEO URLs to their file paths in the your-org/your-website-repo repo
URL_TO_FILE_PATH = {
    "https://example.com": "website/src/app/page.tsx",
    "https://example.com/": "website/src/app/page.tsx",
    "https://example.com/about": "website/src/app/about/page.tsx",
    "https://example.com/services": "website/src/app/services/page.tsx",
    "https://example.com/products": "website/src/app/products/page.tsx",
    "https://example.com/contact": "website/src/app/contact/page.tsx",
    "https://example.com/blog": "website/src/app/blog/page.tsx",
    "https://example.com/planner": "website/src/app/planner/page.tsx",
    "https://example.com/privacy": "website/src/app/privacy/page.tsx",
    "https://example.com/terms": "website/src/app/terms/page.tsx",
}

# Schema types that should exist on key pages
REQUIRED_SCHEMAS = {
    "https://example.com": ["Organization", "WebSite"],
    "https://example.com/services": ["Service"],
    "https://example.com/products": ["Product"],
    "https://example.com/contact": ["LocalBusiness"],
    "https://example.com/about": ["Organization"],
    "https://example.com/blog": ["Blog"],
}

# Default schema data templates
SCHEMA_DATA_TEMPLATES = {
    "Organization": {
        "name": "NebulaSEO",
        "description": "Dubai-based product studio specializing in AI automation, mobile app development, and cloud solutions",
        "url": "https://example.com",
        "logo": "https://example.com/logo.png",
        "sameAs": [],
        "contactPoint": {"@type": "ContactPoint", "contactType": "customer service"}
    },
    "WebSite": {
        "name": "NebulaSEO",
        "url": "https://example.com",
        "description": "AI-powered product studio in Dubai"
    },
    "Service": {
        "provider": {"@type": "Organization", "name": "NebulaSEO"},
        "areaServed": "Dubai, UAE",
        "serviceType": "AI Automation & Mobile App Development"
    },
    "LocalBusiness": {
        "name": "NebulaSEO",
        "address": {"@type": "PostalAddress", "addressLocality": "Dubai", "addressCountry": "AE"},
        "url": "https://example.com"
    },
    "Product": {
        "brand": {"@type": "Brand", "name": "NebulaSEO"},
        "manufacturer": {"@type": "Organization", "name": "NebulaSEO"}
    },
    "Blog": {
        "name": "NebulaSEO Blog",
        "url": "https://example.com/blog",
        "publisher": {"@type": "Organization", "name": "NebulaSEO"}
    },
    "BreadcrumbList": {}
}


def _safe_call(fn_name: str, fn, *args, **kwargs) -> dict[str, Any]:
    """Safely call a tool function and return structured result."""
    start = time.time()
    try:
        result = fn(*args, **kwargs)
        duration = int((time.time() - start) * 1000)
        # Parse if string
        if isinstance(result, str):
            try:
                result = json.loads(result)
            except (json.JSONDecodeError, TypeError):
                result = {"raw": result}
        return {
            "tool": fn_name,
            "status": "success",
            "duration_ms": duration,
            "data": result
        }
    except Exception as e:
        duration = int((time.time() - start) * 1000)
        logger.error(f"[Automation] {fn_name} failed: {e}")
        return {
            "tool": fn_name,
            "status": "error",
            "duration_ms": duration,
            "error": str(e)
        }


# ============================================================================
# STEP 1: DETECT — Scan for keyword drops & performance issues
# ============================================================================

def step_detect() -> dict[str, Any]:
    """Detect SEO issues: keyword drops, traffic changes, device/country shifts."""
    logger.info("[Automation] Step 1: DETECT — Scanning for issues...")
    
    results = {}
    
    # 1a. Get live keyword data
    kw_result = _safe_call("gsc_live_keywords", gsc_live_keywords_fn, 7, 30)
    results["keywords"] = kw_result
    
    # 1b. Get top pages
    pages_result = _safe_call("gsc_live_pages", gsc_live_pages_fn, 7, 20)
    results["pages"] = pages_result
    
    # 1c. Device breakdown
    device_result = _safe_call("gsc_live_device_breakdown", gsc_live_device_breakdown_fn, 7)
    results["devices"] = device_result
    
    # 1d. Country breakdown
    country_result = _safe_call("gsc_live_country_breakdown", gsc_live_country_breakdown_fn, 7, 10)
    results["countries"] = country_result
    
    # 1e. Check for keyword drops via BigQuery
    drops_result = _safe_call("analyze_keyword_drops", analyze_keyword_drops_fn, 10)
    results["keyword_drops"] = drops_result
    
    # Extract top page URLs for auditing
    top_urls = []
    if pages_result["status"] == "success":
        pages_data = pages_result.get("data", {})
        if isinstance(pages_data, dict):
            page_list = pages_data.get("pages", pages_data.get("keywords", []))
            if isinstance(page_list, list):
                for p in page_list[:TOP_PAGES_TO_AUDIT]:
                    url = p.get("page", p.get("url", p.get("keys", [""])[0] if isinstance(p.get("keys"), list) else ""))
                    if url and url.startswith("http"):
                        top_urls.append(url)
    
    # Fallback: always include homepage
    if SITE_URL not in top_urls:
        top_urls.insert(0, SITE_URL)
    
    results["top_urls_to_audit"] = top_urls[:TOP_PAGES_TO_AUDIT]
    
    # Summarize issues detected
    issues = []
    if drops_result["status"] == "success":
        drops_data = drops_result.get("data", {})
        if isinstance(drops_data, dict):
            drop_list = drops_data.get("keyword_drops", drops_data.get("keywords", []))
            if isinstance(drop_list, list):
                for d in drop_list:
                    change = d.get("position_change", d.get("change", 0))
                    if isinstance(change, (int, float)) and change < KEYWORD_DROP_THRESHOLD:
                        issues.append({
                            "type": "keyword_drop",
                            "keyword": d.get("keyword", "unknown"),
                            "change": change
                        })
    
    results["issues_detected"] = issues
    results["issue_count"] = len(issues)
    
    logger.info(f"[Automation] DETECT complete: {len(issues)} issues, {len(top_urls)} pages to audit")
    return results


# ============================================================================
# STEP 2: ANALYZE — PageSpeed audits & schema validation
# ============================================================================

def step_analyze(top_urls: list[str]) -> dict[str, Any]:
    """Analyze top pages: PageSpeed, Core Web Vitals, Schema validation."""
    logger.info(f"[Automation] Step 2: ANALYZE — Auditing {len(top_urls)} pages...")
    
    results = {"pagespeed": [], "schema": [], "cwv_issues": []}
    
    for url in top_urls:
        # 2a. PageSpeed audit (mobile)
        ps_result = _safe_call("pagespeed_audit", pagespeed_audit_fn, url, "mobile")
        results["pagespeed"].append({"url": url, **ps_result})
        
        # Check for CWV issues
        if ps_result["status"] == "success":
            data = ps_result.get("data", {})
            metrics = data.get("metrics", data.get("lighthouse", {}))
            
            lcp = metrics.get("largest_contentful_paint", metrics.get("LCP", {
            }))
            cls_val = metrics.get("cumulative_layout_shift", metrics.get("CLS", {}))
            
            if isinstance(lcp, (int, float)) and lcp > CWV_THRESHOLDS["LCP"]:
                results["cwv_issues"].append({
                    "url": url, "metric": "LCP", 
                    "value": lcp, "threshold": CWV_THRESHOLDS["LCP"]
                })
            if isinstance(cls_val, (int, float)) and cls_val > CWV_THRESHOLDS["CLS"]:
                results["cwv_issues"].append({
                    "url": url, "metric": "CLS",
                    "value": cls_val, "threshold": CWV_THRESHOLDS["CLS"]
                })
        
        # 2b. Schema validation
        schema_result = _safe_call("validate_schema_on_page", validate_schema_on_page_fn, url)
        results["schema"].append({"url": url, **schema_result})
    
    # 2c. Core Web Vitals (CrUX) for the site
    cwv_result = _safe_call("core_web_vitals", core_web_vitals_fn, SITE_URL)
    results["core_web_vitals_crux"] = cwv_result
    
    logger.info(f"[Automation] ANALYZE complete: {len(results['cwv_issues'])} CWV issues")
    return results


# ============================================================================
# STEP 3: FIX — Auto-create GitHub PRs for detected issues
# ============================================================================

def _url_to_filepath(url: str) -> str:
    """Map a NebulaSEO URL to its file path in the repo."""
    # Normalize URL
    url_clean = url.rstrip("/")
    if url_clean in URL_TO_FILE_PATH:
        return URL_TO_FILE_PATH[url_clean]
    # Try with trailing slash
    if url_clean + "/" in URL_TO_FILE_PATH:
        return URL_TO_FILE_PATH[url_clean + "/"]
    # For blog posts: /blog/some-slug → website/src/app/blog/[slug]/page.tsx
    if "/blog/" in url_clean:
        return "website/src/app/blog/[slug]/page.tsx"
    return ""


def step_fix(analyze_results: dict[str, Any], detect_results: dict[str, Any]) -> dict[str, Any]:
    """
    AUTONOMOUS FIX: Create GitHub PRs for all detected issues.
    
    Fixes:
    - Missing schema markup → add_schema_markup_fn (creates PR)
    - Meta tag issues found by page analysis
    - Heading structure problems
    """
    logger.info("[Automation] Step 3: FIX — Creating GitHub PRs for detected issues...")
    
    results = {"prs_created": [], "fixes_attempted": 0, "fixes_succeeded": 0, "fixes_skipped": []}
    
    # ---- FIX 3a: Missing Schema Markup ----
    schema_results = analyze_results.get("schema", [])
    
    for schema_entry in schema_results:
        url = schema_entry.get("url", "")
        if not url or schema_entry.get("status") != "success":
            continue
        
        schema_data = schema_entry.get("data", {})
        if isinstance(schema_data, str):
            try:
                schema_data = json.loads(schema_data)
            except (json.JSONDecodeError, TypeError):
                continue
        
        # Get existing schema types on the page
        existing_schemas = []
        found_schemas = schema_data.get("schemas_found", schema_data.get("schemas", []))
        if isinstance(found_schemas, list):
            for s in found_schemas:
                if isinstance(s, dict):
                    existing_schemas.append(s.get("type", s.get("@type", "")))
                elif isinstance(s, str):
                    existing_schemas.append(s)
        
        # Check what schemas are REQUIRED but MISSING for this URL
        url_clean = url.rstrip("/")
        required = REQUIRED_SCHEMAS.get(url_clean, [])
        
        for schema_type in required:
            if schema_type not in existing_schemas:
                file_path = _url_to_filepath(url)
                if not file_path:
                    results["fixes_skipped"].append({
                        "url": url,
                        "reason": "No file mapping for URL",
                        "schema_type": schema_type
                    })
                    continue
                
                results["fixes_attempted"] += 1
                logger.info(f"[Automation] FIX: Adding {schema_type} schema to {url} ({file_path})")
                
                # Get template data for this schema type
                template_data = SCHEMA_DATA_TEMPLATES.get(schema_type, {})
                
                fix_result = _safe_call(
                    f"add_schema_{schema_type.lower()}",
                    add_schema_markup_fn,
                    url,          # page_url
                    file_path,    # file_path in repo
                    schema_type,  # schema_type
                    template_data # schema_data
                )
                
                if fix_result["status"] == "success":
                    pr_info = fix_result.get("data", {})
                    if isinstance(pr_info, str):
                        try:
                            pr_info = json.loads(pr_info)
                        except (json.JSONDecodeError, TypeError):
                            pr_info = {"raw": pr_info}
                    
                    results["fixes_succeeded"] += 1
                    results["prs_created"].append({
                        "type": "schema",
                        "schema_type": schema_type,
                        "url": url,
                        "file_path": file_path,
                        "pr_url": pr_info.get("pr_url", ""),
                        "pr_number": pr_info.get("pr_number", ""),
                        "branch": pr_info.get("branch", "")
                    })
                else:
                    results["fixes_skipped"].append({
                        "url": url,
                        "schema_type": schema_type,
                        "reason": fix_result.get("error", "Unknown error")
                    })
    
    # ---- FIX 3b: Meta tag issues for pages with low CTR ----
    # If we detect pages with very low CTR, fix their meta tags
    keywords_data = detect_results.get("keywords", {})
    if keywords_data.get("status") == "success":
        kw_result = keywords_data.get("data", {})
        if isinstance(kw_result, str):
            try:
                kw_result = json.loads(kw_result)
            except (json.JSONDecodeError, TypeError):
                kw_result = {}
        
        kw_list = kw_result.get("keywords", kw_result.get("rows", []))
        if isinstance(kw_list, list):
            for kw in kw_list:
                ctr = kw.get("ctr", kw.get("CTR", 1.0))
                impressions = kw.get("impressions", 0)
                keyword = kw.get("keyword", kw.get("query", ""))
                
                # Only fix pages with significant impressions but very low CTR
                if isinstance(ctr, (int, float)) and isinstance(impressions, (int, float)):
                    if ctr < 0.02 and impressions > 50 and keyword:
                        # Find the page URL for this keyword
                        page_url = kw.get("page", kw.get("url", SITE_URL))
                        file_path = _url_to_filepath(page_url)
                        
                        if file_path:
                            results["fixes_attempted"] += 1
                            logger.info(f"[Automation] FIX: Improving meta tags for '{keyword}' on {page_url} (CTR: {ctr})")
                            
                            fix_result = _safe_call(
                                f"fix_meta_{keyword[:20]}",
                                fix_meta_tags_fn,
                                page_url,
                                file_path,
                                keyword,
                                ["improve_title", "improve_meta_description"]
                            )
                            
                            if fix_result["status"] == "success":
                                pr_info = fix_result.get("data", {})
                                if isinstance(pr_info, str):
                                    try:
                                        pr_info = json.loads(pr_info)
                                    except (json.JSONDecodeError, TypeError):
                                        pr_info = {"raw": pr_info}
                                
                                results["fixes_succeeded"] += 1
                                results["prs_created"].append({
                                    "type": "meta_tags",
                                    "keyword": keyword,
                                    "url": page_url,
                                    "ctr_before": ctr,
                                    "pr_url": pr_info.get("pr_url", ""),
                                    "pr_number": pr_info.get("pr_number", "")
                                })
    
    logger.info(
        f"[Automation] FIX complete: {results['fixes_attempted']} attempted, "
        f"{results['fixes_succeeded']} succeeded, {len(results['prs_created'])} PRs created"
    )
    return results


# ============================================================================
# STEP 4: INDEX — Submit URLs for re-crawling & ping sitemap
# ============================================================================

def step_index(urls_to_index: list[str], fix_results: dict[str, Any] = None) -> dict[str, Any]:
    """Submit URLs for re-indexing and ping sitemap. Also indexes any URLs that got PRs."""
    logger.info(f"[Automation] Step 4: INDEX — Submitting {len(urls_to_index)} URLs...")
    
    results = {"indexing_requests": [], "sitemap_ping": None}
    
    # Also index URLs that got PRs (they'll need re-crawling after merge)
    if fix_results:
        for pr in fix_results.get("prs_created", []):
            pr_url = pr.get("url", "")
            if pr_url and pr_url not in urls_to_index:
                urls_to_index.append(pr_url)
    
    # 4a. Request indexing for each URL
    for url in urls_to_index[:10]:  # Limit to 10 per run
        idx_result = _safe_call("request_indexing", request_indexing_fn, url, "URL_UPDATED")
        results["indexing_requests"].append({"url": url, **idx_result})
    
    # 4b. Ping sitemap
    sitemap_result = _safe_call("sitemap_ping", sitemap_ping_fn, SITEMAP_URL)
    results["sitemap_ping"] = sitemap_result
    
    logger.info(f"[Automation] INDEX complete: {len(results['indexing_requests'])} requests sent")
    return results


# ============================================================================
# STEP 5: REPORT — Compile automation summary
# ============================================================================

def compile_report(
    detect_results: dict,
    analyze_results: dict,
    fix_results: dict,
    index_results: dict,
    total_duration_ms: int
) -> dict[str, Any]:
    """Compile a full automation run report."""
    
    now = datetime.now(UTC).isoformat()
    
    # Count successes/failures across ALL steps
    all_tool_calls = []
    for step_data in [detect_results, analyze_results, fix_results, index_results]:
        if isinstance(step_data, dict):
            for val in step_data.values():
                if isinstance(val, dict) and "status" in val:
                    all_tool_calls.append(val)
                elif isinstance(val, list):
                    for item in val:
                        if isinstance(item, dict) and "status" in item:
                            all_tool_calls.append(item)
    
    successes = sum(1 for t in all_tool_calls if t.get("status") == "success")
    failures = sum(1 for t in all_tool_calls if t.get("status") == "error")
    
    # Extract key metrics
    keyword_count = 0
    if detect_results.get("keywords", {}).get("status") == "success":
        kw_data = detect_results["keywords"].get("data", {})
        if isinstance(kw_data, dict):
            keyword_count = len(kw_data.get("keywords", kw_data.get("rows", [])))
    
    cwv_issue_count = len(analyze_results.get("cwv_issues", []))
    pages_audited = len(analyze_results.get("pagespeed", []))
    schemas_checked = len(analyze_results.get("schema", []))
    urls_indexed = len(index_results.get("indexing_requests", []))
    prs_created = len(fix_results.get("prs_created", []))
    fixes_attempted = fix_results.get("fixes_attempted", 0)
    fixes_succeeded = fix_results.get("fixes_succeeded", 0)
    
    report = {
        "run_id": f"auto_{int(time.time())}",
        "timestamp": now,
        "status": "completed",
        "duration_ms": total_duration_ms,
        "summary": {
            "total_tool_calls": len(all_tool_calls),
            "successes": successes,
            "failures": failures,
            "keywords_tracked": keyword_count,
            "pages_audited": pages_audited,
            "schemas_checked": schemas_checked,
            "cwv_issues_found": cwv_issue_count,
            "prs_created": prs_created,
            "fixes_attempted": fixes_attempted,
            "fixes_succeeded": fixes_succeeded,
            "urls_submitted_for_indexing": urls_indexed,
            "keyword_drops_detected": detect_results.get("issue_count", 0)
        },
        "steps": {
            "detect": {
                "issues_found": detect_results.get("issue_count", 0),
                "top_urls": detect_results.get("top_urls_to_audit", []),
                "keyword_drops": detect_results.get("issues_detected", [])
            },
            "analyze": {
                "cwv_issues": analyze_results.get("cwv_issues", []),
                "pages_audited": pages_audited,
                "schemas_checked": schemas_checked
            },
            "fix": {
                "prs_created": fix_results.get("prs_created", []),
                "fixes_attempted": fixes_attempted,
                "fixes_succeeded": fixes_succeeded,
                "fixes_skipped": fix_results.get("fixes_skipped", [])
            },
            "index": {
                "urls_submitted": urls_indexed,
                "sitemap_pinged": index_results.get("sitemap_ping", {}).get("status") == "success"
            }
        }
    }
    
    return report


# ============================================================================
# MAIN ORCHESTRATOR — Run the full automation loop
# ============================================================================

def run_full_automation() -> dict[str, Any]:
    """
    Run the complete SEO automation loop.
    Called by /automate endpoint via Cloud Scheduler.
    
    Returns a structured report of all actions taken.
    """
    run_start = time.time()
    run_id = f"auto_{int(run_start)}"
    
    logger.info(f"[Automation] ========== STARTING FULL SEO LOOP (run_id={run_id}) ==========")
    
    try:
        # STEP 1: DETECT
        detect_results = step_detect()
        top_urls = detect_results.get("top_urls_to_audit", [SITE_URL])
        
        # STEP 2: ANALYZE
        analyze_results = step_analyze(top_urls)
        
        # STEP 3: FIX — Create GitHub PRs for detected issues (AUTONOMOUS)
        fix_results = step_fix(analyze_results, detect_results)
        
        # STEP 4: INDEX (submit all audited pages + fixed pages for fresh crawl)
        index_results = step_index(top_urls, fix_results)
        
        # STEP 5: REPORT
        total_duration = int((time.time() - run_start) * 1000)
        report = compile_report(detect_results, analyze_results, fix_results, index_results, total_duration)
        
        logger.info(
            f"[Automation] ========== COMPLETED in {total_duration}ms | "
            f"{report['summary']['successes']} ok, {report['summary']['failures']} errors, "
            f"{report['summary']['prs_created']} PRs created =========="
        )
        
        return report
        
    except Exception as e:
        total_duration = int((time.time() - run_start) * 1000)
        error_msg = traceback.format_exc()
        logger.error(f"[Automation] FATAL ERROR in run {run_id}: {error_msg}")
        
        return {
            "run_id": run_id,
            "timestamp": datetime.now(UTC).isoformat(),
            "status": "error",
            "duration_ms": total_duration,
            "error": str(e),
            "traceback": error_msg
        }


# ============================================================================
# AUTOMATION HISTORY (in-memory, last 50 runs)
# ============================================================================

AUTOMATION_HISTORY: deque = deque(maxlen=50)

def run_and_store() -> dict[str, Any]:
    """Run automation and store results in history."""
    report = run_full_automation()
    AUTOMATION_HISTORY.append(report)
    return report

def get_automation_history(limit: int = 10) -> list[dict[str, Any]]:
    """Get recent automation run history."""
    runs = list(AUTOMATION_HISTORY)
    return runs[-limit:][::-1]  # newest first
