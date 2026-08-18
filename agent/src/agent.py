"""
NebulaSEO Autonomous Agent v5.3 - Gemini 3 Pro Preview
Uses google-genai SDK with Vertex AI authentication for Gemini 3
Fully autonomous: detect → fix → index → report (no human in the loop)
Cloud Scheduler runs twice daily (8AM & 8PM UTC)
"""
import json
import logging
import os
import time
from collections import deque
from datetime import UTC, datetime
from typing import Any

from google import genai
from google.genai import types

# ============================================================================
# LOGGING CONFIGURATION
# ============================================================================
# Configure structured logging
# Import our custom tools
# v4.0: New tool imports
from src.tools.analytics_tool import (
    correlate_seo_with_engagement_fn,
    get_organic_landing_pages_fn,
    get_realtime_users_fn,
    get_top_pages_fn,
    get_traffic_overview_fn,
    get_traffic_sources_fn,
)
from src.tools.bigquery_tool import (
    analyze_keyword_drops_fn,
    get_data_source_status_fn,
    get_keyword_performance_fn,
    get_top_keywords_fn,
)
from src.tools.content_generator import (
    generate_alt_text_fn,
    generate_blog_content_fn,
    generate_blog_outline_fn,
    generate_meta_description_fn,
    generate_meta_title_fn,
    generate_schema_markup_fn,
    rewrite_for_seo_fn,
    suggest_internal_links_fn,
)
from src.tools.github_tool import (
    github_create_branch_fn,
    github_create_pr_fn,
    github_get_pr_status_fn,
    github_get_repo_info_fn,
    github_list_files_fn,
    github_list_prs_fn,
    github_read_file_fn,
    github_update_file_fn,
)

# v5.0: New tool imports — GSC Live API, Indexing, PageSpeed, Schema Validator
from src.tools.gsc_api_tool import (
    gsc_live_country_breakdown_fn,
    gsc_live_daily_trend_fn,
    gsc_live_device_breakdown_fn,
    gsc_live_keyword_pages_fn,
    gsc_live_keywords_fn,
    gsc_live_pages_fn,
)
from src.tools.gsc_tool import (
    get_country_performance_fn,
    get_device_breakdown_fn,
    get_gsc_performance_fn,
    get_page_performance_fn,
)
from src.tools.indexing_tool import batch_indexing_fn, get_indexing_status_fn, request_indexing_fn, sitemap_ping_fn
from src.tools.pagespeed_tool import core_web_vitals_fn, pagespeed_audit_fn, pagespeed_compare_fn
from src.tools.schema_validator_tool import validate_schema_json_fn, validate_schema_on_page_fn
from src.tools.seo_actions import add_schema_markup_fn, create_blog_post_fn, fix_heading_structure_fn, fix_meta_tags_fn
from src.tools.serp_analyzer import (
    analyze_serp_fn,
    compare_with_competitors_fn,
    run_technical_audit_fn,
    suggest_title_improvements_fn,
)
from src.tools.web_crawler import analyze_competitor_fn, crawl_sitemap_fn, fetch_page_content_fn

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(name)s | %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger('SEOAgent')

# In-memory log storage for UI (last 100 logs)
REQUEST_LOGS: deque = deque(maxlen=100)

def log_request(log_entry: dict[str, Any]):
    """Add a log entry to the in-memory store."""
    log_entry['timestamp'] = datetime.now(UTC).isoformat()
    REQUEST_LOGS.append(log_entry)
    logger.info(f"{log_entry.get('type', 'LOG')} | {log_entry.get('message', '')}")

def get_logs(limit: int = 50) -> list[dict[str, Any]]:
    """Get recent logs from the in-memory store."""
    logs = list(REQUEST_LOGS)
    return logs[-limit:] if limit else logs


# ============================================================================
# TOOL FUNCTION MAPPING - Route tool calls to actual implementations
# ============================================================================

TOOL_FUNCTIONS = {
    # Data tools
    "analyze_keyword_drops": lambda args: analyze_keyword_drops_fn(args.get("limit", 10)),
    "get_keyword_performance": lambda args: get_keyword_performance_fn(
        args.get("keyword"), 
        args.get("days", 30)
    ),
    "get_top_keywords": lambda args: get_top_keywords_fn(args.get("limit", 20)),
    "get_data_source_status": lambda args: get_data_source_status_fn(),
    
    # GSC tools
    "get_gsc_performance": lambda args: get_gsc_performance_fn(args.get("site_url")),
    "get_page_performance": lambda args: get_page_performance_fn(
        args.get("page_url")
    ),
    "get_country_performance": lambda args: get_country_performance_fn(args.get("country_code", "ARE")),
    "get_device_breakdown": lambda args: get_device_breakdown_fn(),
    
    # Web crawling tools
    "fetch_page_content": lambda args: fetch_page_content_fn(args.get("url")),
    "crawl_sitemap": lambda args: crawl_sitemap_fn(
        args.get("sitemap_url"),
        args.get("limit", 50)
    ),
    "analyze_competitor": lambda args: analyze_competitor_fn(
        args.get("competitor_url"),
        args.get("target_keyword")
    ),
    
    # SERP tools
    "analyze_serp": lambda args: analyze_serp_fn(args.get("keyword"), args.get("num_results", 10)),
    "compare_with_competitors": lambda args: compare_with_competitors_fn(
        args.get("your_url"), 
        args.get("keyword"), 
        args.get("competitor_urls", "").split(",") if isinstance(args.get("competitor_urls"), str) else args.get("competitor_urls", [])
    ),
    
    # Optimization tools
    "suggest_title_improvements": lambda args: suggest_title_improvements_fn(
        args.get("current_title"), 
        args.get("target_keyword"), 
        args.get("page_type", "service")
    ),
    "run_technical_audit": lambda args: run_technical_audit_fn(
        args.get("url"), 
        args.get("audit_type", "full")
    ),
    
    # v4.0: Google Analytics tools
    "get_traffic_overview": lambda args: get_traffic_overview_fn(args.get("days", 30)),
    "get_top_pages_analytics": lambda args: get_top_pages_fn(args.get("limit", 20)),
    "get_traffic_sources": lambda args: get_traffic_sources_fn(),
    "get_organic_landing_pages": lambda args: get_organic_landing_pages_fn(args.get("limit", 20)),
    "get_realtime_users": lambda args: get_realtime_users_fn(),
    "correlate_seo_engagement": lambda args: correlate_seo_with_engagement_fn(args.get("gsc_pages", [])),
    
    # v4.0: GitHub tools
    "github_list_files": lambda args: github_list_files_fn(args.get("path", ""), args.get("branch", "main")),
    "github_read_file": lambda args: github_read_file_fn(args.get("file_path"), args.get("branch", "main")),
    "github_create_branch": lambda args: github_create_branch_fn(args.get("branch_name"), args.get("base_branch", "main")),
    "github_update_file": lambda args: github_update_file_fn(
        args.get("branch"),
        args.get("file_path"),
        args.get("content"),
        args.get("commit_message")
    ),
    "github_create_pr": lambda args: github_create_pr_fn(
        args.get("branch"),
        args.get("title"),
        args.get("body"),
        args.get("labels", ["seo", "automated"])
    ),
    "github_get_pr_status": lambda args: github_get_pr_status_fn(args.get("pr_number")),
    "github_list_prs": lambda args: github_list_prs_fn(args.get("state", "open")),
    "github_get_repo_info": lambda args: github_get_repo_info_fn(),
    
    # v4.0: Content generation tools
    "generate_meta_title": lambda args: generate_meta_title_fn(
        args.get("page_url"),
        args.get("current_title"),
        args.get("target_keyword"),
        args.get("page_content_summary", ""),
        args.get("brand", "NebulaSEO")
    ),
    "generate_meta_description": lambda args: generate_meta_description_fn(
        args.get("page_url"),
        args.get("page_content_summary"),
        args.get("target_keyword"),
        args.get("current_description", "")
    ),
    "generate_schema_markup": lambda args: generate_schema_markup_fn(
        args.get("schema_type"),
        args.get("page_data", {})
    ),
    "generate_blog_outline": lambda args: generate_blog_outline_fn(
        args.get("topic"),
        args.get("target_keywords", []),
        args.get("target_audience", "")
    ),
    "generate_blog_content": lambda args: generate_blog_content_fn(
        args.get("topic"),
        args.get("target_keywords", []),
        args.get("word_count", 1500),
        args.get("tone", "professional yet friendly")
    ),
    "rewrite_for_seo": lambda args: rewrite_for_seo_fn(
        args.get("content"),
        args.get("target_keyword"),
        args.get("content_type", "paragraph")
    ),
    "suggest_internal_links": lambda args: suggest_internal_links_fn(
        args.get("page_content"),
        args.get("available_pages", [])
    ),
    "generate_alt_text": lambda args: generate_alt_text_fn(
        args.get("image_context"),
        args.get("image_filename"),
        args.get("page_topic")
    ),
    
    # v4.0: SEO Action workflows (param order matches function signatures)
    "fix_meta_tags": lambda args: fix_meta_tags_fn(
        args.get("page_url"),
        args.get("file_path"),
        args.get("target_keyword"),
        args.get("issues", args.get("issues_to_fix", []))
    ),
    "add_schema_markup": lambda args: add_schema_markup_fn(
        args.get("page_url", ""),
        args.get("file_path"),
        args.get("schema_type"),
        args.get("schema_data", {})
    ),
    "create_blog_post": lambda args: create_blog_post_fn(
        args.get("topic"),
        args.get("target_keywords", []),
        args.get("slug"),
        args.get("author", "NebulaSEO Team")
    ),
    "fix_heading_structure": lambda args: fix_heading_structure_fn(
        args.get("page_url", ""),
        args.get("file_path"),
        args.get("issues", [])
    ),
    
    # v5.0: GSC Live API tools (direct Search Console API — no BigQuery wait)
    "gsc_live_keywords": lambda args: gsc_live_keywords_fn(args.get("days", 7), args.get("limit", 20)),
    "gsc_live_pages": lambda args: gsc_live_pages_fn(args.get("days", 7), args.get("limit", 20)),
    "gsc_live_keyword_pages": lambda args: gsc_live_keyword_pages_fn(args.get("keyword"), args.get("days", 28)),
    "gsc_live_daily_trend": lambda args: gsc_live_daily_trend_fn(args.get("keyword"), args.get("days", 28)),
    "gsc_live_device_breakdown": lambda args: gsc_live_device_breakdown_fn(args.get("days", 7)),
    "gsc_live_country_breakdown": lambda args: gsc_live_country_breakdown_fn(args.get("days", 7), args.get("limit", 15)),
    
    # v5.0: Google Indexing API tools
    "request_indexing": lambda args: request_indexing_fn(args.get("url"), args.get("action", "URL_UPDATED")),
    "batch_indexing": lambda args: batch_indexing_fn(args.get("urls", [])),
    "sitemap_ping": lambda args: sitemap_ping_fn(args.get("sitemap_url", "https://example.com/sitemap.xml")),
    "get_indexing_status": lambda args: get_indexing_status_fn(args.get("url")),
    
    # v5.0: PageSpeed Insights tools
    "pagespeed_audit": lambda args: pagespeed_audit_fn(args.get("url"), args.get("strategy", "mobile")),
    "pagespeed_compare": lambda args: pagespeed_compare_fn(args.get("urls", []), args.get("strategy", "mobile")),
    "core_web_vitals": lambda args: core_web_vitals_fn(args.get("url")),
    
    # v5.0: Schema Validator tools
    "validate_schema_on_page": lambda args: validate_schema_on_page_fn(args.get("url")),
    "validate_schema_json": lambda args: validate_schema_json_fn(args.get("schema_json")),
}

def route_tool_call(function_name: str, function_args: dict) -> str:
    """Route a tool call to its implementation."""
    start_time = time.time()
    
    if function_name in TOOL_FUNCTIONS:
        try:
            result = TOOL_FUNCTIONS[function_name](function_args)
            duration_ms = int((time.time() - start_time) * 1000)
            
            # Log successful tool call
            log_request({
                'type': 'TOOL_CALL',
                'status': 'success',
                'tool': function_name,
                'args': function_args,
                'duration_ms': duration_ms,
                'message': f"Tool '{function_name}' executed in {duration_ms}ms"
            })
            
            return result if isinstance(result, str) else json.dumps(result)
        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            
            # Log failed tool call
            log_request({
                'type': 'TOOL_CALL',
                'status': 'error',
                'tool': function_name,
                'args': function_args,
                'error': str(e),
                'duration_ms': duration_ms,
                'message': f"Tool '{function_name}' failed: {str(e)}"
            })
            
            return json.dumps({"error": str(e)})
    else:
        log_request({
            'type': 'TOOL_CALL',
            'status': 'error',
            'tool': function_name,
            'error': f"Unknown function: {function_name}",
            'message': f"Unknown tool requested: {function_name}"
        })
        return json.dumps({"error": f"Unknown function: {function_name}"})


# ============================================================================
# TOOL DECLARATIONS FOR GEMINI 3
# ============================================================================

def get_tool_declarations():
    """Build tool declarations for Gemini 3 using google-genai SDK format."""
    return [
        # ==================== DATA TOOLS ====================
        types.FunctionDeclaration(
            name="analyze_keyword_drops",
            description="Queries BigQuery SEO data to identify keywords with ranking drops. Use when user asks about ranking changes or performance audit.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "limit": types.Schema(type=types.Type.INTEGER, description="Max results to return. Default 10.")
                }
            )
        ),
        types.FunctionDeclaration(
            name="get_data_source_status",
            description="Check which data sources (GSC Bulk Export or Manual Data) are available. Use to verify data connectivity.",
            parameters=types.Schema(type=types.Type.OBJECT, properties={})
        ),
        types.FunctionDeclaration(
            name="get_top_keywords",
            description="Get top performing keywords by clicks from BigQuery.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "limit": types.Schema(type=types.Type.INTEGER, description="Number of keywords. Default 20.")
                }
            )
        ),
        
        # ==================== GSC TOOLS ====================
        types.FunctionDeclaration(
            name="get_gsc_performance",
            description="Get Google Search Console performance data (clicks, impressions, CTR, position).",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "site_url": types.Schema(type=types.Type.STRING, description="Site URL e.g. 'https://example.com/'")
                },
                required=["site_url"]
            )
        ),
        types.FunctionDeclaration(
            name="get_device_breakdown",
            description="Get performance breakdown by device type (mobile, desktop, tablet).",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "site_url": types.Schema(type=types.Type.STRING, description="Site URL to analyze")
                },
                required=["site_url"]
            )
        ),
        types.FunctionDeclaration(
            name="get_country_performance",
            description="Get performance by country.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "site_url": types.Schema(type=types.Type.STRING, description="Site URL to analyze")
                },
                required=["site_url"]
            )
        ),
        types.FunctionDeclaration(
            name="get_page_performance",
            description="Get performance data for a specific page.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "page_url": types.Schema(type=types.Type.STRING, description="Page URL to analyze"),
                    "days": types.Schema(type=types.Type.INTEGER, description="Days of data. Default 30.")
                },
                required=["page_url"]
            )
        ),
        
        # ==================== WEB CRAWLING TOOLS ====================
        types.FunctionDeclaration(
            name="fetch_page_content",
            description="Fetch and analyze a live webpage - extracts title, meta, headings, content, links, images, schema. Use for page audits.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "url": types.Schema(type=types.Type.STRING, description="Full URL to analyze")
                },
                required=["url"]
            )
        ),
        types.FunctionDeclaration(
            name="crawl_sitemap",
            description="Parse XML sitemap to discover all indexed pages.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "sitemap_url": types.Schema(type=types.Type.STRING, description="Sitemap URL"),
                    "limit": types.Schema(type=types.Type.INTEGER, description="Max URLs. Default 50.")
                },
                required=["sitemap_url"]
            )
        ),
        types.FunctionDeclaration(
            name="analyze_competitor",
            description="Analyze competitor page for keyword optimization.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "competitor_url": types.Schema(type=types.Type.STRING, description="Competitor URL"),
                    "target_keyword": types.Schema(type=types.Type.STRING, description="Keyword to check")
                },
                required=["competitor_url", "target_keyword"]
            )
        ),
        
        # ==================== SERP TOOLS ====================
        types.FunctionDeclaration(
            name="analyze_serp",
            description="Analyze SERP for a keyword - identifies competitors, SERP features, ranking opportunities.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "keyword": types.Schema(type=types.Type.STRING, description="Keyword to analyze"),
                    "num_results": types.Schema(type=types.Type.INTEGER, description="Results to analyze. Default 10.")
                },
                required=["keyword"]
            )
        ),
        types.FunctionDeclaration(
            name="run_technical_audit",
            description="Run technical SEO audit on a URL - checks Core Web Vitals, meta tags, schema, headings.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "url": types.Schema(type=types.Type.STRING, description="URL to audit"),
                    "audit_type": types.Schema(type=types.Type.STRING, description="Audit type: 'full', 'quick', or 'cwv'. Default 'full'.")
                },
                required=["url"]
            )
        ),
        types.FunctionDeclaration(
            name="suggest_title_improvements",
            description="Generate improved title tag suggestions.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "current_title": types.Schema(type=types.Type.STRING, description="Current title"),
                    "target_keyword": types.Schema(type=types.Type.STRING, description="Target keyword"),
                    "page_type": types.Schema(type=types.Type.STRING, description="Page type: service, product, blog, etc.")
                },
                required=["current_title", "target_keyword"]
            )
        ),
        
        # ==================== GA4 ANALYTICS TOOLS ====================
        types.FunctionDeclaration(
            name="get_traffic_overview",
            description="Get GA4 traffic overview - users, sessions, pageviews, engagement.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "days": types.Schema(type=types.Type.INTEGER, description="Days of data. Default 30.")
                }
            )
        ),
        types.FunctionDeclaration(
            name="get_top_pages_analytics",
            description="Get top pages by views from GA4.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "limit": types.Schema(type=types.Type.INTEGER, description="Number of pages. Default 20.")
                }
            )
        ),
        types.FunctionDeclaration(
            name="get_traffic_sources",
            description="Get traffic sources breakdown from GA4.",
            parameters=types.Schema(type=types.Type.OBJECT, properties={})
        ),
        types.FunctionDeclaration(
            name="get_organic_landing_pages",
            description="Get organic search landing pages from GA4.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "limit": types.Schema(type=types.Type.INTEGER, description="Number of pages. Default 20.")
                }
            )
        ),
        types.FunctionDeclaration(
            name="get_realtime_users",
            description="Get realtime active users from GA4.",
            parameters=types.Schema(type=types.Type.OBJECT, properties={})
        ),
        
        # ==================== GITHUB TOOLS ====================
        types.FunctionDeclaration(
            name="github_list_files",
            description="List files in GitHub repository.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "path": types.Schema(type=types.Type.STRING, description="Directory path. Default root."),
                    "branch": types.Schema(type=types.Type.STRING, description="Branch name. Default 'main'.")
                }
            )
        ),
        types.FunctionDeclaration(
            name="github_read_file",
            description="Read file content from GitHub.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "file_path": types.Schema(type=types.Type.STRING, description="File path"),
                    "branch": types.Schema(type=types.Type.STRING, description="Branch. Default 'main'.")
                },
                required=["file_path"]
            )
        ),
        types.FunctionDeclaration(
            name="github_create_branch",
            description="Create new branch in GitHub.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "branch_name": types.Schema(type=types.Type.STRING, description="New branch name"),
                    "base_branch": types.Schema(type=types.Type.STRING, description="Base branch. Default 'main'.")
                },
                required=["branch_name"]
            )
        ),
        types.FunctionDeclaration(
            name="github_update_file",
            description="Update or create file in GitHub.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "branch": types.Schema(type=types.Type.STRING, description="Branch to commit to"),
                    "file_path": types.Schema(type=types.Type.STRING, description="File path"),
                    "content": types.Schema(type=types.Type.STRING, description="File content"),
                    "commit_message": types.Schema(type=types.Type.STRING, description="Commit message")
                },
                required=["branch", "file_path", "content", "commit_message"]
            )
        ),
        types.FunctionDeclaration(
            name="github_create_pr",
            description="Create Pull Request in GitHub.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "branch": types.Schema(type=types.Type.STRING, description="Source branch"),
                    "title": types.Schema(type=types.Type.STRING, description="PR title"),
                    "body": types.Schema(type=types.Type.STRING, description="PR description"),
                    "labels": types.Schema(type=types.Type.ARRAY, items=types.Schema(type=types.Type.STRING), description="PR labels")
                },
                required=["branch", "title", "body"]
            )
        ),
        types.FunctionDeclaration(
            name="github_list_prs",
            description="List Pull Requests.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "state": types.Schema(type=types.Type.STRING, description="PR state: 'open', 'closed', 'all'. Default 'open'.")
                }
            )
        ),
        types.FunctionDeclaration(
            name="github_get_repo_info",
            description="Get repository information.",
            parameters=types.Schema(type=types.Type.OBJECT, properties={})
        ),
        
        # ==================== CONTENT GENERATION TOOLS ====================
        types.FunctionDeclaration(
            name="generate_meta_title",
            description="Generate optimized meta title for a page.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "page_url": types.Schema(type=types.Type.STRING, description="Page URL"),
                    "current_title": types.Schema(type=types.Type.STRING, description="Current title"),
                    "target_keyword": types.Schema(type=types.Type.STRING, description="Target keyword"),
                    "page_content_summary": types.Schema(type=types.Type.STRING, description="Page summary"),
                    "brand": types.Schema(type=types.Type.STRING, description="Brand name. Default 'NebulaSEO'.")
                },
                required=["page_url", "target_keyword"]
            )
        ),
        types.FunctionDeclaration(
            name="generate_meta_description",
            description="Generate optimized meta description.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "page_url": types.Schema(type=types.Type.STRING, description="Page URL"),
                    "page_content_summary": types.Schema(type=types.Type.STRING, description="Page summary"),
                    "target_keyword": types.Schema(type=types.Type.STRING, description="Target keyword"),
                    "current_description": types.Schema(type=types.Type.STRING, description="Current description")
                },
                required=["page_url", "target_keyword"]
            )
        ),
        types.FunctionDeclaration(
            name="generate_schema_markup",
            description="Generate JSON-LD schema markup.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "schema_type": types.Schema(type=types.Type.STRING, description="Schema type: Organization, LocalBusiness, Article, Product, FAQ, HowTo"),
                    "page_data": types.Schema(type=types.Type.OBJECT, description="Data for schema")
                },
                required=["schema_type"]
            )
        ),
        types.FunctionDeclaration(
            name="generate_blog_outline",
            description="Generate SEO-optimized blog post outline.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "topic": types.Schema(type=types.Type.STRING, description="Blog topic"),
                    "target_keywords": types.Schema(type=types.Type.ARRAY, items=types.Schema(type=types.Type.STRING), description="Target keywords"),
                    "target_audience": types.Schema(type=types.Type.STRING, description="Target audience")
                },
                required=["topic"]
            )
        ),
        types.FunctionDeclaration(
            name="generate_blog_content",
            description="Generate full blog post content.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "topic": types.Schema(type=types.Type.STRING, description="Blog topic"),
                    "target_keywords": types.Schema(type=types.Type.ARRAY, items=types.Schema(type=types.Type.STRING), description="Target keywords"),
                    "word_count": types.Schema(type=types.Type.INTEGER, description="Word count. Default 1500."),
                    "tone": types.Schema(type=types.Type.STRING, description="Writing tone")
                },
                required=["topic"]
            )
        ),
        types.FunctionDeclaration(
            name="generate_alt_text",
            description="Generate SEO-friendly alt text for images.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "image_context": types.Schema(type=types.Type.STRING, description="Image context/description"),
                    "image_filename": types.Schema(type=types.Type.STRING, description="Image filename"),
                    "page_topic": types.Schema(type=types.Type.STRING, description="Page topic")
                },
                required=["image_context"]
            )
        ),
        
        # ==================== SEO ACTION WORKFLOWS ====================
        types.FunctionDeclaration(
            name="fix_meta_tags",
            description="AUTONOMOUS: Fix meta tags on a page and create a GitHub PR.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "file_path": types.Schema(type=types.Type.STRING, description="File path in repo"),
                    "page_url": types.Schema(type=types.Type.STRING, description="Live page URL"),
                    "target_keyword": types.Schema(type=types.Type.STRING, description="Target keyword"),
                    "issues_to_fix": types.Schema(type=types.Type.ARRAY, items=types.Schema(type=types.Type.STRING), description="Issues: improve_title, improve_meta_description, add_og_tags")
                },
                required=["file_path", "page_url", "target_keyword"]
            )
        ),
        types.FunctionDeclaration(
            name="add_schema_markup",
            description="AUTONOMOUS: Add schema markup to a page and create a GitHub PR.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "file_path": types.Schema(type=types.Type.STRING, description="File path in repo"),
                    "schema_type": types.Schema(type=types.Type.STRING, description="Schema type"),
                    "schema_data": types.Schema(type=types.Type.OBJECT, description="Schema data")
                },
                required=["file_path", "schema_type"]
            )
        ),
        types.FunctionDeclaration(
            name="create_blog_post",
            description="AUTONOMOUS: Create a new blog post and GitHub PR.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "topic": types.Schema(type=types.Type.STRING, description="Blog topic"),
                    "target_keywords": types.Schema(type=types.Type.ARRAY, items=types.Schema(type=types.Type.STRING), description="Target keywords"),
                    "slug": types.Schema(type=types.Type.STRING, description="URL slug"),
                    "word_count": types.Schema(type=types.Type.INTEGER, description="Word count. Default 1500.")
                },
                required=["topic", "slug"]
            )
        ),
        types.FunctionDeclaration(
            name="fix_heading_structure",
            description="AUTONOMOUS: Fix heading structure (H1-H6) and create GitHub PR.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "file_path": types.Schema(type=types.Type.STRING, description="File path in repo"),
                    "issues": types.Schema(type=types.Type.ARRAY, items=types.Schema(type=types.Type.STRING), description="Heading issues to fix")
                },
                required=["file_path"]
            )
        ),
        
        # ==================== GSC LIVE API TOOLS (v5.0) ====================
        types.FunctionDeclaration(
            name="gsc_live_keywords",
            description="Get LIVE keyword data directly from Google Search Console API. Use this for real-time keyword performance — no BigQuery wait. Returns clicks, impressions, CTR, position.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "days": types.Schema(type=types.Type.INTEGER, description="Days of data (max 16 months). Default 7."),
                    "limit": types.Schema(type=types.Type.INTEGER, description="Max keywords. Default 20.")
                }
            )
        ),
        types.FunctionDeclaration(
            name="gsc_live_pages",
            description="Get LIVE page-level performance from GSC API. Shows which pages get clicks/impressions.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "days": types.Schema(type=types.Type.INTEGER, description="Days of data. Default 7."),
                    "limit": types.Schema(type=types.Type.INTEGER, description="Max pages. Default 20.")
                }
            )
        ),
        types.FunctionDeclaration(
            name="gsc_live_keyword_pages",
            description="Find which pages rank for a specific keyword via GSC API. Great for finding keyword cannibalization.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "keyword": types.Schema(type=types.Type.STRING, description="Keyword to search for"),
                    "days": types.Schema(type=types.Type.INTEGER, description="Days of data. Default 28.")
                },
                required=["keyword"]
            )
        ),
        types.FunctionDeclaration(
            name="gsc_live_daily_trend",
            description="Get daily click/impression trends from GSC API. Optionally filter by keyword to track ranking changes over time.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "keyword": types.Schema(type=types.Type.STRING, description="Optional keyword filter"),
                    "days": types.Schema(type=types.Type.INTEGER, description="Days of data. Default 28.")
                }
            )
        ),
        types.FunctionDeclaration(
            name="gsc_live_device_breakdown",
            description="Get LIVE device breakdown (mobile/desktop/tablet) from GSC API.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "days": types.Schema(type=types.Type.INTEGER, description="Days of data. Default 7.")
                }
            )
        ),
        types.FunctionDeclaration(
            name="gsc_live_country_breakdown",
            description="Get LIVE country breakdown from GSC API. See which countries drive clicks.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "days": types.Schema(type=types.Type.INTEGER, description="Days of data. Default 7."),
                    "limit": types.Schema(type=types.Type.INTEGER, description="Max countries. Default 15.")
                }
            )
        ),
        
        # ==================== GOOGLE INDEXING API TOOLS (v5.0) ====================
        types.FunctionDeclaration(
            name="request_indexing",
            description="Request Google to re-crawl a URL immediately via Indexing API. Use AFTER pushing SEO fixes to get fast re-indexing.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "url": types.Schema(type=types.Type.STRING, description="URL to submit for re-crawling"),
                    "action": types.Schema(type=types.Type.STRING, description="'URL_UPDATED' (re-crawl) or 'URL_DELETED' (remove). Default URL_UPDATED.")
                },
                required=["url"]
            )
        ),
        types.FunctionDeclaration(
            name="batch_indexing",
            description="Submit multiple URLs for re-indexing in batch. Max 200/day.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "urls": types.Schema(type=types.Type.ARRAY, items=types.Schema(type=types.Type.STRING), description="List of URLs to submit")
                },
                required=["urls"]
            )
        ),
        types.FunctionDeclaration(
            name="sitemap_ping",
            description="Ping Google to re-read the sitemap. Use after adding new pages or blog posts. Free and unlimited.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "sitemap_url": types.Schema(type=types.Type.STRING, description="Sitemap URL. Default: https://example.com/sitemap.xml")
                }
            )
        ),
        types.FunctionDeclaration(
            name="get_indexing_status",
            description="Check the last indexing notification status for a URL.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "url": types.Schema(type=types.Type.STRING, description="URL to check")
                },
                required=["url"]
            )
        ),
        
        # ==================== PAGESPEED INSIGHTS TOOLS (v5.0) ====================
        types.FunctionDeclaration(
            name="pagespeed_audit",
            description="Run full PageSpeed Insights audit. Returns Lighthouse scores, Core Web Vitals, and optimization opportunities. Use for performance audits.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "url": types.Schema(type=types.Type.STRING, description="URL to audit"),
                    "strategy": types.Schema(type=types.Type.STRING, description="'mobile' or 'desktop'. Default 'mobile' (Google uses mobile-first indexing).")
                },
                required=["url"]
            )
        ),
        types.FunctionDeclaration(
            name="pagespeed_compare",
            description="Compare PageSpeed scores across multiple URLs. Great for benchmarking against competitors.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "urls": types.Schema(type=types.Type.ARRAY, items=types.Schema(type=types.Type.STRING), description="URLs to compare (max 5)"),
                    "strategy": types.Schema(type=types.Type.STRING, description="'mobile' or 'desktop'. Default 'mobile'.")
                },
                required=["urls"]
            )
        ),
        types.FunctionDeclaration(
            name="core_web_vitals",
            description="Quick Core Web Vitals check (LCP, INP, CLS) for both mobile and desktop. These are Google ranking signals.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "url": types.Schema(type=types.Type.STRING, description="URL to check CWV for")
                },
                required=["url"]
            )
        ),
        
        # ==================== SCHEMA VALIDATOR TOOLS (v5.0) ====================
        types.FunctionDeclaration(
            name="validate_schema_on_page",
            description="Validate all JSON-LD structured data on a live page. Checks for missing schemas, required properties, and rich results eligibility.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "url": types.Schema(type=types.Type.STRING, description="URL to check for structured data")
                },
                required=["url"]
            )
        ),
        types.FunctionDeclaration(
            name="validate_schema_json",
            description="Validate a JSON-LD schema markup string before deploying. Checks syntax, required properties, and Google compatibility.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "schema_json": types.Schema(type=types.Type.STRING, description="JSON-LD markup string to validate")
                },
                required=["schema_json"]
            )
        ),
    ]


# ============================================================================
# SYSTEM PROMPT
# ============================================================================

EXPERT_SEO_SYSTEM_PROMPT = """You are **NebulaSEO**, a world-class autonomous AI SEO and Growth Engineering agent equipped with 37 real-time tools for search analytics, Core Web Vitals, schema markup, and autonomous GitHub PR generation.
You have access to powerful tools for SEO analysis, content generation, and autonomous actions.

## CRITICAL: YOU ARE AUTONOMOUS
- NEVER ask "Would you like me to proceed?" or "Shall I fix this?"
- NEVER wait for user confirmation before taking action
- When you detect an issue, FIX IT IMMEDIATELY by creating a GitHub PR
- When you create a PR, IMMEDIATELY request re-indexing of affected URLs
- Report WHAT YOU DID, not what you COULD do
- You are a self-driving SEO machine — detect, fix, index, report. No human in the loop.

## Your Capabilities:
1. **Live GSC Data**: Query Google Search Console API directly for real-time keyword/page data (gsc_live_* tools)
2. **BigQuery Analytics**: Query BigQuery for historical GSC bulk export data
3. **GA4 Analytics**: Get traffic data, engagement metrics, top pages
4. **PageSpeed & CWV**: Run PageSpeed Insights audits, check Core Web Vitals (LCP, INP, CLS)
5. **Schema Validation**: Validate JSON-LD structured data on pages, check rich results eligibility
6. **Page Analysis**: Crawl pages, analyze SEO elements, check competitors via SERP analysis
7. **GitHub Actions**: Read/write code, create branches, make PRs for SEO fixes
8. **Google Indexing**: Submit URLs for re-crawling after fixes, ping sitemaps
9. **Content Generation**: Generate meta tags, schema markup, blog content
10. **Autonomous Fixes**: Fix meta tags, add schema, create blog posts — all via automated PRs

## Autonomous Closed-Loop Workflow:
1. **Detect** → Use gsc_live_keywords + pagespeed_audit to find issues
2. **Analyze** → Check competitors, validate schema, audit page content
3. **Fix** → Generate optimized content, create GitHub branch, push changes, create PR
4. **Re-index** → Use request_indexing or sitemap_ping to notify Google immediately
5. **Report** → Summarize what was done, link to PRs created

## Tool Priority:
- For keyword data: Use gsc_live_keywords FIRST (live API), fall back to BigQuery tools
- For performance: Use pagespeed_audit + core_web_vitals for real Lighthouse/CrUX data
- For schema: Use validate_schema_on_page before and after adding schema markup
- After ANY fix: Use request_indexing to notify Google, then sitemap_ping

## When You Find Issues — ACT:
- Missing schema → Call add_schema_markup with the correct file_path and schema_type
- Bad meta tags → Call fix_meta_tags with page_url, file_path, target_keyword, issues
- Heading problems → Call fix_heading_structure with page_url, file_path, issues
- Content gaps → Call create_blog_post to generate new content
- After ANY PR → Call request_indexing on the affected URL + sitemap_ping

## NebulaSEO Website File Paths (Vmnebula/NebulaSEO repo):
| URL | File Path |
|-----|-----------|
| https://example.com | website/src/app/page.tsx |
| https://example.com/about | website/src/app/about/page.tsx |
| https://example.com/services | website/src/app/services/page.tsx |
| https://example.com/products | website/src/app/products/page.tsx |
| https://example.com/contact | website/src/app/contact/page.tsx |
| https://example.com/blog | website/src/app/blog/page.tsx |
| https://example.com/blog/[slug] | website/src/app/blog/[slug]/page.tsx |
| https://example.com/planner | website/src/app/planner/page.tsx |
| https://example.com/privacy | website/src/app/privacy/page.tsx |
| https://example.com/terms | website/src/app/terms/page.tsx |
| Layout (all pages) | website/src/app/layout.tsx |

## Guidelines:
- Always use tools to get real data — never guess or hallucinate metrics
- Always create PRs (never commit directly to main)
- After pushing fixes, ALWAYS request re-indexing
- Target keywords: mobile app development, AI automation, product studio, Dubai, cloud solutions

## Site Information:
- Website: https://example.com
- GitHub: Vmnebula/NebulaSEO
- GSC Property: sc-domain:example.com
- BigQuery: your_dataset.searchconsole (GSC Bulk Export)

## GCP Project Structure:
- SEO Agent Project: nebulaseo (Cloud Run, BigQuery, GSC Export)
- Website Hosting Project: your-gcp-project-id (Firebase/Cloud Run for website)
"""


# ============================================================================
# GEMINI 3 SEO AGENT CLASS
# ============================================================================

class SEOAgent:
    """SEO Agent using Gemini 3 Pro Preview via google-genai SDK."""
    
    def __init__(self):
        """Initialize the agent with Gemini 3 configuration."""
        # Set environment for Vertex AI mode
        os.environ.setdefault("GOOGLE_CLOUD_PROJECT", "nebulaseo")
        os.environ.setdefault("GOOGLE_CLOUD_LOCATION", "global")
        os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "True")
        
        # Initialize client
        self.client = genai.Client()
        self.model_id = "gemini-3-pro-preview"
        
        # Build tools
        self.tools = [types.Tool(function_declarations=get_tool_declarations())]
        
        # Store chat sessions
        self.chat_sessions = {}
        
        print(f"[SEOAgent] Initialized with model: {self.model_id}")
    
    def get_chat(self, session_id: str = "default"):
        """Get or create a chat session."""
        if session_id not in self.chat_sessions:
            self.chat_sessions[session_id] = self.client.chats.create(
                model=self.model_id,
                config=types.GenerateContentConfig(
                    system_instruction=EXPERT_SEO_SYSTEM_PROMPT,
                    tools=self.tools,
                    temperature=0.7,
                    thinking_config=types.ThinkingConfig(
                        thinking_level=types.ThinkingLevel.HIGH  # Use high reasoning for SEO tasks
                    )
                )
            )
        return self.chat_sessions[session_id]
    
    def process_message(self, user_message: str, session_id: str = "default") -> str:
        """Process a user message and return the agent's response."""
        request_start = time.time()
        request_id = f"req_{int(request_start * 1000)}"
        tools_called = []
        
        # Log incoming request
        log_request({
            'type': 'REQUEST',
            'status': 'started',
            'request_id': request_id,
            'session_id': session_id,
            'message': user_message[:100] + ('...' if len(user_message) > 100 else ''),
            'full_message': user_message
        })
        
        try:
            chat = self.get_chat(session_id)
            
            # Send message
            response = chat.send_message(user_message)
            
            # Handle function calls in a loop
            max_iterations = 10
            iteration = 0
            
            while iteration < max_iterations:
                iteration += 1
                
                # Check for function calls
                function_calls = []
                if response.candidates:
                    for part in response.candidates[0].content.parts:
                        if hasattr(part, 'function_call') and part.function_call:
                            function_calls.append(part.function_call)
                
                if not function_calls:
                    break
                
                # Process function calls
                function_responses = []
                for fc in function_calls:
                    function_name = fc.name
                    function_args = dict(fc.args) if fc.args else {}
                    tools_called.append(function_name)
                    
                    logger.info(f"[{request_id}] Calling tool: {function_name}")
                    
                    # Execute function
                    result = route_tool_call(function_name, function_args)
                    
                    function_responses.append(
                        types.Part.from_function_response(
                            name=function_name,
                            response={"result": result}
                        )
                    )
                
                # Send function responses back
                response = chat.send_message(function_responses)
            
            # Extract final text
            final_text = ""
            if response.candidates:
                for part in response.candidates[0].content.parts:
                    if hasattr(part, 'text') and part.text:
                        final_text += part.text
            
            duration_ms = int((time.time() - request_start) * 1000)
            
            # If no text but tools were called, generate a summary
            if not final_text and tools_called:
                final_text = (
                    f"✅ **Autonomous actions completed** ({len(tools_called)} tools used in {duration_ms/1000:.1f}s)\n\n"
                    f"**Tools executed:** {', '.join(tools_called)}\n\n"
                    f"All actions were performed automatically. Check GitHub PRs for any code changes."
                )
            
            # Log successful completion
            log_request({
                'type': 'REQUEST',
                'status': 'completed',
                'request_id': request_id,
                'session_id': session_id,
                'duration_ms': duration_ms,
                'tools_called': tools_called,
                'tools_count': len(tools_called),
                'response_length': len(final_text),
                'message': f"Request completed in {duration_ms}ms using {len(tools_called)} tools"
            })
            
            return final_text if final_text else "I couldn't generate a response. Please try again."
            
        except Exception as e:
            error_msg = str(e)
            duration_ms = int((time.time() - request_start) * 1000)
            
            # Log error
            log_request({
                'type': 'REQUEST',
                'status': 'error',
                'request_id': request_id,
                'session_id': session_id,
                'error': error_msg,
                'duration_ms': duration_ms,
                'tools_called': tools_called,
                'message': f"Request failed after {duration_ms}ms: {error_msg}"
            })
            
            logger.error(f"[{request_id}] Error: {error_msg}")
            return f"Error processing request: {error_msg}"


# Global agent instance
_agent_instance = None

def get_agent() -> SEOAgent:
    """Get or create the global agent instance."""
    global _agent_instance
    if _agent_instance is None:
        _agent_instance = SEOAgent()
    return _agent_instance
