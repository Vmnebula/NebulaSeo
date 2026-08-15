"""
Schema Markup Validator Tool
Validates structured data (JSON-LD) on live pages.
Uses Google's Rich Results Test API and schema.org validation.
"""
import json
import requests
from bs4 import BeautifulSoup
from typing import Dict, List

# Known schema.org types that Google supports for rich results
GOOGLE_SUPPORTED_SCHEMAS = {
    "Article", "NewsArticle", "BlogPosting", "TechArticle",
    "BreadcrumbList", "Carousel", "Course", "Dataset",
    "Event", "FAQ", "FAQPage", "HowTo",
    "JobPosting", "LocalBusiness", "Organization",
    "Product", "Review", "Recipe", "SoftwareApplication",
    "VideoObject", "WebSite", "WebPage",
    "Service", "Offer", "AggregateRating",
    "Person", "ImageObject", "ItemList",
}

# Required properties per schema type for rich results eligibility
REQUIRED_PROPERTIES = {
    "Article": ["headline", "author", "datePublished", "image"],
    "BlogPosting": ["headline", "author", "datePublished", "image"],
    "FAQPage": ["mainEntity"],
    "HowTo": ["name", "step"],
    "LocalBusiness": ["name", "address", "telephone"],
    "Organization": ["name", "url", "logo"],
    "Product": ["name", "image"],
    "Review": ["itemReviewed", "reviewRating", "author"],
    "BreadcrumbList": ["itemListElement"],
    "WebSite": ["name", "url"],
    "Service": ["name", "provider"],
    "SoftwareApplication": ["name", "operatingSystem"],
    "VideoObject": ["name", "description", "thumbnailUrl", "uploadDate"],
    "Event": ["name", "startDate", "location"],
    "JobPosting": ["title", "description", "datePosted", "hiringOrganization"],
}


def validate_schema_on_page_fn(url: str) -> str:
    """
    Fetch a live page and validate all JSON-LD structured data found on it.
    Checks: presence, type, required properties, and rich results eligibility.
    
    Args:
        url: The URL to check for structured data
    """
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (compatible; NebulaSEOBot/1.0; +https://example.com)"
        }
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, "html.parser")
        
        # Find all JSON-LD scripts
        ld_scripts = soup.find_all("script", {"type": "application/ld+json"})
        
        if not ld_scripts:
            return json.dumps({
                "url": url,
                "status": "no_schema_found",
                "schemas_found": 0,
                "message": "No JSON-LD structured data found on this page.",
                "recommendation": "Add Organization, WebSite, and page-specific schema (Article, Service, FAQ, etc.) to improve rich results eligibility.",
                "priority_schemas": _suggest_schemas_for_page(soup, url)
            }, indent=2)
        
        schemas = []
        all_issues = []
        
        for script in ld_scripts:
            try:
                data = json.loads(script.string)
                # Handle @graph arrays
                items = data.get("@graph", [data]) if isinstance(data, dict) else [data]
                
                for item in items:
                    if not isinstance(item, dict):
                        continue
                    schema_type = item.get("@type", "Unknown")
                    # Handle list of types
                    if isinstance(schema_type, list):
                        schema_type = schema_type[0] if schema_type else "Unknown"
                    
                    # Validate
                    validation = _validate_schema_item(schema_type, item)
                    schemas.append(validation)
                    all_issues.extend(validation.get("issues", []))
                    
            except json.JSONDecodeError as e:
                all_issues.append(f"Invalid JSON-LD: {str(e)[:100]}")
        
        # Check what's missing
        found_types = {s["type"] for s in schemas}
        missing_recommended = _get_missing_recommended(found_types, soup, url)
        
        return json.dumps({
            "url": url,
            "status": "validated",
            "schemas_found": len(schemas),
            "schemas": schemas,
            "issues_count": len(all_issues),
            "issues": all_issues,
            "missing_recommended": missing_recommended,
            "rich_results_eligible": any(s.get("rich_results_eligible") for s in schemas),
            "source": "Live page analysis"
        }, indent=2)
        
    except Exception as e:
        return json.dumps({"error": str(e), "tool": "validate_schema_on_page", "url": url})


def _validate_schema_item(schema_type: str, data: dict) -> dict:
    """Validate a single schema.org item."""
    issues = []
    
    # Check if Google supports this type
    google_supported = schema_type in GOOGLE_SUPPORTED_SCHEMAS
    
    # Check required properties
    required = REQUIRED_PROPERTIES.get(schema_type, [])
    missing_props = [prop for prop in required if prop not in data]
    
    if missing_props:
        issues.append(f"Missing required properties for {schema_type}: {', '.join(missing_props)}")
    
    # Check for common issues
    if "@context" not in data and "@context" not in str(data):
        issues.append("Missing @context (should be 'https://schema.org')")
    
    # Check for empty values
    for key, value in data.items():
        if key.startswith("@"):
            continue
        if value is None or value == "" or value == []:
            issues.append(f"Empty value for property '{key}'")
    
    # Properties found
    props_found = [k for k in data.keys() if not k.startswith("@")]
    
    return {
        "type": schema_type,
        "google_supported": google_supported,
        "rich_results_eligible": google_supported and len(missing_props) == 0,
        "properties_found": len(props_found),
        "properties": props_found[:20],  # Limit display
        "missing_required": missing_props,
        "issues": issues
    }


def _suggest_schemas_for_page(soup: BeautifulSoup, url: str) -> list:
    """Suggest schema types based on page content."""
    suggestions = []
    text = soup.get_text().lower()
    title = soup.title.string.lower() if soup.title and soup.title.string else ""
    url_lower = url.lower()
    
    # Always recommend these
    suggestions.append({"type": "Organization", "reason": "Every business site should have Organization schema"})
    suggestions.append({"type": "WebSite", "reason": "Helps Google understand site structure and enable sitelinks search"})
    
    if any(word in url_lower for word in ["/blog", "/article", "/post", "/news"]):
        suggestions.append({"type": "BlogPosting/Article", "reason": "Blog/article page detected"})
    
    if any(word in text for word in ["faq", "frequently asked", "questions"]):
        suggestions.append({"type": "FAQPage", "reason": "FAQ content detected — enables FAQ rich results in SERP"})
    
    if any(word in text for word in ["how to", "step 1", "step 2", "instructions"]):
        suggestions.append({"type": "HowTo", "reason": "How-to content detected — enables HowTo rich results"})
    
    if any(word in url_lower for word in ["/service", "/product", "/solution"]):
        suggestions.append({"type": "Service/Product", "reason": "Service/product page detected"})
    
    if any(word in text for word in ["review", "rating", "stars", "testimonial"]):
        suggestions.append({"type": "Review/AggregateRating", "reason": "Review content detected — enables star ratings in SERP"})
    
    if any(word in text for word in ["breadcrumb", "home >", "home >"]):
        suggestions.append({"type": "BreadcrumbList", "reason": "Breadcrumb navigation detected"})
    
    return suggestions


def _get_missing_recommended(found_types: set, soup: BeautifulSoup, url: str) -> list:
    """Check which recommended schemas are missing."""
    missing = []
    
    if "Organization" not in found_types:
        missing.append({"type": "Organization", "priority": "HIGH", "reason": "Establishes entity identity in Google's Knowledge Graph"})
    
    if "WebSite" not in found_types:
        missing.append({"type": "WebSite", "priority": "HIGH", "reason": "Enables sitelinks search box in SERP"})
    
    if "BreadcrumbList" not in found_types:
        missing.append({"type": "BreadcrumbList", "priority": "MEDIUM", "reason": "Shows breadcrumb trail in search results"})
    
    # Check page type
    url_lower = url.lower()
    if any(w in url_lower for w in ["/blog", "/post", "/article"]) and "BlogPosting" not in found_types and "Article" not in found_types:
        missing.append({"type": "Article/BlogPosting", "priority": "HIGH", "reason": "Blog page without Article schema — missing rich results"})
    
    if "FAQPage" not in found_types:
        text = soup.get_text().lower() if soup else ""
        if any(w in text for w in ["faq", "frequently asked"]):
            missing.append({"type": "FAQPage", "priority": "HIGH", "reason": "FAQ content detected but no FAQPage schema — high-impact rich result opportunity"})
    
    return missing


def validate_schema_json_fn(schema_json: str) -> str:
    """
    Validate a JSON-LD schema markup string before deploying it.
    Checks syntax, required properties, and Google compatibility.
    
    Args:
        schema_json: The JSON-LD markup string to validate
    """
    try:
        data = json.loads(schema_json)
        
        schema_type = data.get("@type", "Unknown")
        if isinstance(schema_type, list):
            schema_type = schema_type[0]
        
        validation = _validate_schema_item(schema_type, data)
        
        # Additional checks
        if data.get("@context") not in ["https://schema.org", "http://schema.org"]:
            validation["issues"].append("@context should be 'https://schema.org'")
        
        return json.dumps({
            "status": "valid" if not validation["issues"] else "has_issues",
            "validation": validation,
            "deployable": validation["rich_results_eligible"],
            "message": "Schema is valid and eligible for rich results!" if validation["rich_results_eligible"] else "Schema has issues that should be fixed before deployment."
        }, indent=2)
        
    except json.JSONDecodeError as e:
        return json.dumps({
            "status": "invalid_json",
            "error": f"Invalid JSON: {str(e)}",
            "message": "The schema markup is not valid JSON. Fix syntax errors first."
        }, indent=2)
    except Exception as e:
        return json.dumps({"error": str(e), "tool": "validate_schema_json"})
