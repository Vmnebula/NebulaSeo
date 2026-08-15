'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Users, TrendingUp, Globe, Activity, RefreshCw, Loader2, MousePointerClick, Smartphone } from 'lucide-react';

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [trafficData, setTrafficData] = useState<any>(null);
  const [topPages, setTopPages] = useState<any>(null);
  const [sources, setSources] = useState<any>(null);
  const [realtimeUsers, setRealtimeUsers] = useState<any>(null);
  const [gscTrend, setGscTrend] = useState<any>(null);
  const [gscDevices, setGscDevices] = useState<any>(null);
  const [gscCountries, setGscCountries] = useState<any>(null);

  // Auto-fetch on mount
  useEffect(() => {
    fetchAnalytics('gsc-trend');
  }, []);

  const fetchAnalytics = async (type: string) => {
    setLoading(true);
    if (type === 'gsc-trend') setInitialLoad(false);
    try {
      const messages: Record<string, string> = {
        traffic: 'Get the GA4 traffic overview for the last 30 days including sessions, users, pageviews, and engagement rate',
        pages: 'Get the top 10 pages from GA4 analytics with pageviews and engagement metrics',
        sources: 'Get the traffic sources breakdown from GA4 showing organic, direct, social, and referral traffic',
        realtime: 'Get the realtime active users from GA4',
        'gsc-trend': 'Use gsc_live_daily_trend to show the daily clicks, impressions, CTR and position trend for the keyword "nebulaseo" over the last 28 days',
        'gsc-devices': 'Use gsc_live_device_breakdown to show mobile vs desktop vs tablet performance for the last 7 days',
        'gsc-countries': 'Use gsc_live_country_breakdown to show top countries by clicks for the last 7 days',
      };

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messages[type],
          session_id: `analytics-${Date.now()}`,
        }),
      });

      const data = await response.json();
      
      switch (type) {
        case 'traffic': setTrafficData(data.response); break;
        case 'pages': setTopPages(data.response); break;
        case 'sources': setSources(data.response); break;
        case 'realtime': setRealtimeUsers(data.response); break;
        case 'gsc-trend': setGscTrend(data.response); break;
        case 'gsc-devices': setGscDevices(data.response); break;
        case 'gsc-countries': setGscCountries(data.response); break;
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            GSC Live search performance &amp; GA4 traffic metrics
          </p>
        </div>
        <Button onClick={() => fetchAnalytics('gsc-trend')} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6 mb-8">
        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => fetchAnalytics('gsc-trend')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">GSC Trends</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Daily clicks & impressions</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => fetchAnalytics('gsc-devices')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Devices</CardTitle>
            <Smartphone className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Mobile vs Desktop</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => fetchAnalytics('gsc-countries')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Countries</CardTitle>
            <Globe className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Geographic breakdown</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => fetchAnalytics('traffic')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">GA4 Traffic</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Sessions & pageviews</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => fetchAnalytics('sources')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sources</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Traffic sources</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => fetchAnalytics('realtime')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Realtime</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Active users now</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Results */}
      <Tabs defaultValue="gsc-trend" className="space-y-4">
        <TabsList>
          <TabsTrigger value="gsc-trend">GSC Trends</TabsTrigger>
          <TabsTrigger value="gsc-devices">Devices</TabsTrigger>
          <TabsTrigger value="gsc-countries">Countries</TabsTrigger>
          <TabsTrigger value="traffic">GA4 Traffic</TabsTrigger>
          <TabsTrigger value="pages">Top Pages</TabsTrigger>
          <TabsTrigger value="sources">Sources</TabsTrigger>
          <TabsTrigger value="realtime">Realtime</TabsTrigger>
        </TabsList>

        <TabsContent value="gsc-trend">
          <Card>
            <CardHeader>
              <CardTitle>Search Performance Trends</CardTitle>
              <CardDescription>Daily clicks, impressions, CTR and position from GSC API</CardDescription>
            </CardHeader>
            <CardContent>
              {initialLoad ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  Loading GSC data...
                </div>
              ) : gscTrend ? (
                <div className="prose dark:prose-invert max-w-none">
                  <div className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg max-h-[500px] overflow-y-auto">{gscTrend}</div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Click the GSC Trends card to load data</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gsc-devices">
          <Card>
            <CardHeader>
              <CardTitle>Device Breakdown</CardTitle>
              <CardDescription>Mobile vs Desktop vs Tablet performance from GSC API</CardDescription>
            </CardHeader>
            <CardContent>
              {gscDevices ? (
                <div className="prose dark:prose-invert max-w-none">
                  <div className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg">{gscDevices}</div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Smartphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Click the Devices card to load device breakdown</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gsc-countries">
          <Card>
            <CardHeader>
              <CardTitle>Geographic Performance</CardTitle>
              <CardDescription>Top countries by search clicks from GSC API</CardDescription>
            </CardHeader>
            <CardContent>
              {gscCountries ? (
                <div className="prose dark:prose-invert max-w-none">
                  <div className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg">{gscCountries}</div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Click the Countries card to load geographic data</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="traffic">
          <Card>
            <CardHeader>
              <CardTitle>Traffic Overview</CardTitle>
              <CardDescription>Last 30 days from GA4</CardDescription>
            </CardHeader>
            <CardContent>
              {trafficData ? (
                <div className="prose dark:prose-invert max-w-none">
                  <div className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg">{trafficData}</div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Click the GA4 Traffic card to load analytics</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pages">
          <Card>
            <CardHeader>
              <CardTitle>Top Pages</CardTitle>
              <CardDescription>Pages with highest views and engagement from GA4</CardDescription>
            </CardHeader>
            <CardContent>
              {topPages ? (
                <div className="prose dark:prose-invert max-w-none">
                  <div className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg">{topPages}</div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Click the Top Pages card to load data</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources">
          <Card>
            <CardHeader>
              <CardTitle>Traffic Sources</CardTitle>
              <CardDescription>Where your visitors come from</CardDescription>
            </CardHeader>
            <CardContent>
              {sources ? (
                <div className="prose dark:prose-invert max-w-none">
                  <div className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg">{sources}</div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Click the Sources card to load source data</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="realtime">
          <Card>
            <CardHeader>
              <CardTitle>Realtime Users</CardTitle>
              <CardDescription>Active visitors on your site right now</CardDescription>
            </CardHeader>
            <CardContent>
              {realtimeUsers ? (
                <div className="prose dark:prose-invert max-w-none">
                  <div className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg">{realtimeUsers}</div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Click the Realtime card to see active users</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Setup Notice */}
      <Card className="mt-8 border-yellow-500/50 bg-yellow-500/10">
        <CardHeader>
          <CardTitle className="text-yellow-600 dark:text-yellow-400">⚠️ GA4 Setup Required</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            To enable GA4 analytics, add the service account as a Viewer in Google Analytics:
          </p>
          <code className="block bg-muted p-2 rounded text-xs mb-4">
            your-sa@your-project.iam.gserviceaccount.com
          </code>
          <p className="text-sm text-muted-foreground">
            Go to GA4 Admin → Account Access Management → Add user → Role: Viewer
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
