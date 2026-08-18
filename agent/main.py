import asyncio
import os
from typing import Any

import uvicorn
from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from src.agent import get_agent, get_logs, log_request
from src.tools.automation import get_automation_history, run_and_store

app = FastAPI(title="NebulaSEO Agent")

AGENT_TOKEN = os.getenv("AGENT_TOKEN")

async def verify_agent_token(authorization: str | None = Header(None), x_agent_token: str | None = Header(None)):
    """
    Verify incoming requests via Bearer token or X-Agent-Token header.
    If AGENT_TOKEN is configured in environment, strict token auth is enforced.
    """
    if not AGENT_TOKEN:
        return True  # Dev mode without token configured
    
    token = x_agent_token
    if not token and authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "").strip()
        
    if token != AGENT_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid or missing agent token")
    return True

# Add CORS middleware to allow requests from dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"

class ChatResponse(BaseModel):
    response: str

@app.get("/")
async def root():
    return {
        "status": "Agent is running", 
        "service": "NebulaSEO Agent",
        "version": "5.3",
        "model": "gemini-3-pro-preview",
        "sdk": "google-genai (Gemini 3 SDK)",
        "thinking_level": "HIGH",
        "mode": "FULLY AUTONOMOUS — detect → fix → index → report",
        "automation": {
            "status": "active",
            "schedule": "Twice daily (8AM & 8PM UTC)",
            "endpoint": "/automate",
            "loop": "DETECT → ANALYZE → FIX (auto-PR) → INDEX → REPORT"
        },
        "data_sources": {
            "primary": "Google Search Console Live API",
            "secondary": "Google Search Console Bulk Export (BigQuery)",
            "fallback": "Manual SEO Data (seo_data.keyword_performance)",
            "pagespeed": "PageSpeed Insights API v5",
            "indexing": "Google Indexing API"
        },
        "tools": {
            "gsc_live": [
                "gsc_live_keywords — Real-time keyword data",
                "gsc_live_pages — Top performing pages",
                "gsc_live_device_breakdown — Mobile vs Desktop",
                "gsc_live_country_breakdown — Traffic by country",
                "gsc_live_daily_trend — Keyword trend over time",
                "gsc_live_keyword_pages — Pages ranking for keyword"
            ],
            "pagespeed": [
                "pagespeed_audit — Full Lighthouse audit",
                "pagespeed_compare — Multi-page comparison",
                "core_web_vitals — CrUX real-user data"
            ],
            "indexing": [
                "request_indexing — Submit URL for re-crawl",
                "batch_indexing — Batch URL submission",
                "sitemap_ping — Ping sitemap",
                "get_indexing_status — Check index status"
            ],
            "schema": [
                "validate_schema_on_page — Check live page schemas",
                "validate_schema_json — Validate JSON-LD before deploy"
            ],
            "data_analytics": [
                "analyze_keyword_drops — Find ranking changes",
                "get_gsc_performance — Site-wide performance",
                "get_data_source_status — Check data sources",
                "get_device_breakdown — Mobile vs Desktop (BigQuery)",
                "get_country_performance — Country-specific data",
                "get_page_performance — Page-level analysis"
            ],
            "web_crawling": [
                "fetch_page_content — Analyze live webpage",
                "crawl_sitemap — Parse XML sitemap",
                "analyze_competitor — Competitor page analysis"
            ],
            "automation": [
                "/automate — Full closed-loop SEO workflow",
                "/automate/history — Recent automation runs"
            ]
        }
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

class LogEntry(BaseModel):
    timestamp: str
    type: str
    status: str
    message: str
    request_id: str | None = None
    session_id: str | None = None
    tool: str | None = None
    args: dict[str, Any] | None = None
    error: str | None = None
    duration_ms: int | None = None
    tools_called: list[str] | None = None
    tools_count: int | None = None
    response_length: int | None = None

class LogsResponse(BaseModel):
    logs: list[dict[str, Any]]
    total: int

@app.get("/logs", response_model=LogsResponse)
async def get_logs_endpoint(
    limit: int = Query(default=50, ge=1, le=100, description="Number of logs to return"),
    type: str | None = Query(default=None, description="Filter by log type (REQUEST, TOOL_CALL)"),
    status: str | None = Query(default=None, description="Filter by status (started, completed, error, success)")
):
    """
    Get recent request logs for the SEO Agent.
    Returns logs in reverse chronological order (newest first).
    """
    logs = get_logs(limit=100)  # Get all logs first
    
    # Apply filters
    if type:
        logs = [entry for entry in logs if entry.get('type') == type]
    if status:
        logs = [entry for entry in logs if entry.get('status') == status]
    
    # Limit and reverse (newest first)
    logs = logs[-limit:][::-1]
    
    return LogsResponse(logs=logs, total=len(logs))

@app.post("/chat", response_model=ChatResponse, dependencies=[Depends(verify_agent_token)])
async def chat_endpoint(request: ChatRequest):
    """
    Endpoint to interact with the SEO Agent.
    Supports multi-turn conversations via session_id.
    """
    try:
        agent = get_agent()
        
        # Process message with session support
        result = agent.process_message(request.message, request.session_id)
        
        return ChatResponse(response=result)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# AUTOMATION ENDPOINTS (v5.1)
# ============================================================

class AutomationResponse(BaseModel):
    run_id: str
    timestamp: str
    status: str
    duration_ms: int
    summary: dict[str, Any] | None = None
    steps: dict[str, Any] | None = None
    error: str | None = None

@app.post("/automate", response_model=AutomationResponse, dependencies=[Depends(verify_agent_token)])
async def automate_endpoint():
    """
    Run the full closed-loop SEO automation workflow.
    Called by Cloud Scheduler twice daily (8AM & 8PM UTC).
    
    Workflow:
    1. DETECT  — Scan keywords/pages for drops and issues
    2. ANALYZE — PageSpeed audits, schema validation on top pages
    3. INDEX   — Submit URLs for re-crawling, ping sitemap
    4. REPORT  — Compile summary of all actions taken
    """
    try:
        # Log the automation trigger
        log_request({
            'type': 'AUTOMATION',
            'status': 'started',
            'message': 'Full SEO automation loop triggered'
        })
        
        # Run the full automation loop (synchronous — takes 30-90s)
        report = await asyncio.to_thread(run_and_store)
        
        # Log completion
        log_request({
            'type': 'AUTOMATION',
            'status': 'completed',
            'duration_ms': report.get('duration_ms', 0),
            'message': f"Automation completed: {report.get('summary', {}).get('successes', 0)} ok, "
                      f"{report.get('summary', {}).get('failures', 0)} errors"
        })
        
        return AutomationResponse(
            run_id=report.get("run_id", "unknown"),
            timestamp=report.get("timestamp", ""),
            status=report.get("status", "unknown"),
            duration_ms=report.get("duration_ms", 0),
            summary=report.get("summary"),
            steps=report.get("steps"),
            error=report.get("error")
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        log_request({
            'type': 'AUTOMATION',
            'status': 'error',
            'error': str(e),
            'message': f'Automation failed: {str(e)}'
        })
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/automate/history")
async def automation_history_endpoint(
    limit: int = Query(default=10, ge=1, le=50, description="Number of runs to return")
):
    """Get recent automation run history."""
    runs = get_automation_history(limit)
    return {
        "runs": runs,
        "total": len(runs),
        "schedule": "Twice daily (8AM & 8PM UTC)"
    }


@app.get("/automate/status")
async def automation_status_endpoint():
    """Get current automation status and last run info."""
    history = get_automation_history(1)
    last_run = history[0] if history else None
    
    return {
        "automation_enabled": True,
        "schedule": "Twice daily (8AM & 8PM UTC)",
        "last_run": {
            "run_id": last_run.get("run_id") if last_run else None,
            "timestamp": last_run.get("timestamp") if last_run else None,
            "status": last_run.get("status") if last_run else "never_run",
            "duration_ms": last_run.get("duration_ms") if last_run else None,
            "summary": last_run.get("summary") if last_run else None
        },
        "total_runs": len(get_automation_history(50))
    }


if __name__ == "__main__":
    # Retrieve port from environment or use default
    port = int(os.getenv("PORT", 8080))
    # In Cloud Run, we should listen on 0.0.0.0
    uvicorn.run(app, host="0.0.0.0", port=port)
