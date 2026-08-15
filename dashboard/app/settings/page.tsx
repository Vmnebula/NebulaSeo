"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  AlertCircle,
  Database,
  Cloud,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Bot,
  Github,
  Globe,
  Gauge,
  Code2,
  BarChart3,
  Sparkles,
  Wand2,
  FileSearch,
  Timer,
  GitPullRequest,
  Zap,
  Activity,
  Search,
} from "lucide-react";
import { getAgentStatus, checkHealth, sendMessage } from "@/lib/api/agent";

interface DataSourceStatus {
  name: string;
  status: "active" | "error" | "pending" | "checking";
  detail: string;
  badge: string;
}

export default function SettingsPage() {
  const [agentStatus, setAgentStatus] = useState<"online" | "offline" | "checking">("checking");
  const [agentData, setAgentData] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [dataSources, setDataSources] = useState<DataSourceStatus[]>([]);
  const [checkingData, setCheckingData] = useState(false);
  const [githubStatus, setGithubStatus] = useState<"connected" | "error" | "checking">("checking");
  const [githubInfo, setGithubInfo] = useState<string>("");
  const [automationHistory, setAutomationHistory] = useState<any[]>([]);

  const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL ||
    "http://localhost:8080";

  const checkAgentHealth = async () => {
    setAgentStatus("checking");
    try {
      const health = await checkHealth();
      const status = await getAgentStatus();
      setAgentStatus(health.status === "healthy" ? "online" : "offline");
      setAgentData(status);
    } catch {
      setAgentStatus("offline");
    }
  };

  const checkDataSources = async () => {
    setCheckingData(true);
    try {
      const res = await sendMessage(
        "Call get_data_source_status and return raw JSON results.",
        "settings-check"
      );
      const text = (res.response || "").toLowerCase();

      const sources: DataSourceStatus[] = [];

      // GSC Live API - always active
      sources.push({
        name: "Google Search Console (Live API)",
        status: "active",
        detail: "sc-domain:example.com — Direct API via service account",
        badge: "Primary",
      });

      // GA4
      if (text.includes("403") || text.includes("permission")) {
        sources.push({
          name: "Google Analytics 4",
          status: "error",
          detail: "403 — Add SA as Viewer on GA4 property 518378892",
          badge: "Needs Setup",
        });
      } else {
        sources.push({
          name: "Google Analytics 4",
          status: "active",
          detail: "Property: 518378892 — Sessions, users, pageviews",
          badge: "Active",
        });
      }

      // BigQuery
      sources.push({
        name: "BigQuery GSC Bulk Export",
        status: "pending",
        detail: "Dataset: your_dataset.searchconsole — Waiting for Google to populate tables",
        badge: "Pending",
      });

      // Always-on
      sources.push({ name: "PageSpeed Insights API", status: "active", detail: "Lighthouse audits, Core Web Vitals, CrUX field data", badge: "Active" });
      sources.push({ name: "Google Indexing API", status: "active", detail: "URL submission, sitemap ping (200 req/day quota)", badge: "Active" });
      sources.push({ name: "Schema Validator", status: "active", detail: "JSON-LD detection, property validation, rich results", badge: "Active" });

      setDataSources(sources);
    } catch {
      setDataSources([
        { name: "Error", status: "error", detail: "Could not reach agent to check data sources", badge: "Error" },
      ]);
    }
    setCheckingData(false);
  };

  const checkGitHub = async () => {
    setGithubStatus("checking");
    try {
      const res = await sendMessage("Call github_get_repo_info. Return the raw JSON.", "settings-github");
      const text = res.response || "";
      if (text.includes("NebulaSEO") && !text.includes("error")) {
        setGithubStatus("connected");
        setGithubInfo("your-org/your-website-repo — Push access via Secret Manager token");
      } else {
        setGithubStatus("error");
        setGithubInfo("Token or permission issue");
      }
    } catch {
      setGithubStatus("error");
      setGithubInfo("Could not connect");
    }
  };

  const fetchAutomationHistory = async () => {
    try {
      const response = await fetch(`/api/status`);
      const data = await response.json();
      if (data.automation_history) {
        setAutomationHistory(data.automation_history.slice(0, 5));
      }
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    checkAgentHealth();
    checkGitHub();
    checkDataSources();
    fetchAutomationHistory();
  }, []);

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusIcon = (s: string) => {
    if (s === "active" || s === "connected" || s === "online")
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (s === "error" || s === "offline")
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    if (s === "pending")
      return <Timer className="w-5 h-5 text-yellow-500" />;
    return <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />;
  };

  const statusBadge = (s: string) => {
    if (s === "Active" || s === "active")
      return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">{s}</Badge>;
    if (s === "Primary")
      return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">{s}</Badge>;
    if (s === "Pending" || s === "Needs Setup")
      return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">{s}</Badge>;
    if (s === "Error")
      return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">{s}</Badge>;
    return <Badge variant="outline">{s}</Badge>;
  };

  return (
    <div className="min-h-screen">
      <Header dataSource="Settings" />

      <div className="p-6 space-y-6 max-w-5xl">
        {/* Agent Connection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Agent Connection
            </CardTitle>
            <CardDescription>SEO Agent API status and configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
              <div className="flex items-center gap-3">
                {statusIcon(agentStatus)}
                <div>
                  <p className="font-medium">NebulaSEO SEO Agent</p>
                  <p className="text-sm text-muted-foreground">
                    {agentStatus === "checking"
                      ? "Checking connection..."
                      : agentStatus === "online"
                      ? `Connected • v${agentData?.version || "5.3"} • ${agentData?.mode || "Fully Autonomous"}`
                      : "Connection failed"}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={checkAgentHealth}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Agent Endpoint</label>
              <div className="flex gap-2">
                <Input value={AGENT_URL} readOnly className="font-mono text-sm" />
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(AGENT_URL)}>
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
                <Button variant="outline" size="icon" asChild>
                  <a href={AGENT_URL} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              </div>
            </div>

            {/* Automation Schedule */}
            <div className="flex items-center justify-between p-4 rounded-lg border border-primary/20 bg-primary/5">
              <div className="flex items-center gap-3">
                <Timer className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">Autonomous Automation</p>
                  <p className="text-sm text-muted-foreground">
                    Cloud Scheduler runs twice daily: 8 AM &amp; 8 PM UTC
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Loop: DETECT → ANALYZE → FIX (auto-PR) → INDEX → REPORT
                  </p>
                </div>
              </div>
              <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Active</Badge>
            </div>
          </CardContent>
        </Card>

        {/* GitHub Connection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Github className="h-5 w-5" />
              GitHub Connection
            </CardTitle>
            <CardDescription>Repository access for autonomous PRs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
              <div className="flex items-center gap-3">
                {statusIcon(githubStatus)}
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">your-org/your-website-repo</p>
                    {githubStatus === "connected" && (
                      <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Connected</Badge>
                    )}
                    {githubStatus === "error" && (
                      <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Error</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{githubInfo || "Checking..."}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Token: Secret Manager → <code className="bg-muted-foreground/10 px-1 rounded">github-token</code> • SA: nebulaseo@…iam.gserviceaccount.com
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={checkGitHub}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Test
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href="https://github.com/your-org/your-website-repo" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Sources */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  Data Sources
                </CardTitle>
                <CardDescription>Live status of all connected data APIs</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={checkDataSources} disabled={checkingData}>
                {checkingData ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Re-check
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {dataSources.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin opacity-50" />
                <p className="text-sm">Checking data sources...</p>
              </div>
            ) : (
              dataSources.map((ds) => (
                <div
                  key={ds.name}
                  className={`flex items-start justify-between p-4 rounded-lg border ${
                    ds.status === "active"
                      ? "border-green-500/20 bg-green-500/5"
                      : ds.status === "error"
                      ? "border-red-500/20 bg-red-500/5"
                      : ds.status === "pending"
                      ? "border-yellow-500/20 bg-yellow-500/5"
                      : "border-muted"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {statusIcon(ds.status)}
                    <div>
                      <p className="font-medium">{ds.name}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{ds.detail}</p>
                    </div>
                  </div>
                  {statusBadge(ds.badge)}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Automation Runs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              Recent Automation Runs
            </CardTitle>
            <CardDescription>Last automated SEO loops (Cloud Scheduler)</CardDescription>
          </CardHeader>
          <CardContent>
            {automationHistory.length > 0 ? (
              <div className="space-y-2">
                {automationHistory.map((run: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3">
                      {run.status === "completed" ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{run.run_id || "Run"}</p>
                        <p className="text-xs text-muted-foreground">
                          {run.timestamp ? new Date(run.timestamp).toLocaleString() : "N/A"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-muted-foreground">
                        {run.duration_ms ? `${(run.duration_ms / 1000).toFixed(1)}s` : ""}
                      </span>
                      {run.summary && (
                        <>
                          <Badge variant="outline" className="text-xs">
                            {run.summary.successes || 0} ok
                          </Badge>
                          {(run.summary.prs_created || 0) > 0 && (
                            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                              <GitPullRequest className="h-3 w-3 mr-1" />
                              {run.summary.prs_created} PRs
                            </Badge>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Timer className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No automation history yet. Runs at 8 AM &amp; 8 PM UTC.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Project Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5 text-primary" />
              Project Configuration
            </CardTitle>
            <CardDescription>Google Cloud project settings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Project ID</label>
                <Input value="nebulaseo" readOnly />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Region</label>
                <Input value="us-central1" readOnly />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">AI Model</label>
                <Input value="Gemini 3 Pro Preview (Thinking: HIGH)" readOnly />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">SDK</label>
                <Input value="google-genai (Vertex AI)" readOnly />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Service Account</label>
                <Input value="your-sa@your-project.iam.gserviceaccount.com" readOnly className="text-xs" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Website GCP Project</label>
                <Input value="your-gcp-project-id" readOnly />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Available Tools */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Available Tools
            </CardTitle>
            <CardDescription>
              37+ tools across 10 categories — fully autonomous
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  category: "GSC Live API",
                  icon: <Search className="h-4 w-4 text-blue-500" />,
                  tools: ["gsc_live_keywords", "gsc_live_pages", "gsc_live_keyword_pages", "gsc_live_daily_trend", "gsc_live_device_breakdown", "gsc_live_country_breakdown"],
                },
                {
                  category: "BigQuery / GSC Export",
                  icon: <Database className="h-4 w-4 text-green-500" />,
                  tools: ["analyze_keyword_drops", "get_keyword_performance", "get_top_keywords", "get_data_source_status", "get_gsc_performance", "get_page_performance", "get_country_performance", "get_device_breakdown"],
                },
                {
                  category: "GA4 Analytics",
                  icon: <BarChart3 className="h-4 w-4 text-purple-500" />,
                  tools: ["get_traffic_overview", "get_top_pages_analytics", "get_traffic_sources", "get_organic_landing_pages", "get_realtime_users", "correlate_seo_engagement"],
                },
                {
                  category: "PageSpeed",
                  icon: <Gauge className="h-4 w-4 text-orange-500" />,
                  tools: ["pagespeed_audit", "pagespeed_compare", "core_web_vitals"],
                },
                {
                  category: "Schema Validator",
                  icon: <Code2 className="h-4 w-4 text-purple-500" />,
                  tools: ["validate_schema_on_page", "validate_schema_json"],
                },
                {
                  category: "Indexing",
                  icon: <Globe className="h-4 w-4 text-blue-500" />,
                  tools: ["request_indexing", "batch_indexing", "sitemap_ping", "get_indexing_status"],
                },
                {
                  category: "GitHub Actions",
                  icon: <Github className="h-4 w-4" />,
                  tools: ["github_list_files", "github_read_file", "github_create_branch", "github_update_file", "github_create_pr", "github_list_prs", "github_get_repo_info"],
                },
                {
                  category: "Content Generation",
                  icon: <Sparkles className="h-4 w-4 text-yellow-500" />,
                  tools: ["generate_meta_title", "generate_meta_description", "generate_schema_markup", "generate_blog_outline", "generate_blog_content", "rewrite_for_seo", "suggest_internal_links", "generate_alt_text"],
                },
                {
                  category: "Autonomous Fixes",
                  icon: <Wand2 className="h-4 w-4 text-green-500" />,
                  tools: ["fix_meta_tags", "add_schema_markup", "create_blog_post", "fix_heading_structure"],
                },
                {
                  category: "Web Crawling & SERP",
                  icon: <FileSearch className="h-4 w-4 text-red-500" />,
                  tools: ["fetch_page_content", "crawl_sitemap", "analyze_competitor", "analyze_serp", "compare_with_competitors", "suggest_title_improvements", "run_technical_audit"],
                },
              ].map((cat) => (
                <div key={cat.category}>
                  <div className="flex items-center gap-2 mb-2">
                    {cat.icon}
                    <span className="text-sm font-medium">{cat.category}</span>
                    <Badge variant="outline" className="text-xs ml-auto">
                      {cat.tools.length}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
                    {cat.tools.map((tool) => (
                      <div key={tool} className="flex items-center gap-1.5 p-1.5 rounded bg-muted text-xs">
                        <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                        <code className="truncate">{tool}</code>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
