"""
Google Indexing API + Sitemap Ping Tool
Request Google to re-crawl URLs immediately after the agent pushes fixes.
Also supports sitemap ping to notify Google of sitemap updates.
"""
import os
import json
import requests
from google.auth import default
from google.auth.transport.requests import Request as AuthRequest


def _get_credentials():
    """Get OAuth2 credentials with indexing scope."""
    credentials, project = default(
        scopes=["https://www.googleapis.com/auth/indexing"]
    )
    credentials.refresh(AuthRequest())
    return credentials


def request_indexing_fn(url: str, action: str = "URL_UPDATED") -> str:
    """
    Request Google to re-index a URL via the Indexing API.
    
    Args:
        url: The URL to submit for indexing
        action: URL_UPDATED (re-crawl) or URL_DELETED (remove)
    
    Note: Indexing API officially supports JobPosting & BroadcastEvent schema,
    but URL_UPDATED notifications are accepted for all URLs and can speed up crawling.
    """
    try:
        credentials = _get_credentials()
        
        endpoint = "https://indexing.googleapis.com/v3/urlNotifications:publish"
        headers = {
            "Authorization": f"Bearer {credentials.token}",
            "Content-Type": "application/json"
        }
        body = {
            "url": url,
            "type": action
        }
        
        response = requests.post(endpoint, headers=headers, json=body, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            return json.dumps({
                "status": "success",
                "url": url,
                "action": action,
                "notification_time": data.get("urlNotificationMetadata", {}).get("latestUpdate", {}).get("notifyTime"),
                "message": f"Google notified to re-crawl {url}"
            }, indent=2)
        else:
            return json.dumps({
                "status": "error",
                "url": url,
                "http_code": response.status_code,
                "error": response.text,
                "note": "Indexing API officially supports pages with JobPosting/BroadcastEvent schema. For other pages, use sitemap_ping instead."
            }, indent=2)
            
    except Exception as e:
        return json.dumps({"error": str(e), "tool": "request_indexing"})


def batch_indexing_fn(urls: list) -> str:
    """
    Submit multiple URLs for re-indexing in batch.
    Max 200 requests/day for Indexing API.
    
    Args:
        urls: List of URLs to submit
    """
    try:
        credentials = _get_credentials()
        endpoint = "https://indexing.googleapis.com/v3/urlNotifications:publish"
        headers = {
            "Authorization": f"Bearer {credentials.token}",
            "Content-Type": "application/json"
        }
        
        results = []
        for url in urls[:20]:  # Limit per call to avoid quota issues
            body = {"url": url, "type": "URL_UPDATED"}
            response = requests.post(endpoint, headers=headers, json=body, timeout=15)
            results.append({
                "url": url,
                "status": "success" if response.status_code == 200 else "error",
                "http_code": response.status_code
            })
        
        successes = sum(1 for r in results if r["status"] == "success")
        
        return json.dumps({
            "submitted": len(results),
            "successful": successes,
            "failed": len(results) - successes,
            "results": results,
            "note": "Indexing API daily quota: 200 requests. Use sitemap_ping for bulk URL discovery."
        }, indent=2)
        
    except Exception as e:
        return json.dumps({"error": str(e), "tool": "batch_indexing"})


def sitemap_ping_fn(sitemap_url: str = "https://example.com/sitemap.xml") -> str:
    """
    Ping Google to re-read the sitemap. 
    Use after adding new pages or updating existing URLs.
    This is free and has no quota — use it after every blog post or page update.
    
    Args:
        sitemap_url: Full URL to your sitemap.xml
    """
    try:
        ping_url = f"https://www.google.com/ping?sitemap={sitemap_url}"
        response = requests.get(ping_url, timeout=15)
        
        return json.dumps({
            "status": "success" if response.status_code == 200 else "error",
            "sitemap_url": sitemap_url,
            "http_code": response.status_code,
            "message": f"Google notified about sitemap update at {sitemap_url}" if response.status_code == 200 else "Ping failed"
        }, indent=2)
        
    except Exception as e:
        return json.dumps({"error": str(e), "tool": "sitemap_ping"})


def get_indexing_status_fn(url: str) -> str:
    """
    Check the last indexing notification status for a URL.
    
    Args:
        url: The URL to check
    """
    try:
        credentials = _get_credentials()
        
        endpoint = f"https://indexing.googleapis.com/v3/urlNotifications/metadata?url={url}"
        headers = {
            "Authorization": f"Bearer {credentials.token}",
            "Content-Type": "application/json"
        }
        
        response = requests.get(endpoint, headers=headers, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            return json.dumps({
                "status": "success",
                "url": url,
                "latest_update": data.get("latestUpdate", {}),
                "latest_remove": data.get("latestRemove", {}),
            }, indent=2)
        else:
            return json.dumps({
                "status": "not_found",
                "url": url,
                "message": "No indexing notification found for this URL. Submit it first with request_indexing."
            }, indent=2)
            
    except Exception as e:
        return json.dumps({"error": str(e), "tool": "get_indexing_status"})
