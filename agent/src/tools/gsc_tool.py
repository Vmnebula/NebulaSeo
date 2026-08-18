import json
import os

from google.cloud import bigquery

# Table configurations — official GSC Bulk Data Export only
GSC_EXPORT_SITE_TABLE = "searchconsole.searchdata_site_impression"
GSC_EXPORT_URL_TABLE = "searchconsole.searchdata_url_impression"

_NO_DATA_MSG = {
    "error": "No real data available yet",
    "gsc_bulk_export": "Tables empty in your_dataset.searchconsole",
    "fix": "Enable GSC Bulk Export to BigQuery, or use gsc_live_* tools (requires SA access to GSC property)"
}


def get_bigquery_client():
    """Get BigQuery client with project ID."""
    project_id = os.getenv("GOOGLE_CLOUD_PROJECT", "nebulaseo")
    return bigquery.Client(project=project_id), project_id


def check_table_has_data(client, project_id: str, table_path: str) -> bool:
    """Check if a BigQuery table exists and has data using an actual query (not stale metadata)."""
    try:
        full_table_id = f"{project_id}.{table_path}"
        query = f"SELECT 1 FROM `{full_table_id}` LIMIT 1"
        result = client.query(query).result()
        return result.total_rows > 0
    except Exception as e:
        print(f"[GSC] Table check failed for {table_path}: {e}")
        return False


def get_gsc_performance_fn(site_url: str = "sc-domain:example.com") -> str:
    """
    Queries BigQuery for Search Console performance data.
    Uses official GSC Bulk Data Export only.
    """
    try:
        client, project_id = get_bigquery_client()
        
        # Check which data sources are available
        has_gsc_export = check_table_has_data(client, project_id, GSC_EXPORT_SITE_TABLE)
        
        # Only use official GSC Bulk Export — no demo/manual fallback
        if not has_gsc_export:
            return json.dumps(_NO_DATA_MSG)
        
        table_id = f"{project_id}.{GSC_EXPORT_SITE_TABLE}"
        date_col = "data_date"
        position_col = "SAFE_DIVIDE(sum_top_position, impressions)"
        source_name = "Official GSC Bulk Export"
        # GSC export stores domain property as sc-domain:example.com
        site_filter = f"AND site_url = '{site_url}'" if site_url else ""
        
        # Get daily performance metrics
        daily_query = f"""
        SELECT 
            {date_col} as date,
            SUM(clicks) as clicks,
            SUM(impressions) as impressions,
            ROUND(SAFE_DIVIDE(SUM(clicks), SUM(impressions)) * 100, 2) as ctr_percent,
            ROUND(AVG({position_col}), 1) as avg_position
        FROM `{table_id}`
        WHERE {date_col} >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
        {site_filter}
        GROUP BY {date_col}
        ORDER BY {date_col} DESC
        LIMIT 7
        """
        
        daily_job = client.query(daily_query)
        daily_results = daily_job.result()
        
        daily_data = []
        total_clicks = 0
        total_impressions = 0
        
        for row in daily_results:
            daily_data.append({
                "date": str(row.date),
                "clicks": row.clicks,
                "impressions": row.impressions,
                "ctr_percent": row.ctr_percent,
                "avg_position": row.avg_position
            })
            total_clicks += row.clicks
            total_impressions += row.impressions
        
        # Get top queries
        top_queries_query = f"""
        SELECT 
            query,
            SUM(clicks) as clicks,
            SUM(impressions) as impressions,
            ROUND(AVG({position_col}), 1) as avg_position,
            ROUND(SAFE_DIVIDE(SUM(clicks), SUM(impressions)) * 100, 2) as ctr_percent
        FROM `{table_id}`
        WHERE {date_col} >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
        {site_filter}
        GROUP BY query
        ORDER BY clicks DESC
        LIMIT 10
        """
        
        top_queries_job = client.query(top_queries_query)
        top_queries_results = top_queries_job.result()
        
        top_queries = []
        for row in top_queries_results:
            top_queries.append({
                "query": row.query,
                "clicks": row.clicks,
                "impressions": row.impressions,
                "position": row.avg_position,
                "ctr_percent": row.ctr_percent
            })
        
        return json.dumps({
            "site": site_url,
            "period": "Last 7 days",
            "summary": {
                "total_clicks": total_clicks,
                "total_impressions": total_impressions,
                "avg_ctr": round(total_clicks / total_impressions * 100, 2) if total_impressions > 0 else 0
            },
            "daily_data": daily_data,
            "top_queries": top_queries,
            "source": source_name,
            "table": table_id
        }, indent=2)
        
    except Exception as e:
        return json.dumps({"error": str(e)})


def get_page_performance_fn(page_url: str) -> str:
    """
    Get performance data for a specific page/URL.
    Uses GSC URL-level export from BigQuery.
    """
    try:
        client, project_id = get_bigquery_client()
        
        # Check data sources
        has_url_export = check_table_has_data(client, project_id, GSC_EXPORT_URL_TABLE)
        
        if not has_url_export:
            return json.dumps({**_NO_DATA_MSG, "page": page_url})
        
        table_id = f"{project_id}.{GSC_EXPORT_URL_TABLE}"
        date_col = "data_date"
        position_col = "SAFE_DIVIDE(sum_top_position, impressions)"
        url_col = "url"
        source_name = "GSC URL Export"
        
        query = f"""
        SELECT 
            query,
            SUM(clicks) as clicks,
            SUM(impressions) as impressions,
            ROUND(AVG({position_col}), 1) as avg_position,
            ROUND(SAFE_DIVIDE(SUM(clicks), SUM(impressions)) * 100, 2) as ctr_percent
        FROM `{table_id}`
        WHERE {url_col} = '{page_url}'
          AND {date_col} >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
        GROUP BY query
        ORDER BY impressions DESC
        LIMIT 20
        """
        
        query_job = client.query(query)
        results = query_job.result()
        
        keywords = []
        for row in results:
            keywords.append({
                "keyword": row.query,
                "clicks": row.clicks,
                "impressions": row.impressions,
                "position": row.avg_position,
                "ctr_percent": row.ctr_percent
            })
        
        return json.dumps({
            "page": page_url,
            "keywords_ranking": len(keywords),
            "data": keywords,
            "source": source_name
        }, indent=2)
        
    except Exception as e:
        return json.dumps({"error": str(e)})


def get_country_performance_fn(country_code: str = "ARE") -> str:
    """
    Get performance data filtered by country.
    UAE = ARE, US = USA, etc.
    """
    try:
        client, project_id = get_bigquery_client()
        
        has_gsc_export = check_table_has_data(client, project_id, GSC_EXPORT_SITE_TABLE)
        
        if not has_gsc_export:
            return json.dumps(_NO_DATA_MSG)
        
        table_id = f"{project_id}.{GSC_EXPORT_SITE_TABLE}"
        date_col = "data_date"
        position_col = "SAFE_DIVIDE(sum_top_position, impressions)"
        country_col = "country"
        source_name = "GSC Bulk Export"
        
        query = f"""
        SELECT 
            query,
            SUM(clicks) as clicks,
            SUM(impressions) as impressions,
            ROUND(AVG({position_col}), 1) as avg_position,
            ROUND(SAFE_DIVIDE(SUM(clicks), SUM(impressions)) * 100, 2) as ctr_percent
        FROM `{table_id}`
        WHERE {country_col} = '{country_code}'
          AND {date_col} >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
        GROUP BY query
        ORDER BY clicks DESC
        LIMIT 15
        """
        
        query_job = client.query(query)
        results = query_job.result()
        
        keywords = []
        total_clicks = 0
        total_impressions = 0
        
        for row in results:
            keywords.append({
                "keyword": row.query,
                "clicks": row.clicks,
                "impressions": row.impressions,
                "position": row.avg_position,
                "ctr_percent": row.ctr_percent
            })
            total_clicks += row.clicks
            total_impressions += row.impressions
        
        return json.dumps({
            "country": country_code,
            "period": "Last 7 days",
            "summary": {
                "total_clicks": total_clicks,
                "total_impressions": total_impressions
            },
            "top_keywords": keywords,
            "source": source_name
        }, indent=2)
        
    except Exception as e:
        return json.dumps({"error": str(e)})


def get_device_breakdown_fn() -> str:
    """
    Get performance breakdown by device type (DESKTOP, MOBILE, TABLET).
    """
    try:
        client, project_id = get_bigquery_client()
        
        has_gsc_export = check_table_has_data(client, project_id, GSC_EXPORT_SITE_TABLE)
        
        if not has_gsc_export:
            return json.dumps(_NO_DATA_MSG)
        
        table_id = f"{project_id}.{GSC_EXPORT_SITE_TABLE}"
        date_col = "data_date"
        device_col = "device"
        source_name = "GSC Bulk Export"
        
        query = f"""
        SELECT 
            {device_col} as device,
            SUM(clicks) as clicks,
            SUM(impressions) as impressions,
            ROUND(SAFE_DIVIDE(SUM(clicks), SUM(impressions)) * 100, 2) as ctr_percent
        FROM `{table_id}`
        WHERE {date_col} >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
        GROUP BY {device_col}
        ORDER BY clicks DESC
        """
        
        query_job = client.query(query)
        results = query_job.result()
        
        devices = []
        for row in results:
            devices.append({
                "device": row.device,
                "clicks": row.clicks,
                "impressions": row.impressions,
                "ctr_percent": row.ctr_percent
            })
        
        return json.dumps({
            "period": "Last 7 days",
            "device_breakdown": devices,
            "source": source_name
        }, indent=2)
        
    except Exception as e:
        return json.dumps({"error": str(e)})
