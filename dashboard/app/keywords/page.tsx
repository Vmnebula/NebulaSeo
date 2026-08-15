"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpDown,
  ExternalLink,
  Filter,
  Wand2,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Sparkles,
  Target,
  RefreshCw,
} from "lucide-react";
import { Keyword } from "@/types";
import { formatNumber, cn } from "@/lib/utils";

interface SEOIssue {
  id: string;
  type: 'critical' | 'warning' | 'opportunity';
  keyword: string;
  issue: string;
  recommendation: string;
  action: string;
  filePath?: string;
}

// Parse keywords from agent's text response
function parseKeywordsFromResponse(response: string): Keyword[] {
  const keywords: Keyword[] = [];
  const lines = response.split('\n');
  
  for (const line of lines) {
    // Skip header rows and separator rows
    if (line.includes('Keyword') && line.includes('Clicks')) continue;
    if (line.match(/^[\s|:-]+$/)) continue;
    
    // Try to parse markdown table format: | **keyword** | 123 | 456 | 3.5% | 7.2 |
    const tableMatch = line.match(/\|\s*\*\*([^*|]+)\*\*\s*\|\s*([\d,]+)\s*\|\s*([\d,]+)\s*\|\s*([\d.]+)%?\s*\|\s*([\d.]+)\s*\|?/);
    if (tableMatch) {
      keywords.push({
        keyword: tableMatch[1].trim(),
        clicks: parseInt(tableMatch[2].replace(/,/g, '')),
        impressions: parseInt(tableMatch[3].replace(/,/g, '')),
        ctr: parseFloat(tableMatch[4]) / 100,
        position: parseFloat(tableMatch[5]),
        trend: parseFloat(tableMatch[5]) <= 10 ? 'up' : parseFloat(tableMatch[5]) > 20 ? 'down' : 'neutral',
      });
      continue;
    }
    
    // Try alternate table format without bold: | keyword | 123 | 456 | 3.5% | 7.2 |
    const simpleTblMatch = line.match(/\|\s*([^|]+)\s*\|\s*([\d,]+)\s*\|\s*([\d,]+)\s*\|\s*([\d.]+)%?\s*\|\s*([\d.]+)\s*\|?/);
    if (simpleTblMatch && !simpleTblMatch[1].includes(':')) {
      const kw = simpleTblMatch[1].replace(/\*\*/g, '').trim();
      if (kw && !kw.toLowerCase().includes('keyword')) {
        keywords.push({
          keyword: kw,
          clicks: parseInt(simpleTblMatch[2].replace(/,/g, '')),
          impressions: parseInt(simpleTblMatch[3].replace(/,/g, '')),
          ctr: parseFloat(simpleTblMatch[4]) / 100,
          position: parseFloat(simpleTblMatch[5]),
          trend: parseFloat(simpleTblMatch[5]) <= 10 ? 'up' : parseFloat(simpleTblMatch[5]) > 20 ? 'down' : 'neutral',
        });
        continue;
      }
    }
    
    // Try list format: 1. **keyword** (213 clicks, Avg. Pos 7.7) or **keyword** - Clicks: 123
    const keywordMatch = line.match(/\*\*([^*]+)\*\*/);
    if (!keywordMatch) continue;
    
    const keyword = keywordMatch[1].trim();
    
    // Extract numbers with flexible patterns
    const clicksMatch = line.match(/(\d[\d,]*)\s*clicks?/i) || line.match(/clicks?[:\s]+(\d[\d,]*)/i);
    const impressionsMatch = line.match(/(\d[\d,]*)\s*impressions?/i) || line.match(/impressions?[:\s]+(\d[\d,]*)/i);
    const positionMatch = line.match(/(?:avg\.?\s*)?pos(?:ition)?[:\s]+(\d+\.?\d*)/i) || line.match(/(\d+\.?\d*)\s*(?:avg\.?\s*)?pos/i);
    const ctrMatch = line.match(/ctr[:\s]+(\d+\.?\d*)%?/i) || line.match(/(\d+\.?\d*)%\s*(?:ctr)?/i);
    
    const clicks = clicksMatch ? parseInt(clicksMatch[1].replace(/,/g, '')) : 0;
    const impressions = impressionsMatch ? parseInt(impressionsMatch[1].replace(/,/g, '')) : 0;
    const position = positionMatch ? parseFloat(positionMatch[1]) : 0;
    const ctr = ctrMatch ? parseFloat(ctrMatch[1]) / 100 : (impressions > 0 ? clicks / impressions : 0);
    
    if (keyword && (clicks > 0 || impressions > 0)) {
      keywords.push({
        keyword,
        clicks,
        impressions,
        ctr,
        position,
        trend: position <= 10 ? 'up' : position > 20 ? 'down' : 'neutral',
      });
    }
  }
  
  return keywords;
}

export default function KeywordsPage() {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [filteredKeywords, setFilteredKeywords] = useState<Keyword[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"clicks" | "impressions" | "ctr" | "position">("clicks");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [issues, setIssues] = useState<SEOIssue[]>([]);
  const [fixingIssue, setFixingIssue] = useState<string | null>(null);
  const [fixResult, setFixResult] = useState<string>('');
  const [agentResponse, setAgentResponse] = useState<string>('');

  useEffect(() => {
    loadKeywords();
  }, []);

  const loadKeywords = async () => {
    setLoading(true);
    setAgentResponse('');
    try {
      // Fetch live keywords via GSC API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: 'Use gsc_live_keywords to get the top 20 keywords by clicks for the last 7 days. Format as a table with keyword, clicks, impressions, CTR percentage, and position.',
          session_id: `keywords-${Date.now()}` 
        }),
      });
      const data = await response.json();
      setAgentResponse(data.response || '');
      
      // Try to parse keywords from the response
      const parsedKeywords = parseKeywordsFromResponse(data.response || '');
      setKeywords(parsedKeywords);
      setFilteredKeywords(parsedKeywords);
      
      // Auto-analyze if we got keywords
      if (parsedKeywords.length > 0) {
        analyzeKeywords(parsedKeywords);
      }
    } catch (error) {
      console.error('Error loading keywords:', error);
      setKeywords([]);
      setFilteredKeywords([]);
      setAgentResponse('Error loading keywords. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const analyzeKeywords = async (keywordData: Keyword[]) => {
    setAnalyzing(true);
    const detectedIssues: SEOIssue[] = [];

    keywordData.forEach((kw, idx) => {
      if (kw.ctr < 0.035 && kw.impressions > 500) {
        detectedIssues.push({
          id: `ctr-${idx}`,
          type: 'critical',
          keyword: kw.keyword,
          issue: `Low CTR (${(kw.ctr * 100).toFixed(1)}%) despite ${kw.impressions} impressions`,
          recommendation: `Optimize meta title and description for "${kw.keyword}"`,
          action: 'fix_meta_tags',
          filePath: `website/src/app${kw.url || ''}/page.tsx`,
        });
      }

      if (kw.trend === 'down') {
        detectedIssues.push({
          id: `trend-${idx}`,
          type: 'warning',
          keyword: kw.keyword,
          issue: `Ranking declining for "${kw.keyword}"`,
          recommendation: `Create fresh content or blog post targeting this keyword`,
          action: 'create_blog_post',
        });
      }

      if (kw.position > 10 && kw.position <= 20) {
        detectedIssues.push({
          id: `position-${idx}`,
          type: 'opportunity',
          keyword: kw.keyword,
          issue: `"${kw.keyword}" at position ${kw.position.toFixed(1)} (striking distance!)`,
          recommendation: `Optimize content to push into top 10`,
          action: 'fix_meta_tags',
          filePath: `website/src/app${kw.url || ''}/page.tsx`,
        });
      }
    });

    setIssues(detectedIssues);
    setAnalyzing(false);
  };

  const autoFixIssue = async (issue: SEOIssue) => {
    setFixingIssue(issue.id);
    setFixResult('');

    try {
      let message = '';
      
      if (issue.action === 'fix_meta_tags' && issue.filePath) {
        message = `Use the fix_meta_tags tool to optimize meta tags for the page. Target keyword: "${issue.keyword}". File path: ${issue.filePath}. Page URL: https://example.com${issue.filePath.replace('website/src/app', '').replace('/page.tsx', '')}. Issues to fix: improve_title,improve_meta_description`;
      } else if (issue.action === 'create_blog_post') {
        const slug = issue.keyword.toLowerCase().replace(/\s+/g, '-');
        message = `Use the create_blog_post tool to create a new blog post. Topic: "${issue.keyword} - Complete Guide 2026". Keywords: ${issue.keyword}, ${issue.keyword.split(' ').slice(0, 2).join(' ')} dubai, ${issue.keyword} uae. Slug: ${slug}-guide`;
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, session_id: `keyword-fix-${Date.now()}` }),
      });

      const data = await response.json();
      setFixResult(data.response);
      setIssues(prev => prev.filter(i => i.id !== issue.id));
    } catch (error) {
      setFixResult('Error creating fix. Please try again.');
    } finally {
      setFixingIssue(null);
    }
  };

  const fixAllIssues = async () => {
    for (const issue of issues.filter(i => i.type === 'critical')) {
      await autoFixIssue(issue);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  };

  useEffect(() => {
    let filtered = keywords.filter((k) =>
      k.keyword.toLowerCase().includes(searchQuery.toLowerCase())
    );
    filtered.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      return sortOrder === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    setFilteredKeywords(filtered);
  }, [keywords, searchQuery, sortBy, sortOrder]);

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  const getTrendIcon = (trend?: "up" | "down" | "neutral") => {
    switch (trend) {
      case "up": return <TrendingUp className="w-4 h-4 text-green-500" />;
      case "down": return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const SortButton = ({ column, label }: { column: typeof sortBy; label: string }) => (
    <Button variant="ghost" size="sm" className="h-8 px-2 hover:bg-transparent" onClick={() => handleSort(column)}>
      {label}
      <ArrowUpDown className={cn("ml-1 h-3 w-3", sortBy === column && "text-primary")} />
    </Button>
  );

  const criticalCount = issues.filter(i => i.type === 'critical').length;
  const warningCount = issues.filter(i => i.type === 'warning').length;
  const opportunityCount = issues.filter(i => i.type === 'opportunity').length;

  return (
    <div className="min-h-screen">
      <Header dataSource="GSC API (Live)" />
      <div className="p-6 space-y-6">
        {/* Page Header with Refresh */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Keywords Performance</h1>
            <p className="text-muted-foreground mt-1">
              Live keyword rankings from Google Search Console API
            </p>
          </div>
          <Button onClick={loadKeywords} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>

        {/* v4.0 Auto-Analysis Panel */}
        <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">AI Keyword Analysis</CardTitle>
                <Badge variant="secondary">v5.3</Badge>
              </div>
              <div className="flex items-center gap-2">
                {criticalCount > 0 && (
                  <Button onClick={fixAllIssues} disabled={fixingIssue !== null} size="sm">
                    <Wand2 className="mr-2 h-4 w-4" />
                    Fix All Critical ({criticalCount})
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => analyzeKeywords(keywords)} disabled={analyzing}>
                  {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <CardDescription>Auto-detected issues with one-click PR fixes</CardDescription>
          </CardHeader>
          <CardContent>
            {analyzing ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing keywords for SEO opportunities...
              </div>
            ) : issues.length === 0 ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                No critical issues found. Keywords are well optimized!
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2 mb-4">
                  {criticalCount > 0 && <Badge variant="destructive">{criticalCount} Critical</Badge>}
                  {warningCount > 0 && <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">{warningCount} Warnings</Badge>}
                  {opportunityCount > 0 && <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30">{opportunityCount} Opportunities</Badge>}
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {issues.map((issue) => (
                    <div key={issue.id} className={cn(
                      "flex items-center justify-between p-3 rounded-lg border",
                      issue.type === 'critical' && "border-red-500/30 bg-red-500/5",
                      issue.type === 'warning' && "border-yellow-500/30 bg-yellow-500/5",
                      issue.type === 'opportunity' && "border-blue-500/30 bg-blue-500/5"
                    )}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {issue.type === 'critical' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                          {issue.type === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                          {issue.type === 'opportunity' && <TrendingUp className="h-4 w-4 text-blue-500" />}
                          <span className="font-medium text-sm">{issue.issue}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{issue.recommendation}</p>
                      </div>
                      <Button size="sm" variant={issue.type === 'critical' ? 'default' : 'outline'} onClick={() => autoFixIssue(issue)} disabled={fixingIssue !== null} className="ml-4">
                        {fixingIssue === issue.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Wand2 className="mr-1 h-3 w-3" />Auto Fix</>}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {fixResult && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <pre className="text-xs whitespace-pre-wrap max-h-[200px] overflow-y-auto">{fixResult}</pre>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search keywords..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          <Button variant="outline"><Filter className="w-4 h-4 mr-2" />Filters</Button>
        </div>

        {/* Keywords Table */}
        <Card>
          <CardHeader><CardTitle>All Keywords ({filteredKeywords.length})</CardTitle></CardHeader>
          <CardContent>
            {filteredKeywords.length === 0 && !loading && agentResponse ? (
              <div className="prose dark:prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg">
                  {agentResponse}
                </div>
              </div>
            ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Keyword</th>
                    <th className="text-right py-3 px-4"><SortButton column="clicks" label="Clicks" /></th>
                    <th className="text-right py-3 px-4"><SortButton column="impressions" label="Impressions" /></th>
                    <th className="text-right py-3 px-4"><SortButton column="ctr" label="CTR" /></th>
                    <th className="text-right py-3 px-4"><SortButton column="position" label="Position" /></th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Trend</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} className="py-8 text-center text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />Loading keywords from GSC API...</td></tr>
                  ) : filteredKeywords.map((kw, index) => (
                    <tr key={index} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{kw.keyword}</span>
                          {kw.url && <a href={`https://example.com${kw.url}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary"><ExternalLink className="w-3 h-3" /></a>}
                        </div>
                        {kw.url && <span className="text-xs text-muted-foreground">{kw.url}</span>}
                      </td>
                      <td className="py-3 px-4 text-right font-medium">{formatNumber(kw.clicks)}</td>
                      <td className="py-3 px-4 text-right text-muted-foreground">{formatNumber(kw.impressions)}</td>
                      <td className="py-3 px-4 text-right"><span className={cn(kw.ctr >= 0.04 && "text-green-500", kw.ctr < 0.03 && "text-red-500")}>{(kw.ctr * 100).toFixed(1)}%</span></td>
                      <td className="py-3 px-4 text-right"><span className={cn(kw.position <= 3 && "text-green-500 font-medium", kw.position > 10 && "text-red-500")}>{kw.position.toFixed(1)}</span></td>
                      <td className="py-3 px-4 text-center">{getTrendIcon(kw.trend)}</td>
                      <td className="py-3 px-4 text-center">
                        <Button variant="ghost" size="sm" onClick={() => autoFixIssue({ id: `manual-${index}`, type: 'opportunity', keyword: kw.keyword, issue: `Optimize "${kw.keyword}"`, recommendation: 'Improve meta tags', action: 'fix_meta_tags', filePath: `website/src/app${kw.url || ''}/page.tsx` })} disabled={fixingIssue !== null}>
                          <Wand2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
