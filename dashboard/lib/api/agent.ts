// Use local API proxy to avoid CORS issues
const API_BASE = '/api';
const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL || 'http://localhost:8080';

export interface ChatResponse {
  response: string;
  session_id: string;
}

export interface AgentStatus {
  status: string;
  service: string;
  version: string;
  mode: string;
  data_sources: {
    primary: string;
    fallback: string;
  };
  tools: Record<string, string[]>;
}

export interface AutomationResult {
  run_id: string;
  status: string;
  duration_ms: number;
  steps: Record<string, any>;
  summary: {
    total_tools: number;
    successes: number;
    failures: number;
    prs_created: number;
    urls_indexed: number;
  };
}

export async function sendMessage(message: string, sessionId?: string): Promise<ChatResponse> {
  // Use local API proxy to avoid CORS
  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      session_id: sessionId,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Agent error: ${response.status}`);
  }

  return response.json();
}

export async function getAgentStatus(): Promise<AgentStatus> {
  const response = await fetch(`${API_BASE}/status`);
  
  if (!response.ok) {
    throw new Error(`Agent error: ${response.status}`);
  }

  return response.json();
}

export async function checkHealth(): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE}/health`);
  
  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status}`);
  }

  return response.json();
}

export async function triggerAutomation(): Promise<AutomationResult> {
  const response = await fetch(`${AGENT_URL}/automate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trigger: 'manual' }),
  });

  if (!response.ok) {
    throw new Error(`Automation error: ${response.status}`);
  }

  return response.json();
}

export async function getAutomationHistory(): Promise<AutomationResult[]> {
  const response = await fetch(`${AGENT_URL}/automate/history`);

  if (!response.ok) {
    throw new Error(`History error: ${response.status}`);
  }

  return response.json();
}

// Quick action prompts
export const QUICK_ACTIONS = [
  { label: "Live Keywords", prompt: "Use gsc_live_keywords to get my top 20 keywords by clicks for the last 7 days" },
  { label: "Ranking Drops", prompt: "Use gsc_live_daily_trend for my top keyword and show any ranking drops in the last 28 days" },
  { label: "Device Breakdown", prompt: "Use gsc_live_device_breakdown to show my mobile vs desktop performance for the last 7 days" },
  { label: "PageSpeed Audit", prompt: "Use pagespeed_audit to check Core Web Vitals for https://example.com on mobile" },
  { label: "Schema Check", prompt: "Use validate_schema_on_page to check structured data on https://example.com" },
  { label: "Country Performance", prompt: "Use gsc_live_country_breakdown to show performance by country for the last 7 days" },
  { label: "Request Indexing", prompt: "Use request_indexing to submit https://example.com for re-indexing" },
  { label: "Technical Audit", prompt: "Run a comprehensive technical SEO audit on https://example.com" },
  { label: "Core Web Vitals", prompt: "Use core_web_vitals to check CrUX field data for https://example.com" },
  { label: "Full SEO Fix", prompt: "Run a full SEO analysis on example.com and autonomously fix any issues you find — create PRs for schema, meta tags, or headings as needed" },
];
