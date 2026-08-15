'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Globe,
  Send,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
  MapPin,
  Clock,
  ArrowRight,
  Link2,
  FileText,
} from 'lucide-react';

interface IndexResult {
  url: string;
  status: 'success' | 'error' | 'pending';
  message: string;
}

export default function IndexingPage() {
  const [singleUrl, setSingleUrl] = useState('');
  const [batchUrls, setBatchUrls] = useState('');
  const [sitemapUrl, setSitemapUrl] = useState('https://example.com/sitemap.xml');
  const [statusUrl, setStatusUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<IndexResult[]>([]);
  const [response, setResponse] = useState('');
  const [sitemapResponse, setSitemapResponse] = useState('');
  const [statusResponse, setStatusResponse] = useState('');
  const [recentSubmissions, setRecentSubmissions] = useState<IndexResult[]>([]);

  const requestIndexing = async () => {
    if (!singleUrl) return;
    setLoading(true);
    setResponse('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Use request_indexing to submit ${singleUrl} for re-indexing with type URL_UPDATED`,
          session_id: `indexing-${Date.now()}`,
        }),
      });

      const data = await res.json();
      setResponse(data.response || '');

      const newResult: IndexResult = {
        url: singleUrl,
        status: data.response?.toLowerCase().includes('error') ? 'error' : 'success',
        message: data.response?.slice(0, 200) || 'Submitted',
      };
      setRecentSubmissions(prev => [newResult, ...prev.slice(0, 19)]);
    } catch (error) {
      console.error('Indexing error:', error);
      setResponse('Error submitting URL for indexing.');
    } finally {
      setLoading(false);
    }
  };

  const batchIndex = async () => {
    const urls = batchUrls.split('\n').map(u => u.trim()).filter(Boolean);
    if (urls.length === 0) return;
    setLoading(true);
    setResponse('');

    try {
      const urlList = urls.join(', ');
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Use batch_indexing to submit these URLs for re-indexing: ${urlList}`,
          session_id: `batch-indexing-${Date.now()}`,
        }),
      });

      const data = await res.json();
      setResponse(data.response || '');

      const newResults: IndexResult[] = urls.map(u => ({
        url: u,
        status: data.response?.toLowerCase().includes('error') ? 'error' : 'success',
        message: 'Batch submitted',
      }));
      setRecentSubmissions(prev => [...newResults, ...prev.slice(0, 19 - newResults.length)]);
    } catch (error) {
      console.error('Batch indexing error:', error);
      setResponse('Error in batch indexing.');
    } finally {
      setLoading(false);
    }
  };

  const pingSitemap = async () => {
    if (!sitemapUrl) return;
    setLoading(true);
    setSitemapResponse('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Use sitemap_ping to notify Google about the sitemap at ${sitemapUrl}`,
          session_id: `sitemap-${Date.now()}`,
        }),
      });

      const data = await res.json();
      setSitemapResponse(data.response || '');
    } catch (error) {
      console.error('Sitemap ping error:', error);
      setSitemapResponse('Error pinging sitemap.');
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async () => {
    if (!statusUrl) return;
    setLoading(true);
    setStatusResponse('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Use get_indexing_status to check the indexing status of ${statusUrl}`,
          session_id: `indexing-status-${Date.now()}`,
        }),
      });

      const data = await res.json();
      setStatusResponse(data.response || '');
    } catch (error) {
      console.error('Status check error:', error);
      setStatusResponse('Error checking indexing status.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <div className="min-h-screen">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Globe className="h-8 w-8 text-blue-500" />
              Indexing Manager
            </h1>
            <p className="text-muted-foreground mt-1">
              Submit URLs for re-indexing, ping sitemaps, and check indexing status
            </p>
          </div>
          <Badge variant="secondary" className="text-xs">v5.3 — Google Indexing API</Badge>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-green-500/5 border-green-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Submitted Today</p>
                  <p className="text-2xl font-bold text-green-500">{recentSubmissions.filter(r => r.status === 'success').length}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-red-500/5 border-red-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Failed</p>
                  <p className="text-2xl font-bold text-red-500">{recentSubmissions.filter(r => r.status === 'error').length}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-blue-500/5 border-blue-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Submissions</p>
                  <p className="text-2xl font-bold text-blue-500">{recentSubmissions.length}</p>
                </div>
                <Send className="h-8 w-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="single" className="space-y-4">
          <TabsList>
            <TabsTrigger value="single">Single URL</TabsTrigger>
            <TabsTrigger value="batch">Batch Submit</TabsTrigger>
            <TabsTrigger value="sitemap">Sitemap Ping</TabsTrigger>
            <TabsTrigger value="status">Check Status</TabsTrigger>
          </TabsList>

          <TabsContent value="single">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-blue-500" />
                  Request Indexing
                </CardTitle>
                <CardDescription>
                  Submit a single URL to Google for immediate re-crawling and re-indexing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <Input
                    placeholder="https://example.com/services"
                    value={singleUrl}
                    onChange={(e) => setSingleUrl(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={requestIndexing} disabled={loading || !singleUrl}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Submit
                  </Button>
                </div>

                {response && (
                  <div className="prose dark:prose-invert max-w-none">
                    <div className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg max-h-[300px] overflow-y-auto">
                      {response}
                    </div>
                  </div>
                )}

                <div className="border-t pt-4">
                  <p className="text-xs text-muted-foreground mb-2">
                    💡 Use this after making content changes, fixing SEO issues, or publishing new pages.
                    Google&apos;s Indexing API processes requests within minutes.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="batch">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-500" />
                  Batch Indexing
                </CardTitle>
                <CardDescription>
                  Submit multiple URLs at once (one per line, max 100 per day)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder={`https://example.com/services\nhttps://example.com/about\nhttps://example.com/blog/post-1`}
                  value={batchUrls}
                  onChange={(e) => setBatchUrls(e.target.value)}
                  rows={6}
                  className="font-mono text-sm"
                />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    {batchUrls.split('\n').filter(u => u.trim()).length} URLs
                  </span>
                  <Button onClick={batchIndex} disabled={loading || !batchUrls.trim()}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Submit All
                  </Button>
                </div>

                {response && (
                  <div className="prose dark:prose-invert max-w-none">
                    <div className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg max-h-[300px] overflow-y-auto">
                      {response}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sitemap">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-green-500" />
                  Ping Sitemap
                </CardTitle>
                <CardDescription>
                  Notify Google that your sitemap has been updated so it gets re-crawled
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <Input
                    placeholder="https://example.com/sitemap.xml"
                    value={sitemapUrl}
                    onChange={(e) => setSitemapUrl(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={pingSitemap} disabled={loading || !sitemapUrl}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Ping
                  </Button>
                </div>

                {sitemapResponse && (
                  <div className="prose dark:prose-invert max-w-none">
                    <div className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg">
                      {sitemapResponse}
                    </div>
                  </div>
                )}

                <div className="border-t pt-4">
                  <p className="text-xs text-muted-foreground">
                    💡 Ping your sitemap after adding new pages, changing URLs, or updating content. 
                    This tells Google to re-fetch your sitemap and discover changes.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="status">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-500" />
                  Check Indexing Status
                </CardTitle>
                <CardDescription>
                  Verify if a URL is indexed by Google and check its crawl status
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <Input
                    placeholder="https://example.com/services"
                    value={statusUrl}
                    onChange={(e) => setStatusUrl(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={checkStatus} disabled={loading || !statusUrl}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock className="mr-2 h-4 w-4" />}
                    Check
                  </Button>
                </div>

                {statusResponse && (
                  <div className="prose dark:prose-invert max-w-none">
                    <div className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg max-h-[400px] overflow-y-auto">
                      {statusResponse}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Recent Submissions */}
        {recentSubmissions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Submissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentSubmissions.map((sub, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                    {getStatusIcon(sub.status)}
                    <span className="flex-1 text-sm font-mono truncate">{sub.url}</span>
                    <Badge variant={sub.status === 'success' ? 'default' : 'destructive'} className="text-xs">
                      {sub.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info */}
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-blue-600 dark:text-blue-400">Indexing API Quotas</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Google Indexing API allows up to <strong>200 requests per day</strong>. 
                  Use batch submissions wisely. The API is designed for job posting and livestream structured data,
                  but works for URL notification. For best results, also submit via Search Console.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
