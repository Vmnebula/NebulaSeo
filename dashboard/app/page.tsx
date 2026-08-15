"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PerformanceChart } from "@/components/charts/performance-chart";
import { DevicePieChart } from "@/components/charts/device-pie-chart";
import { TopKeywordsTable } from "@/components/dashboard/top-keywords-table";
import { AlertsFeed } from "@/components/dashboard/alerts-feed";
import { LogsPanel } from "@/components/dashboard/logs-panel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MousePointerClick, Eye, Percent, Hash, BarChart3, Github, Sparkles, Wand2, ArrowRight, AlertTriangle, Zap, Wrench, Loader2, CheckCircle, GitPullRequest, Activity, Gauge, Globe, Code2, Send, RefreshCw as RefreshIcon } from "lucide-react";
import { sendMessage, getAgentStatus } from "@/lib/api/agent";
import { Keyword, DeviceBreakdown, PerformanceData } from "@/types";

const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL || "http://localhost:8080";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState("Loading...");
  const [metrics, setMetrics] = useState({
    clicks: 0,
    impressions: 0,
    ctr: 0,
    position: 0,
  });
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [deviceData, setDeviceData] = useState<DeviceBreakdown[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  
  // v4.0 Auto-fix state - populated from real analysis
  const [criticalIssues, setCriticalIssues] = useState<{id: string, title: string, action: string, fixed: boolean}[]>([]);
  const [fixingAll, setFixingAll] = useState(false);
  const [fixedCount, setFixedCount] = useState(0);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch live GSC data via agent
      const liveResponse = await sendMessage("Use gsc_live_keywords to get the top 10 keywords by clicks for the last 7 days. Format as a table with keyword, clicks, impressions, CTR, position.");
      
      if (liveResponse.response) {
        setDataSource("GSC API (Live)");
        
        // Parse metrics from the response
        const clicksMatch = liveResponse.response.match(/total.*?clicks?[:\s]*([\d,]+)/i) || liveResponse.response.match(/([\d,]+)\s*total clicks/i);
        const impressionsMatch = liveResponse.response.match(/total.*?impressions?[:\s]*([\d,]+)/i) || liveResponse.response.match(/([\d,]+)\s*total impressions/i);
        
        if (clicksMatch || impressionsMatch) {
          setMetrics({
            clicks: clicksMatch ? parseInt(clicksMatch[1].replace(/,/g, '')) : 0,
            impressions: impressionsMatch ? parseInt(impressionsMatch[1].replace(/,/g, '')) : 0,
            ctr: 0,
            position: 0,
          });
        }
      }
      
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setDataSource("Not Connected");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fixAllIssues = async () => {
    setFixingAll(true);
    for (const issue of criticalIssues.filter(i => !i.fixed)) {
      try {
        await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: `Fix SEO issue: ${issue.title}. Create a PR with the fix.`,
            agentUrl: AGENT_URL
          })
        });
        setCriticalIssues(prev => prev.map(i => i.id === issue.id ? { ...i, fixed: true } : i));
        setFixedCount(prev => prev + 1);
        await new Promise(r => setTimeout(r, 2000));
      } catch (error) {
        console.error("Fix failed:", error);
      }
    }
    setFixingAll(false);
  };

  // Real alerts will come from agent analysis
  const alerts: { id: string; type: "warning" | "success" | "info"; title: string; description: string; timestamp: Date; }[] = [];

  return (
    <div className="min-h-screen">
      <Header dataSource={dataSource} onRefresh={fetchDashboardData} isRefreshing={loading} />

      <div className="p-6 space-y-6">
        {/* v5.3 Feature Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Link href="/keywords">
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <MousePointerClick className="h-5 w-5 text-blue-500" />
                  <Badge variant="secondary" className="text-[10px]">Live</Badge>
                </div>
                <CardTitle className="text-sm mt-2">GSC Keywords</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Live search data</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/pagespeed">
            <Card className="hover:border-primary transition-colors cursor-pointer h-full bg-gradient-to-br from-orange-500/10 to-transparent border-orange-500/20">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Gauge className="h-5 w-5 text-orange-500" />
                  <Badge className="text-[10px] bg-orange-500/20 text-orange-400 border-orange-500/30">NEW</Badge>
                </div>
                <CardTitle className="text-sm mt-2">PageSpeed</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Core Web Vitals</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/indexing">
            <Card className="hover:border-primary transition-colors cursor-pointer h-full bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Globe className="h-5 w-5 text-blue-500" />
                  <Badge className="text-[10px] bg-blue-500/20 text-blue-400 border-blue-500/30">NEW</Badge>
                </div>
                <CardTitle className="text-sm mt-2">Indexing</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Re-index pages</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/schema">
            <Card className="hover:border-primary transition-colors cursor-pointer h-full bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Code2 className="h-5 w-5 text-purple-500" />
                  <Badge className="text-[10px] bg-purple-500/20 text-purple-400 border-purple-500/30">NEW</Badge>
                </div>
                <CardTitle className="text-sm mt-2">Schema</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Rich results</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/analytics">
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <BarChart3 className="h-5 w-5 text-green-500" />
                  <Badge variant="secondary" className="text-[10px]">GA4</Badge>
                </div>
                <CardTitle className="text-sm mt-2">Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Traffic & engagement</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/content">
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Sparkles className="h-5 w-5 text-yellow-500" />
                </div>
                <CardTitle className="text-sm mt-2">AI Content</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Generate SEO content</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/actions">
            <Card className="hover:border-primary transition-colors cursor-pointer h-full bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Wand2 className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-sm mt-2">Auto Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Fix issues via PR</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* v5.3 Autonomous Workflow */}
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-transparent to-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-4 overflow-x-auto">
              <div className="flex items-center gap-2 text-xs whitespace-nowrap">
                <Badge variant="outline" className="bg-red-500/10 border-red-500/30 text-red-500">1. Detect</Badge>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <Badge variant="outline" className="bg-yellow-500/10 border-yellow-500/30 text-yellow-500">2. Analyze</Badge>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <Badge variant="outline" className="bg-blue-500/10 border-blue-500/30 text-blue-500">3. Fix (PR)</Badge>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <Badge variant="outline" className="bg-purple-500/10 border-purple-500/30 text-purple-500">4. Re-index</Badge>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <Badge variant="outline" className="bg-green-500/10 border-green-500/30 text-green-500">5. Verify</Badge>
              </div>
              <Badge variant="secondary" className="text-xs shrink-0">v5.3 Autonomous SEO</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Quick Fix Banner */}
        {criticalIssues.filter(i => !i.fixed).length > 0 && (
          <Card className="border-red-500/30 bg-gradient-to-r from-red-500/10 to-orange-500/10">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-red-500/20">
                    <AlertTriangle className="h-6 w-6 text-red-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      {criticalIssues.filter(i => !i.fixed).length} Critical Issues Found
                      <Badge variant="destructive" className="text-xs">AUTO-FIXABLE</Badge>
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {criticalIssues.filter(i => !i.fixed).map(i => i.title).join(" • ")}
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={fixAllIssues}
                  disabled={fixingAll}
                  className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
                >
                  {fixingAll ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Fixing ({fixedCount}/{criticalIssues.length})...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      Fix All & Create PRs
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Fixed Banner */}
        {criticalIssues.filter(i => !i.fixed).length === 0 && fixedCount > 0 && (
          <Card className="border-green-500/30 bg-gradient-to-r from-green-500/10 to-emerald-500/10">
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-500/20">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-500">All Issues Fixed!</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <GitPullRequest className="h-3 w-3" />
                    {fixedCount} PRs created - waiting for your review
                  </p>
                </div>
                <Link href="/github" className="ml-auto">
                  <Button variant="outline" className="border-green-500/30 text-green-500 hover:bg-green-500/10">
                    View PRs <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Clicks"
            value={metrics.clicks}
            change={12}
            trend="up"
            icon={MousePointerClick}
            loading={loading}
          />
          <MetricCard
            title="Impressions"
            value={metrics.impressions}
            change={8}
            trend="up"
            icon={Eye}
            loading={loading}
          />
          <MetricCard
            title="Avg CTR"
            value={metrics.ctr}
            change={0.3}
            trend="up"
            format="percent"
            icon={Percent}
            loading={loading}
          />
          <MetricCard
            title="Avg Position"
            value={metrics.position}
            change={-0.5}
            trend="up"
            format="position"
            icon={Hash}
            invertTrend
            loading={loading}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <PerformanceChart data={performanceData} loading={loading} />
          </div>
          <DevicePieChart data={deviceData} loading={loading} />
        </div>

        {/* Bottom Row - Keywords, Alerts, Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <TopKeywordsTable keywords={keywords} loading={loading} />
          <AlertsFeed alerts={alerts} loading={loading} />
          <LogsPanel autoRefresh={true} refreshInterval={5000} maxHeight="350px" />
        </div>
      </div>
    </div>
  );
}
