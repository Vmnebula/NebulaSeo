import os
import json
from google.cloud import bigquery

# Table configurations — official GSC Bulk Data Export only (no demo/manual fallback)
GSC_EXPORT_SITE_TABLE = "searchconsole.searchdata_site_impression"
GSC_EXPORT_URL_TABLE = "searchconsole.searchdata_url_impression"

# Setup instructions returned when no real data exists
_NO_DATA_MSG = {
    "error": "No real data available yet",
    "gsc_bulk_export": "Not populated — tables are empty in your_dataset.searchconsole",
    "fix": {
        "step_1": "Go to Google Search Console → Settings → Bulk Data Export",
        "step_2": "Set export destination to BigQuery dataset: your_dataset.searchconsole",
        "step_3": "Wait 24-48 hours for first data export",
        "note": "For immediate data, grant the agent SA access to the GSC property (see gsc_live_* tools)"
    }
}


def get_bigquery_client():
    """Get BigQuery client with project ID."""
    project_id = os.getenv("GOOGLE_CLOUD_PROJECT", "nebulaseo")
    return bigquery.Client(project=project_id), project_id


def check_table_exists(client, project_id: str, table_path: str) -> bool:
    """Check if a BigQuery table exists and has data using an actual query (not stale metadata)."""
    try:
        full_table_id = f"{project_id}.{table_path}"
        query = f"SELECT 1 FROM `{full_table_id}` LIMIT 1"
        result = client.query(query).result()
        return result.total_rows > 0
    except Exception as e:
        print(f"[BigQuery] Table check failed for {table_path}: {e}")
        return False


def get_available_data_source(client, project_id: str) -> dict:
    """
    Determine which data sources are available.
    Returns info about available tables (GSC Bulk Export only).
    """
    sources = {
        "gsc_site_export": check_table_exists(client, project_id, GSC_EXPORT_SITE_TABLE),
        "gsc_url_export": check_table_exists(client, project_id, GSC_EXPORT_URL_TABLE),
    }
    return sources


def analyze_keyword_drops_fn(limit: int = 10) -> str:
    """
    Queries BigQuery SEO data to identify keywords with ranking drops or opportunities.
    Automatically uses official GSC export if available, falls back to manual table.
    """
    try:
        client, project_id = get_bigquery_client()
        sources = get_available_data_source(client, project_id)
        
        # Only use official GSC Bulk Export — no demo/manual fallback
        if sources["gsc_site_export"]:
            table_id = f"{project_id}.{GSC_EXPORT_SITE_TABLE}"
            date_col = "data_date"
            query_col = "query"
            position_col = "SAFE_DIVIDE(sum_top_position, impressions)"
            source_name = "Official GSC Bulk Export"
        else:
            return json.dumps(_NO_DATA_MSG)
        
        # First, check how many days of data are available to adapt the comparison window
        date_check_query = f"""
        SELECT 
            MIN({date_col}) as earliest_date,
            MAX({date_col}) as latest_date,
            COUNT(DISTINCT {date_col}) as days_available
        FROM `{table_id}`
        WHERE {date_col} >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
        """
        date_check = client.query(date_check_query).result()
        date_info = list(date_check)
        days_available = date_info[0].days_available if date_info else 0
        earliest_date = str(date_info[0].earliest_date) if date_info and date_info[0].earliest_date else "N/A"
        latest_date = str(date_info[0].latest_date) if date_info and date_info[0].latest_date else "N/A"
        
        if days_available < 2:
            # Not enough data for comparison — return current snapshot instead
            snapshot_query = f"""
            SELECT 
                {query_col} as keyword,
                ROUND(AVG({position_col}), 1) as current_position,
                SUM(clicks) as clicks,
                SUM(impressions) as impressions,
                ROUND(SAFE_DIVIDE(SUM(clicks), SUM(impressions)) * 100, 2) as ctr_percent
            FROM `{table_id}`
            WHERE {date_col} >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
            GROUP BY {query_col}
            HAVING SUM(impressions) > 0
            ORDER BY SUM(impressions) DESC
            LIMIT {limit}
            """
            
            query_job = client.query(snapshot_query)
            results = query_job.result()
            
            rows = []
            for row in results:
                rows.append({
                    "keyword": row.keyword,
                    "current_position": row.current_position,
                    "clicks": row.clicks,
                    "impressions": row.impressions,
                    "ctr_percent": row.ctr_percent,
                    "status": "SNAPSHOT"
                })
            
            return json.dumps({
                "mode": "snapshot",
                "message": f"Only {days_available} day(s) of data available (earliest: {earliest_date}, latest: {latest_date}). Showing current keyword snapshot instead of comparison.",
                "keywords_found": len(rows),
                "data": rows,
                "source": source_name,
                "table": table_id,
                "data_range": {"earliest": earliest_date, "latest": latest_date, "days": days_available}
            }, indent=2)
        
        # Adaptive window: split available data in half for comparison
        half_window = max(days_available // 2, 1)
        
        # Query to find keywords with position changes
        query = f"""
        WITH latest AS (
            SELECT 
                {query_col} as keyword,
                AVG({position_col}) as current_position,
                SUM(clicks) as current_clicks,
                SUM(impressions) as current_impressions
            FROM `{table_id}`
            WHERE {date_col} >= DATE_SUB(CURRENT_DATE(), INTERVAL {half_window} DAY)
            GROUP BY {query_col}
        ),
        previous AS (
            SELECT 
                {query_col} as keyword,
                AVG({position_col}) as previous_position,
                SUM(clicks) as previous_clicks,
                SUM(impressions) as previous_impressions
            FROM `{table_id}`
            WHERE {date_col} BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL {days_available} DAY) 
                          AND DATE_SUB(CURRENT_DATE(), INTERVAL {half_window + 1} DAY)
            GROUP BY {query_col}
        )
        SELECT 
            l.keyword,
            ROUND(l.current_position, 1) as current_position,
            ROUND(p.previous_position, 1) as previous_position,
            ROUND(l.current_position - p.previous_position, 1) as position_change,
            l.current_clicks,
            p.previous_clicks,
            l.current_impressions as impressions,
            ROUND(SAFE_DIVIDE(l.current_clicks, l.current_impressions) * 100, 2) as ctr_percent,
            CASE 
                WHEN l.current_position - p.previous_position > 2 THEN 'DROPPED'
                WHEN l.current_position - p.previous_position < -2 THEN 'IMPROVED'
                ELSE 'STABLE'
            END as status
        FROM latest l
        LEFT JOIN previous p ON l.keyword = p.keyword
        WHERE p.previous_position IS NOT NULL
        ORDER BY (l.current_position - p.previous_position) DESC
        LIMIT {limit}
        """
        
        query_job = client.query(query)
        results = query_job.result()
        
        rows = []
        for row in results:
            rows.append({
                "keyword": row.keyword,
                "current_position": row.current_position,
                "previous_position": row.previous_position,
                "position_change": row.position_change,
                "current_clicks": row.current_clicks,
                "previous_clicks": row.previous_clicks,
                "impressions": row.impressions,
                "ctr_percent": row.ctr_percent,
                "status": row.status
            })
        
        if not rows:
            return json.dumps({
                "message": "No keyword data found with position changes.",
                "suggestion": "Data may still be loading or no significant changes detected.",
                "source": source_name
            })
        
        return json.dumps({
            "keywords_analyzed": len(rows),
            "data": rows,
            "source": source_name,
            "table": table_id
        }, indent=2)
        
    except Exception as e:
        return json.dumps({"error": str(e)})


def get_keyword_performance_fn(keyword: str = None, days: int = 7) -> str:
    """
    Get detailed performance data for a specific keyword or all keywords.
    Combines data from both GSC export and manual tables if available.
    """
    try:
        client, project_id = get_bigquery_client()
        sources = get_available_data_source(client, project_id)
        
        results_combined = []
        sources_used = []
        
        # Only use official GSC Bulk Export — no demo/manual fallback
        if not sources["gsc_site_export"]:
            return json.dumps(_NO_DATA_MSG)
        
        table_id = f"{project_id}.{GSC_EXPORT_SITE_TABLE}"
        where_clause = f"WHERE data_date >= DATE_SUB(CURRENT_DATE(), INTERVAL {days} DAY)"
        if keyword:
            where_clause += f" AND LOWER(query) LIKE '%{keyword.lower()}%'"
        
        query = f"""
        SELECT 
            query,
            SUM(clicks) as total_clicks,
            SUM(impressions) as total_impressions,
            ROUND(AVG(SAFE_DIVIDE(sum_top_position, impressions)), 1) as avg_position,
            ROUND(SAFE_DIVIDE(SUM(clicks), SUM(impressions)) * 100, 2) as ctr_percent,
            COUNT(DISTINCT data_date) as days_with_data
        FROM `{table_id}`
        {where_clause}
        GROUP BY query
        ORDER BY total_impressions DESC
        LIMIT 20
        """
        
        query_job = client.query(query)
        for row in query_job.result():
            results_combined.append({
                "keyword": row.query,
                "clicks": row.total_clicks,
                "impressions": row.total_impressions,
                "avg_position": row.avg_position,
                "ctr_percent": row.ctr_percent,
                "days_tracked": row.days_with_data,
                "source": "GSC Bulk Export"
            })
        sources_used.append("GSC Bulk Export")
        
        if not results_combined:
            return json.dumps({
                "message": "No keyword performance data found.",
                "sources_checked": sources
            })
        
        return json.dumps({
            "period": f"Last {days} days",
            "keywords_found": len(results_combined),
            "data": results_combined,
            "sources_used": sources_used
        }, indent=2)
        
    except Exception as e:
        return json.dumps({"error": str(e)})


def get_top_keywords_fn(limit: int = 10) -> str:
    """
    Get the top performing keywords by clicks/impressions.
    Uses best available data source.
    """
    try:
        client, project_id = get_bigquery_client()
        sources = get_available_data_source(client, project_id)
        
        # Only use official GSC Bulk Export — no demo/manual fallback
        if not sources["gsc_site_export"]:
            return json.dumps(_NO_DATA_MSG)
        
        table_id = f"{project_id}.{GSC_EXPORT_SITE_TABLE}"
        date_col = "data_date"
        position_col = "SAFE_DIVIDE(sum_top_position, impressions)"
        source_name = "GSC Bulk Export"
        
        query = f"""
        SELECT 
            query,
            SUM(clicks) as total_clicks,
            SUM(impressions) as total_impressions,
            ROUND(AVG({position_col}), 1) as avg_position,
            ROUND(SAFE_DIVIDE(SUM(clicks), SUM(impressions)) * 100, 2) as ctr_percent
        FROM `{table_id}`
        WHERE {date_col} >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
        GROUP BY query
        ORDER BY total_clicks DESC
        LIMIT {limit}
        """
        
        query_job = client.query(query)
        results = query_job.result()
        
        rows = []
        for row in results:
            rows.append({
                "keyword": row.query,
                "clicks": row.total_clicks,
                "impressions": row.total_impressions,
                "avg_position": row.avg_position,
                "ctr_percent": row.ctr_percent
            })
        
        return json.dumps({
            "top_keywords": rows,
            "source": source_name,
            "table": table_id
        }, indent=2)
        
    except Exception as e:
        return json.dumps({"error": str(e)})


def get_data_source_status_fn() -> str:
    """
    Check the status of all available data sources.
    Useful for debugging and understanding what data is available.
    """
    try:
        client, project_id = get_bigquery_client()
        sources = get_available_data_source(client, project_id)
        
        status = {
            "project_id": project_id,
            "service_account": "your-sa@your-project.iam.gserviceaccount.com",
            "data_sources": {
                "gsc_bulk_export": {
                    "site_impressions": {
                        "table": f"{project_id}.{GSC_EXPORT_SITE_TABLE}",
                        "has_data": sources["gsc_site_export"],
                        "status": "ACTIVE" if sources["gsc_site_export"] else "EMPTY — waiting for data"
                    },
                    "url_impressions": {
                        "table": f"{project_id}.{GSC_EXPORT_URL_TABLE}",
                        "has_data": sources["gsc_url_export"],
                        "status": "ACTIVE" if sources["gsc_url_export"] else "EMPTY — waiting for data"
                    }
                },
                "gsc_live_api": {
                    "property": "sc-domain:example.com",
                    "description": "Direct Search Console API (real-time, no BigQuery needed)",
                    "setup": "Add SA your-sa@your-project.iam.gserviceaccount.com as Owner in GSC → Settings → Users"
                },
                "ga4": {
                    "property": "properties/YOUR_GA4_PROPERTY_ID",
                    "description": "Google Analytics 4 Data API",
                    "setup": "Add SA your-sa@your-project.iam.gserviceaccount.com as Viewer in GA4 → Admin → Property Access"
                }
            },
            "recommendation": ""
        }
        
        if sources["gsc_site_export"]:
            status["recommendation"] = "GSC Bulk Export is active and has data. Using official Google data."
        else:
            status["recommendation"] = "No BigQuery data yet. For immediate data, add SA to GSC property for live API access."
        
        return json.dumps(status, indent=2)
        
    except Exception as e:
        return json.dumps({"error": str(e)})
