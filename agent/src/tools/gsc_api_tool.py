"""
Direct Google Search Console API Tool
Provides live keyword/page data without waiting for BigQuery bulk export.
Uses the Search Console API via google-api-python-client.
Supports up to 16 months of historical data.

SETUP REQUIRED:
  Add SA your-sa@your-project.iam.gserviceaccount.com as Owner in:
  Google Search Console → Settings → Users and permissions → Add user
"""
import os
import json
from datetime import datetime, timedelta
from googleapiclient.discovery import build
from google.auth import default

# Site property — domain property format
SITE_URL = os.getenv("GSC_SITE_URL", "sc-domain:example.com")
SA_EMAIL = "your-sa@your-project.iam.gserviceaccount.com"

_GSC_ACCESS_ERROR = {
    "error": "GSC API access denied (403)",
    "service_account": SA_EMAIL,
    "property": SITE_URL,
    "fix": {
        "step_1": f"Go to https://search.google.com/search-console/users?resource_id={SITE_URL}",
        "step_2": f"Click 'Add user' → enter: {SA_EMAIL}",
        "step_3": "Set permission to 'Owner' or 'Full'",
        "step_4": "Wait ~1 minute, then retry"
    }
}


def _handle_gsc_error(e: Exception, tool_name: str) -> str:
    """Return clear setup instructions on 403, generic error otherwise."""
    err_str = str(e)
    if "403" in err_str or "permission" in err_str.lower() or "Forbidden" in err_str:
        return json.dumps({**_GSC_ACCESS_ERROR, "tool": tool_name})
    return json.dumps({"error": err_str, "tool": tool_name})


def _get_gsc_service():
    """Get authenticated Search Console service client."""
    credentials, project = default(
        scopes=["https://www.googleapis.com/auth/webmasters.readonly"]
    )
    return build("searchconsole", "v1", credentials=credentials, cache_discovery=False)


def gsc_live_keywords_fn(days: int = 7, limit: int = 20) -> str:
    """
    Get live keyword performance data directly from GSC API.
    Returns: clicks, impressions, CTR, position for top keywords.
    Available immediately — no BigQuery export needed.
    """
    try:
        service = _get_gsc_service()
        end_date = datetime.utcnow().date() - timedelta(days=3)  # GSC data has ~3-day lag
        start_date = end_date - timedelta(days=days)

        response = service.searchanalytics().query(
            siteUrl=SITE_URL,
            body={
                "startDate": str(start_date),
                "endDate": str(end_date),
                "dimensions": ["query"],
                "rowLimit": limit,
                "type": "web"
            }
        ).execute()

        rows = response.get("rows", [])
        keywords = []
        for row in rows:
            keywords.append({
                "keyword": row["keys"][0],
                "clicks": row["clicks"],
                "impressions": row["impressions"],
                "ctr": round(row["ctr"] * 100, 2),
                "position": round(row["position"], 1)
            })

        return json.dumps({
            "source": "GSC API (live)",
            "site": SITE_URL,
            "period": f"{start_date} to {end_date}",
            "keywords_found": len(keywords),
            "data": keywords
        }, indent=2)

    except Exception as e:
        return _handle_gsc_error(e, "gsc_live_keywords")


def gsc_live_pages_fn(days: int = 7, limit: int = 20) -> str:
    """
    Get live page-level performance data directly from GSC API.
    Returns: clicks, impressions, CTR, position per URL.
    """
    try:
        service = _get_gsc_service()
        end_date = datetime.utcnow().date() - timedelta(days=3)
        start_date = end_date - timedelta(days=days)

        response = service.searchanalytics().query(
            siteUrl=SITE_URL,
            body={
                "startDate": str(start_date),
                "endDate": str(end_date),
                "dimensions": ["page"],
                "rowLimit": limit,
                "type": "web"
            }
        ).execute()

        rows = response.get("rows", [])
        pages = []
        for row in rows:
            pages.append({
                "page": row["keys"][0],
                "clicks": row["clicks"],
                "impressions": row["impressions"],
                "ctr": round(row["ctr"] * 100, 2),
                "position": round(row["position"], 1)
            })

        return json.dumps({
            "source": "GSC API (live)",
            "site": SITE_URL,
            "period": f"{start_date} to {end_date}",
            "pages_found": len(pages),
            "data": pages
        }, indent=2)

    except Exception as e:
        return _handle_gsc_error(e, "gsc_live_pages")


def gsc_live_keyword_pages_fn(keyword: str, days: int = 28) -> str:
    """
    Get which pages rank for a specific keyword via GSC API.
    Dimensions: [query, page] filtered by keyword.
    """
    try:
        service = _get_gsc_service()
        end_date = datetime.utcnow().date() - timedelta(days=3)
        start_date = end_date - timedelta(days=days)

        response = service.searchanalytics().query(
            siteUrl=SITE_URL,
            body={
                "startDate": str(start_date),
                "endDate": str(end_date),
                "dimensions": ["query", "page"],
                "dimensionFilterGroups": [{
                    "filters": [{
                        "dimension": "query",
                        "operator": "contains",
                        "expression": keyword
                    }]
                }],
                "rowLimit": 25,
                "type": "web"
            }
        ).execute()

        rows = response.get("rows", [])
        results = []
        for row in rows:
            results.append({
                "keyword": row["keys"][0],
                "page": row["keys"][1],
                "clicks": row["clicks"],
                "impressions": row["impressions"],
                "ctr": round(row["ctr"] * 100, 2),
                "position": round(row["position"], 1)
            })

        return json.dumps({
            "source": "GSC API (live)",
            "site": SITE_URL,
            "filter": f"keyword contains '{keyword}'",
            "period": f"{start_date} to {end_date}",
            "results_found": len(results),
            "data": results
        }, indent=2)

    except Exception as e:
        return _handle_gsc_error(e, "gsc_live_keyword_pages")


def gsc_live_daily_trend_fn(keyword: str = None, days: int = 28) -> str:
    """
    Get daily performance trend from GSC API. 
    Optionally filter by a specific keyword.
    """
    try:
        service = _get_gsc_service()
        end_date = datetime.utcnow().date() - timedelta(days=3)
        start_date = end_date - timedelta(days=days)

        body = {
            "startDate": str(start_date),
            "endDate": str(end_date),
            "dimensions": ["date"],
            "rowLimit": 500,
            "type": "web"
        }
        if keyword:
            body["dimensionFilterGroups"] = [{
                "filters": [{
                    "dimension": "query",
                    "operator": "contains",
                    "expression": keyword
                }]
            }]

        response = service.searchanalytics().query(
            siteUrl=SITE_URL,
            body=body
        ).execute()

        rows = response.get("rows", [])
        daily_data = []
        for row in rows:
            daily_data.append({
                "date": row["keys"][0],
                "clicks": row["clicks"],
                "impressions": row["impressions"],
                "ctr": round(row["ctr"] * 100, 2),
                "position": round(row["position"], 1)
            })

        # Sort by date
        daily_data.sort(key=lambda x: x["date"])

        return json.dumps({
            "source": "GSC API (live)",
            "site": SITE_URL,
            "keyword_filter": keyword or "all",
            "period": f"{start_date} to {end_date}",
            "days_with_data": len(daily_data),
            "data": daily_data
        }, indent=2)

    except Exception as e:
        return _handle_gsc_error(e, "gsc_live_daily_trend")


def gsc_live_device_breakdown_fn(days: int = 7) -> str:
    """
    Get clicks/impressions broken down by device (DESKTOP, MOBILE, TABLET) via GSC API.
    """
    try:
        service = _get_gsc_service()
        end_date = datetime.utcnow().date() - timedelta(days=3)
        start_date = end_date - timedelta(days=days)

        response = service.searchanalytics().query(
            siteUrl=SITE_URL,
            body={
                "startDate": str(start_date),
                "endDate": str(end_date),
                "dimensions": ["device"],
                "type": "web"
            }
        ).execute()

        rows = response.get("rows", [])
        devices = []
        for row in rows:
            devices.append({
                "device": row["keys"][0],
                "clicks": row["clicks"],
                "impressions": row["impressions"],
                "ctr": round(row["ctr"] * 100, 2),
                "position": round(row["position"], 1)
            })

        return json.dumps({
            "source": "GSC API (live)",
            "site": SITE_URL,
            "period": f"{start_date} to {end_date}",
            "device_breakdown": devices
        }, indent=2)

    except Exception as e:
        return _handle_gsc_error(e, "gsc_live_device_breakdown")


def gsc_live_country_breakdown_fn(days: int = 7, limit: int = 15) -> str:
    """
    Get clicks/impressions broken down by country via GSC API.
    """
    try:
        service = _get_gsc_service()
        end_date = datetime.utcnow().date() - timedelta(days=3)
        start_date = end_date - timedelta(days=days)

        response = service.searchanalytics().query(
            siteUrl=SITE_URL,
            body={
                "startDate": str(start_date),
                "endDate": str(end_date),
                "dimensions": ["country"],
                "rowLimit": limit,
                "type": "web"
            }
        ).execute()

        rows = response.get("rows", [])
        countries = []
        for row in rows:
            countries.append({
                "country": row["keys"][0],
                "clicks": row["clicks"],
                "impressions": row["impressions"],
                "ctr": round(row["ctr"] * 100, 2),
                "position": round(row["position"], 1)
            })

        return json.dumps({
            "source": "GSC API (live)",
            "site": SITE_URL,
            "period": f"{start_date} to {end_date}",
            "countries": countries
        }, indent=2)

    except Exception as e:
        return _handle_gsc_error(e, "gsc_live_country_breakdown")
