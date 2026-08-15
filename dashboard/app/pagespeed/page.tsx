'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Gauge,
  Smartphone,
  Monitor,
  Loader2,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  ArrowRight,
  TrendingUp,
  Eye,
  BarChart3,
} from 'lucide-react';

interface CWVMetric {
  name: string;
  value: string;
  rating: 'good' | 'needs-improvement' | 'poor';
  threshold: { good: string; poor: string };
}

interface LighthouseScore {
  category: string;
  score: number;
  icon: React.ReactNode;
}

interface Opportunity {
  title: string;
  savings: string;
  description: string;
}

export default function PageSpeedPage() {
  const [url, setUrl] = useState('https://example.com');
  const [strategy, setStrategy] = useState<'mobile' | 'desktop'>('mobile');
  const [loading, setLoading] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [compareUrl, setCompareUrl] = useState('');
  const [result, setResult] = useState<string>('');
  const [compareResult, setCompareResult] = useState<string>('');
  const [cwvResult, setCwvResult] = useState<string>('');
  const [scores, setScores] = useState<LighthouseScore[]>([]);
  const [cwvMetrics, setCwvMetrics] = useState<CWVMetric[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [hasRun, setHasRun] = useState(false);

  const parseScoresFromResponse = (response: string) => {
    const perfMatch = response.match(/performance[:\s]*(\d+)/i);
    const seoMatch = response.match(/seo[:\s]*(\d+)/i);
    const a11yMatch = response.match(/accessibility[:\s]*(\d+)/i);
    const bpMatch = response.match(/best.?practices?[:\s]*(\d+)/i);

    const parsed: LighthouseScore[] = [];
    if (perfMatch) parsed.push({ category: 'Performance', score: parseInt(perfMatch[1]), icon: <Zap className="h-6 w-6" /> });
    if (seoMatch) parsed.push({ category: 'SEO', score: parseInt(seoMatch[1]), icon: <TrendingUp className="h-6 w-6" /> });
    if (a11yMatch) parsed.push({ category: 'Accessibility', score: parseInt(a11yMatch[1]), icon: <Eye className="h-6 w-6" /> });
    if (bpMatch) parsed.push({ category: 'Best Practices', score: parseInt(bpMatch[1]), icon: <CheckCircle className="h-6 w-6" /> });
    
    return parsed;
  };

  const parseCWVFromResponse = (response: string) => {
    const metrics: CWVMetric[] = [];
    
    const lcpMatch = response.match(/LCP[:\s]*([\d.]+)\s*(?:ms|s)/i);
    const fidMatch = response.match(/FID[:\s]*([\d.]+)\s*ms/i);
    const clsMatch = response.match(/CLS[:\s]*([\d.]+)/i);
    const inpMatch = response.match(/INP[:\s]*([\d.]+)\s*ms/i);
    const fcpMatch = response.match(/FCP[:\s]*([\d.]+)\s*(?:ms|s)/i);
    const ttfbMatch = response.match(/TTFB[:\s]*([\d.]+)\s*(?:ms|s)/i);

    if (lcpMatch) {
      const val = parseFloat(lcpMatch[1]);
      metrics.push({ name: 'LCP', value: `${val}s`, rating: val <= 2.5 ? 'good' : val <= 4.0 ? 'needs-improvement' : 'poor', threshold: { good: '≤2.5s', poor: '>4.0s' } });
    }
    if (fcpMatch) {
      const val = parseFloat(fcpMatch[1]);
      metrics.push({ name: 'FCP', value: `${val}s`, rating: val <= 1.8 ? 'good' : val <= 3.0 ? 'needs-improvement' : 'poor', threshold: { good: '≤1.8s', poor: '>3.0s' } });
    }
    if (inpMatch) {
      const val = parseFloat(inpMatch[1]);
      metrics.push({ name: 'INP', value: `${val}ms`, rating: val <= 200 ? 'good' : val <= 500 ? 'needs-improvement' : 'poor', threshold: { good: '≤200ms', poor: '>500ms' } });
    }
    if (clsMatch) {
      const val = parseFloat(clsMatch[1]);
      metrics.push({ name: 'CLS', value: `${val}`, rating: val <= 0.1 ? 'good' : val <= 0.25 ? 'needs-improvement' : 'poor', threshold: { good: '≤0.1', poor: '>0.25' } });
    }
    if (ttfbMatch) {
      const val = parseFloat(ttfbMatch[1]);
      metrics.push({ name: 'TTFB', value: `${val}ms`, rating: val <= 800 ? 'good' : val <= 1800 ? 'needs-improvement' : 'poor', threshold: { good: '≤800ms', poor: '>1800ms' } });
    }
    if (fidMatch) {
      const val = parseFloat(fidMatch[1]);
      metrics.push({ name: 'FID', value: `${val}ms`, rating: val <= 100 ? 'good' : val <= 300 ? 'needs-improvement' : 'poor', threshold: { good: '≤100ms', poor: '>300ms' } });
    }

    return metrics;
  };

  const runAudit = async () => {
    if (!url) return;
    setLoading(true);
    setHasRun(true);
    setScores([]);
    setCwvMetrics([]);
    setOpportunities([]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Use pagespeed_audit to analyze ${url} on ${strategy}. Show performance, SEO, accessibility, best practices scores, Core Web Vitals (LCP, FCP, INP, CLS, TTFB), and top optimization opportunities with estimated savings.`,
          session_id: `pagespeed-${Date.now()}`,
        }),
      });

      const data = await response.json();
      setResult(data.response || '');

      const parsed = parseScoresFromResponse(data.response || '');
      if (parsed.length > 0) setScores(parsed);

      const cwv = parseCWVFromResponse(data.response || '');
      if (cwv.length > 0) setCwvMetrics(cwv);
    } catch (error) {
      console.error('PageSpeed audit error:', error);
      setResult('Error running PageSpeed audit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const runCWVCheck = async () => {
    if (!url) return;
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Use core_web_vitals to check CrUX field data for ${url}. Show all available metrics with their ratings.`,
          session_id: `cwv-${Date.now()}`,
        }),
      });

      const data = await response.json();
      setCwvResult(data.response || '');

      const cwv = parseCWVFromResponse(data.response || '');
      if (cwv.length > 0) setCwvMetrics(cwv);
    } catch (error) {
      console.error('CWV check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const runCompare = async () => {
    if (!url || !compareUrl) return;
    setComparing(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Use pagespeed_compare to compare ${url} vs ${compareUrl} on ${strategy}. Show scores and Web Vitals side by side.`,
          session_id: `pagespeed-compare-${Date.now()}`,
        }),
      });

      const data = await response.json();
      setCompareResult(data.response || '');
    } catch (error) {
      console.error('Compare error:', error);
    } finally {
      setComparing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return 'bg-green-500/10 border-green-500/30';
    if (score >= 50) return 'bg-yellow-500/10 border-yellow-500/30';
    return 'bg-red-500/10 border-red-500/30';
  };

  const getScoreRing = (score: number) => {
    if (score >= 90) return 'ring-green-500';
    if (score >= 50) return 'ring-yellow-500';
    return 'ring-red-500';
  };

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'good': return 'text-green-500 bg-green-500/10 border-green-500/30';
      case 'needs-improvement': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
      case 'poor': return 'text-red-500 bg-red-500/10 border-red-500/30';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Gauge className="h-8 w-8 text-orange-500" />
              PageSpeed Insights
            </h1>
            <p className="text-muted-foreground mt-1">
              Core Web Vitals, Lighthouse scores, and performance optimization
            </p>
          </div>
          <Badge variant="secondary" className="text-xs">v5.3 — Google PSI API</Badge>
        </div>

        {/* URL Input + Strategy Toggle */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Input
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="pr-4"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={strategy === 'mobile' ? 'default' : 'outline'}
                  onClick={() => setStrategy('mobile')}
                  size="sm"
                >
                  <Smartphone className="h-4 w-4 mr-1" />
                  Mobile
                </Button>
                <Button
                  variant={strategy === 'desktop' ? 'default' : 'outline'}
                  onClick={() => setStrategy('desktop')}
                  size="sm"
                >
                  <Monitor className="h-4 w-4 mr-1" />
                  Desktop
                </Button>
              </div>
              <Button onClick={runAudit} disabled={loading || !url}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Gauge className="mr-2 h-4 w-4" />}
                Analyze
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lighthouse Score Circles */}
        {scores.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {scores.map((s) => (
              <Card key={s.category} className={`${getScoreBg(s.score)} border`}>
                <CardContent className="pt-6 flex flex-col items-center">
                  <div className={`w-20 h-20 rounded-full ring-4 ${getScoreRing(s.score)} flex items-center justify-center mb-3 bg-background`}>
                    <span className={`text-2xl font-bold ${getScoreColor(s.score)}`}>{s.score}</span>
                  </div>
                  <p className="text-sm font-medium">{s.category}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Core Web Vitals */}
        {cwvMetrics.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                Core Web Vitals
              </CardTitle>
              <CardDescription>Real performance metrics that affect ranking</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {cwvMetrics.map((metric) => (
                  <div key={metric.name} className={`p-4 rounded-lg border ${getRatingColor(metric.rating)}`}>
                    <div className="text-xs font-medium uppercase opacity-70 mb-1">{metric.name}</div>
                    <div className="text-2xl font-bold">{metric.value}</div>
                    <div className="text-xs mt-1 capitalize">{metric.rating.replace('-', ' ')}</div>
                    <div className="text-xs opacity-50 mt-0.5">Good: {metric.threshold.good}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="audit" className="space-y-4">
          <TabsList>
            <TabsTrigger value="audit">Full Audit</TabsTrigger>
            <TabsTrigger value="cwv">Field Data (CrUX)</TabsTrigger>
            <TabsTrigger value="compare">Compare</TabsTrigger>
          </TabsList>

          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <CardTitle>Lighthouse Audit Results</CardTitle>
                <CardDescription>Lab data from PageSpeed Insights API</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Loader2 className="h-10 w-10 animate-spin text-orange-500 mb-4" />
                    <p className="text-muted-foreground">Running Lighthouse audit on {strategy}...</p>
                    <p className="text-xs text-muted-foreground mt-1">This may take 15-30 seconds</p>
                  </div>
                ) : result ? (
                  <div className="prose dark:prose-invert max-w-none">
                    <div className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg max-h-[500px] overflow-y-auto">
                      {result}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16 text-muted-foreground">
                    <Gauge className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <h3 className="text-lg font-semibold mb-2">No Audit Results Yet</h3>
                    <p className="text-sm">Enter a URL and click Analyze to run a PageSpeed audit</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cwv">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Chrome UX Report (CrUX) Field Data</CardTitle>
                    <CardDescription>Real user experience data collected by Chrome — this is what Google uses for ranking</CardDescription>
                  </div>
                  <Button onClick={runCWVCheck} disabled={loading || !url} variant="outline" size="sm">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                    Load Field Data
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {cwvResult ? (
                  <div className="prose dark:prose-invert max-w-none">
                    <div className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg max-h-[500px] overflow-y-auto">
                      {cwvResult}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16 text-muted-foreground">
                    <Clock className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <h3 className="text-lg font-semibold mb-2">No Field Data Loaded</h3>
                    <p className="text-sm">Click "Load Field Data" to fetch CrUX metrics</p>
                    <p className="text-xs mt-2 opacity-70">Note: CrUX data requires sufficient traffic volume</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compare">
            <Card>
              <CardHeader>
                <CardTitle>Compare PageSpeed</CardTitle>
                <CardDescription>Compare your site performance against a competitor</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-1 block">Your URL</label>
                    <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground mb-2" />
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-1 block">Competitor URL</label>
                    <Input value={compareUrl} onChange={(e) => setCompareUrl(e.target.value)} placeholder="https://competitor.com" />
                  </div>
                  <Button onClick={runCompare} disabled={comparing || !url || !compareUrl}>
                    {comparing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BarChart3 className="mr-2 h-4 w-4" />}
                    Compare
                  </Button>
                </div>
                {compareResult ? (
                  <div className="prose dark:prose-invert max-w-none">
                    <div className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg max-h-[500px] overflow-y-auto">
                      {compareResult}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p className="text-sm">Enter two URLs and click Compare</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        {!hasRun && (
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <div className="text-center">
                <Gauge className="h-12 w-12 text-orange-500 mx-auto mb-3 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">PageSpeed Insights</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Powered by Google PageSpeed Insights API. Provides Lighthouse scores, Core Web Vitals, and actionable optimization recommendations.
                </p>
                <div className="flex gap-2 justify-center flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    <Zap className="h-3 w-3 mr-1" /> Performance
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <Eye className="h-3 w-3 mr-1" /> Accessibility
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <TrendingUp className="h-3 w-3 mr-1" /> SEO
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <CheckCircle className="h-3 w-3 mr-1" /> Best Practices
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
