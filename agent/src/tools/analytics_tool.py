"""
Google Analytics 4 Data API Integration
Provides traffic, engagement, and conversion metrics

SETUP REQUIRED:
  Add SA your-sa@your-project.iam.gserviceaccount.com as Viewer in:
  GA4 → Admin → Property → Property Access Management → Add user (Viewer role)
"""

import os
from datetime import datetime

from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import (
    DateRange,
    Dimension,
    Filter,
    FilterExpression,
    Metric,
    OrderBy,
    RunReportRequest,
)

# GA4 Property ID for NebulaSEO
GA4_PROPERTY_ID = os.getenv("GA4_PROPERTY_ID", "properties/YOUR_GA4_PROPERTY_ID")
SA_EMAIL = "your-sa@your-project.iam.gserviceaccount.com"

_GA4_ACCESS_ERROR = {
    "error": "GA4 API access denied (403)",
    "service_account": SA_EMAIL,
    "property": GA4_PROPERTY_ID,
    "fix": {
        "step_1": "Go to GA4 → Admin → Property → Property Access Management",
        "step_2": f"Click '+' → Add users → enter: {SA_EMAIL}",
        "step_3": "Set role to 'Viewer'",
        "step_4": "Save → wait ~1 minute, then retry"
    }
}


def _handle_ga4_error(e: Exception, tool_name: str) -> dict:
    """Return clear setup instructions on 403, generic error otherwise."""
    err_str = str(e)
    if "403" in err_str or "permission" in err_str.lower() or "Forbidden" in err_str:
        return {**_GA4_ACCESS_ERROR, "tool": tool_name}
    return {"error": err_str, "tool": tool_name}


def get_client():
    """Get Analytics Data API client"""
    return BetaAnalyticsDataClient()


def get_traffic_overview_fn(days: int = 30) -> dict:
    """
    Get traffic overview: sessions, users, pageviews, bounce rate, etc.
    
    Args:
        days: Number of days to look back (default 30)
    
    Returns:
        Traffic metrics summary
    """
    try:
        client = get_client()
        
        request = RunReportRequest(
            property=GA4_PROPERTY_ID,
            date_ranges=[DateRange(start_date=f"{days}daysAgo", end_date="today")],
            metrics=[
                Metric(name="sessions"),
                Metric(name="totalUsers"),
                Metric(name="newUsers"),
                Metric(name="screenPageViews"),
                Metric(name="bounceRate"),
                Metric(name="averageSessionDuration"),
                Metric(name="engagementRate"),
            ],
        )
        
        response = client.run_report(request)
        
        if response.rows:
            row = response.rows[0]
            return {
                "period": f"Last {days} days",
                "sessions": int(row.metric_values[0].value),
                "total_users": int(row.metric_values[1].value),
                "new_users": int(row.metric_values[2].value),
                "pageviews": int(row.metric_values[3].value),
                "bounce_rate": round(float(row.metric_values[4].value) * 100, 2),
                "avg_session_duration_seconds": round(float(row.metric_values[5].value), 2),
                "engagement_rate": round(float(row.metric_values[6].value) * 100, 2),
            }
        
        return {"error": "No data available for the specified period"}
    
    except Exception as e:
        return _handle_ga4_error(e, "get_traffic_overview")


def get_top_pages_fn(limit: int = 20) -> dict:
    """
    Get top performing pages by pageviews with engagement metrics.
    
    Args:
        limit: Number of pages to return (default 20)
    
    Returns:
        List of top pages with metrics
    """
    try:
        client = get_client()
        
        request = RunReportRequest(
            property=GA4_PROPERTY_ID,
            date_ranges=[DateRange(start_date="30daysAgo", end_date="today")],
            dimensions=[Dimension(name="pagePath")],
            metrics=[
                Metric(name="screenPageViews"),
                Metric(name="averageSessionDuration"),
                Metric(name="bounceRate"),
                Metric(name="engagementRate"),
            ],
            order_bys=[
                OrderBy(metric=OrderBy.MetricOrderBy(metric_name="screenPageViews"), desc=True)
            ],
            limit=limit,
        )
        
        response = client.run_report(request)
        
        pages = []
        for row in response.rows:
            pages.append({
                "page": row.dimension_values[0].value,
                "pageviews": int(row.metric_values[0].value),
                "avg_time_on_page": round(float(row.metric_values[1].value), 2),
                "bounce_rate": round(float(row.metric_values[2].value) * 100, 2),
                "engagement_rate": round(float(row.metric_values[3].value) * 100, 2),
            })
        
        return {
            "period": "Last 30 days",
            "total_pages": len(pages),
            "pages": pages
        }
    
    except Exception as e:
        return _handle_ga4_error(e, "get_top_pages_analytics")


def get_traffic_sources_fn() -> dict:
    """
    Get traffic acquisition channels and sources.
    
    Returns:
        Breakdown of traffic by channel and source
    """
    try:
        client = get_client()
        
        request = RunReportRequest(
            property=GA4_PROPERTY_ID,
            date_ranges=[DateRange(start_date="30daysAgo", end_date="today")],
            dimensions=[
                Dimension(name="sessionDefaultChannelGroup"),
            ],
            metrics=[
                Metric(name="sessions"),
                Metric(name="totalUsers"),
                Metric(name="engagementRate"),
                Metric(name="averageSessionDuration"),
            ],
            order_bys=[
                OrderBy(metric=OrderBy.MetricOrderBy(metric_name="sessions"), desc=True)
            ],
        )
        
        response = client.run_report(request)
        
        channels = []
        total_sessions = 0
        
        for row in response.rows:
            sessions = int(row.metric_values[0].value)
            total_sessions += sessions
            channels.append({
                "channel": row.dimension_values[0].value,
                "sessions": sessions,
                "users": int(row.metric_values[1].value),
                "engagement_rate": round(float(row.metric_values[2].value) * 100, 2),
                "avg_session_duration": round(float(row.metric_values[3].value), 2),
            })
        
        # Add percentage
        for channel in channels:
            channel["percentage"] = round((channel["sessions"] / total_sessions) * 100, 2) if total_sessions > 0 else 0
        
        return {
            "period": "Last 30 days",
            "total_sessions": total_sessions,
            "channels": channels
        }
    
    except Exception as e:
        return _handle_ga4_error(e, "get_traffic_sources")


def get_organic_landing_pages_fn(limit: int = 20) -> dict:
    """
    Get landing page performance for organic search traffic only.
    Critical for SEO analysis - combines with GSC data.
    
    Args:
        limit: Number of pages to return
    
    Returns:
        Organic landing pages with engagement metrics
    """
    try:
        client = get_client()
        
        request = RunReportRequest(
            property=GA4_PROPERTY_ID,
            date_ranges=[DateRange(start_date="30daysAgo", end_date="today")],
            dimensions=[Dimension(name="landingPage")],
            metrics=[
                Metric(name="sessions"),
                Metric(name="bounceRate"),
                Metric(name="averageSessionDuration"),
                Metric(name="engagementRate"),
                Metric(name="conversions"),
            ],
            dimension_filter=FilterExpression(
                filter=Filter(
                    field_name="sessionDefaultChannelGroup",
                    string_filter=Filter.StringFilter(
                        match_type=Filter.StringFilter.MatchType.EXACT,
                        value="Organic Search"
                    )
                )
            ),
            order_bys=[
                OrderBy(metric=OrderBy.MetricOrderBy(metric_name="sessions"), desc=True)
            ],
            limit=limit,
        )
        
        response = client.run_report(request)
        
        pages = []
        for row in response.rows:
            pages.append({
                "landing_page": row.dimension_values[0].value,
                "organic_sessions": int(row.metric_values[0].value),
                "bounce_rate": round(float(row.metric_values[1].value) * 100, 2),
                "avg_session_duration": round(float(row.metric_values[2].value), 2),
                "engagement_rate": round(float(row.metric_values[3].value) * 100, 2),
                "conversions": int(float(row.metric_values[4].value)),
            })
        
        return {
            "period": "Last 30 days",
            "traffic_type": "Organic Search Only",
            "total_pages": len(pages),
            "pages": pages
        }
    
    except Exception as e:
        return _handle_ga4_error(e, "get_organic_landing_pages")


def get_realtime_users_fn() -> dict:
    """
    Get real-time active users on the site.
    
    Returns:
        Current active users and their pages
    """
    try:
        client = get_client()
        
        # Real-time report
        from google.analytics.data_v1beta.types import RunRealtimeReportRequest
        
        request = RunRealtimeReportRequest(
            property=GA4_PROPERTY_ID,
            dimensions=[Dimension(name="unifiedScreenName")],
            metrics=[Metric(name="activeUsers")],
        )
        
        response = client.run_realtime_report(request)
        
        active_pages = []
        total_users = 0
        
        for row in response.rows:
            users = int(row.metric_values[0].value)
            total_users += users
            active_pages.append({
                "page": row.dimension_values[0].value,
                "active_users": users
            })
        
        return {
            "timestamp": datetime.now().isoformat(),
            "total_active_users": total_users,
            "active_pages": active_pages[:10]  # Top 10
        }
    
    except Exception as e:
        return _handle_ga4_error(e, "get_realtime_users")


def correlate_seo_with_engagement_fn(gsc_pages: list) -> dict:
    """
    Correlate GSC data (clicks, impressions) with GA4 engagement data.
    Finds pages with ranking/engagement mismatches.
    
    Args:
        gsc_pages: List of pages with GSC data (url, clicks, impressions, position)
    
    Returns:
        Insights about pages that need attention
    """
    try:
        # Get GA4 landing page data
        ga4_data = get_organic_landing_pages_fn(limit=50)
        
        if "error" in ga4_data:
            return ga4_data
        
        # Create lookup by URL
        ga4_lookup = {page["landing_page"]: page for page in ga4_data.get("pages", [])}
        
        insights = []
        
        for gsc_page in gsc_pages:
            url = gsc_page.get("url", "")
            # Normalize URL to match GA4 format
            path = url.replace("https://example.com", "").replace("http://example.com", "")
            if not path:
                path = "/"
            
            ga4_metrics = ga4_lookup.get(path)
            
            if ga4_metrics:
                # High traffic but high bounce = content mismatch
                if gsc_page.get("clicks", 0) > 50 and ga4_metrics.get("bounce_rate", 0) > 70:
                    insights.append({
                        "page": url,
                        "issue": "HIGH_TRAFFIC_HIGH_BOUNCE",
                        "gsc_clicks": gsc_page.get("clicks"),
                        "bounce_rate": ga4_metrics.get("bounce_rate"),
                        "recommendation": "Content may not match search intent. Review and optimize.",
                        "priority": "HIGH"
                    })
                
                # Good engagement but low rankings = SEO opportunity
                if ga4_metrics.get("engagement_rate", 0) > 60 and gsc_page.get("position", 0) > 10:
                    insights.append({
                        "page": url,
                        "issue": "GOOD_ENGAGEMENT_LOW_RANKING",
                        "engagement_rate": ga4_metrics.get("engagement_rate"),
                        "gsc_position": gsc_page.get("position"),
                        "recommendation": "Great content! Improve SEO to boost rankings.",
                        "priority": "MEDIUM"
                    })
                
                # Low engagement across both = needs overhaul
                if ga4_metrics.get("engagement_rate", 100) < 30 and gsc_page.get("ctr", 100) < 2:
                    insights.append({
                        "page": url,
                        "issue": "LOW_ENGAGEMENT_LOW_CTR",
                        "engagement_rate": ga4_metrics.get("engagement_rate"),
                        "ctr": gsc_page.get("ctr"),
                        "recommendation": "Page needs complete overhaul - both SERP presence and content.",
                        "priority": "HIGH"
                    })
        
        return {
            "analysis_type": "GSC + GA4 Correlation",
            "pages_analyzed": len(gsc_pages),
            "insights_found": len(insights),
            "insights": insights
        }
    
    except Exception as e:
        return _handle_ga4_error(e, "correlate_seo_engagement")


# Tool declarations for the agent
ANALYTICS_TOOLS = [
    {
        "name": "get_traffic_overview",
        "description": "Get website traffic overview from Google Analytics including sessions, users, pageviews, bounce rate, and engagement metrics",
        "parameters": {
            "type": "object",
            "properties": {
                "days": {
                    "type": "integer",
                    "description": "Number of days to analyze (default 30)"
                }
            }
        }
    },
    {
        "name": "get_top_pages_analytics",
        "description": "Get top performing pages by pageviews with engagement metrics from Google Analytics",
        "parameters": {
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "description": "Number of pages to return (default 20)"
                }
            }
        }
    },
    {
        "name": "get_traffic_sources",
        "description": "Get traffic acquisition breakdown by channel (Organic, Direct, Social, etc.) from Google Analytics",
        "parameters": {
            "type": "object",
            "properties": {}
        }
    },
    {
        "name": "get_organic_landing_pages",
        "description": "Get landing page performance for organic search traffic only - critical for SEO analysis",
        "parameters": {
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "description": "Number of pages to return (default 20)"
                }
            }
        }
    },
    {
        "name": "get_realtime_users",
        "description": "Get real-time active users currently on the website",
        "parameters": {
            "type": "object",
            "properties": {}
        }
    },
    {
        "name": "correlate_seo_engagement",
        "description": "Correlate GSC data with GA4 engagement to find pages with ranking/engagement mismatches",
        "parameters": {
            "type": "object",
            "properties": {
                "gsc_pages": {
                    "type": "array",
                    "description": "List of pages with GSC data (url, clicks, impressions, position)",
                    "items": {
                        "type": "object"
                    }
                }
            },
            "required": ["gsc_pages"]
        }
    }
]
