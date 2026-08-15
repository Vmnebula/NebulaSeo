'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Code2,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Globe,
  FileJson,
  Sparkles,
  Shield,
  Search,
  Star,
  BookOpen,
  Building,
  HelpCircle,
  Briefcase,
  ShoppingCart,
} from 'lucide-react';

interface SchemaResult {
  type: string;
  valid: boolean;
  properties: number;
  issues: string[];
}

export default function SchemaPage() {
  const [url, setUrl] = useState('https://example.com');
  const [jsonInput, setJsonInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [urlResult, setUrlResult] = useState('');
  const [jsonResult, setJsonResult] = useState('');
  const [detectedSchemas, setDetectedSchemas] = useState<SchemaResult[]>([]);
  const [richResults, setRichResults] = useState<string[]>([]);

  const validateUrl = async () => {
    if (!url) return;
    setLoading(true);
    setUrlResult('');
    setDetectedSchemas([]);
    setRichResults([]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Use validate_schema_on_page to check the structured data on ${url}. Report all JSON-LD schemas found, validation errors, and rich result eligibility.`,
          session_id: `schema-${Date.now()}`,
        }),
      });

      const data = await res.json();
      const response = data.response || '';
      setUrlResult(response);

      // Parse schema types from response
      const schemaTypes = ['Organization', 'LocalBusiness', 'WebSite', 'WebPage', 'FAQPage', 'Article', 'BlogPosting', 'Product', 'Service', 'BreadcrumbList', 'HowTo', 'Recipe', 'Event', 'JobPosting', 'SoftwareApplication'];
      const found: SchemaResult[] = [];
      for (const type of schemaTypes) {
        if (response.toLowerCase().includes(type.toLowerCase())) {
          found.push({
            type,
            valid: !response.toLowerCase().includes(`${type.toLowerCase()}.*error|invalid.*${type.toLowerCase()}`),
            properties: 0,
            issues: [],
          });
        }
      }
      if (found.length > 0) setDetectedSchemas(found);

      // Parse rich results eligibility
      const richTypes = ['Sitelinks Search Box', 'Knowledge Panel', 'FAQ Rich Result', 'Breadcrumbs', 'Article', 'Product', 'Review', 'Event', 'Job Posting', 'HowTo', 'Recipe'];
      const eligible = richTypes.filter(r => response.toLowerCase().includes(r.toLowerCase()));
      if (eligible.length > 0) setRichResults(eligible);
    } catch (error) {
      console.error('Schema validation error:', error);
      setUrlResult('Error validating schema. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const validateJson = async () => {
    if (!jsonInput.trim()) return;
    setLoading(true);
    setJsonResult('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Use validate_schema_json to validate this JSON-LD structured data: ${jsonInput}`,
          session_id: `schema-json-${Date.now()}`,
        }),
      });

      const data = await res.json();
      setJsonResult(data.response || '');
    } catch (error) {
      console.error('JSON validation error:', error);
      setJsonResult('Error validating JSON-LD. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const schemaTemplates: Record<string, string> = {
    Organization: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "NebulaSEO",
      "url": "https://example.com",
      "logo": "https://example.com/logo.png",
      "sameAs": [],
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": "",
        "contactType": "customer service"
      }
    }, null, 2),
    LocalBusiness: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "name": "NebulaSEO",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "",
        "addressLocality": "Dubai",
        "addressCountry": "AE"
      },
      "telephone": "",
      "openingHours": "Mo-Fr 09:00-18:00"
    }, null, 2),
    FAQ: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is your question?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Your answer here."
          }
        }
      ]
    }, null, 2),
    Service: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Service",
      "name": "Web Development",
      "provider": {
        "@type": "Organization",
        "name": "NebulaSEO"
      },
      "description": "Professional web development services",
      "areaServed": "Dubai, UAE"
    }, null, 2),
  };

  const getSchemaIcon = (type: string) => {
    switch (type) {
      case 'Organization': return <Building className="h-4 w-4" />;
      case 'LocalBusiness': return <Globe className="h-4 w-4" />;
      case 'FAQPage': return <HelpCircle className="h-4 w-4" />;
      case 'Article':
      case 'BlogPosting': return <BookOpen className="h-4 w-4" />;
      case 'Product': return <ShoppingCart className="h-4 w-4" />;
      case 'Service': return <Briefcase className="h-4 w-4" />;
      case 'JobPosting': return <Star className="h-4 w-4" />;
      default: return <Code2 className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Code2 className="h-8 w-8 text-purple-500" />
              Schema Validator
            </h1>
            <p className="text-muted-foreground mt-1">
              Validate structured data (JSON-LD) and check rich results eligibility
            </p>
          </div>
          <Badge variant="secondary" className="text-xs">v5.3 — Schema.org Validator</Badge>
        </div>

        <Tabs defaultValue="url" className="space-y-4">
          <TabsList>
            <TabsTrigger value="url">Validate URL</TabsTrigger>
            <TabsTrigger value="json">Validate JSON-LD</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="url">
            <div className="space-y-4">
              {/* URL Input */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-blue-500" />
                    Validate Page Schema
                  </CardTitle>
                  <CardDescription>
                    Enter a URL to detect and validate all JSON-LD structured data on the page
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    <Input
                      placeholder="https://example.com"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={validateUrl} disabled={loading || !url}>
                      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                      Validate
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Detected Schemas */}
              {detectedSchemas.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {detectedSchemas.map((schema) => (
                    <Card key={schema.type} className={schema.valid ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-2">
                          {getSchemaIcon(schema.type)}
                          <span className="font-medium text-sm">{schema.type}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {schema.valid ? (
                            <>
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span className="text-xs text-green-500">Valid</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4 text-red-500" />
                              <span className="text-xs text-red-500">Issues Found</span>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Rich Results Eligibility */}
              {richResults.length > 0 && (
                <Card className="border-purple-500/30 bg-purple-500/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Sparkles className="h-5 w-5 text-purple-500" />
                      Rich Results Eligibility
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 flex-wrap">
                      {richResults.map((r) => (
                        <Badge key={r} className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                          <Star className="h-3 w-3 mr-1" />
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Full Result */}
              {urlResult && (
                <Card>
                  <CardHeader>
                    <CardTitle>Validation Results</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose dark:prose-invert max-w-none">
                      <div className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg max-h-[500px] overflow-y-auto">
                        {urlResult}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Empty State */}
              {!urlResult && !loading && (
                <Card className="border-dashed">
                  <CardContent className="pt-12 pb-12 text-center">
                    <Code2 className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-30" />
                    <h3 className="text-lg font-semibold mb-2">No Validation Results</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Enter a URL above to scan for JSON-LD structured data and validate it against schema.org standards
                    </p>
                    <div className="flex gap-2 justify-center flex-wrap">
                      <Badge variant="outline" className="text-xs">JSON-LD Detection</Badge>
                      <Badge variant="outline" className="text-xs">Property Validation</Badge>
                      <Badge variant="outline" className="text-xs">Rich Results Check</Badge>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="json">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileJson className="h-5 w-5 text-green-500" />
                  Validate JSON-LD
                </CardTitle>
                <CardDescription>
                  Paste your JSON-LD structured data to validate before deploying
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder={`{\n  "@context": "https://schema.org",\n  "@type": "Organization",\n  "name": "Your Business",\n  ...\n}`}
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  rows={12}
                  className="font-mono text-sm"
                />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    {jsonInput.length > 0 ? `${jsonInput.length} characters` : 'Paste or type JSON-LD'}
                  </span>
                  <Button onClick={validateJson} disabled={loading || !jsonInput.trim()}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
                    Validate JSON-LD
                  </Button>
                </div>

                {jsonResult && (
                  <div className="prose dark:prose-invert max-w-none">
                    <div className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg max-h-[400px] overflow-y-auto">
                      {jsonResult}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-yellow-500" />
                    Schema Templates
                  </CardTitle>
                  <CardDescription>
                    Click a template to load it into the JSON-LD editor for customization
                  </CardDescription>
                </CardHeader>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(schemaTemplates).map(([name, template]) => (
                  <Card key={name} className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => { setJsonInput(template); }}>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        {getSchemaIcon(name)}
                        {name}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {name === 'Organization' && 'Company details for Knowledge Panel'}
                        {name === 'LocalBusiness' && 'Local business listing with address'}
                        {name === 'FAQ' && 'FAQ rich results in search'}
                        {name === 'Service' && 'Service offering details'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs bg-muted p-3 rounded-lg overflow-hidden max-h-[100px] text-muted-foreground">
                        {template.slice(0, 200)}...
                      </pre>
                      <Button variant="outline" size="sm" className="mt-3 w-full" onClick={(e) => { e.stopPropagation(); setJsonInput(template); }}>
                        <Code2 className="mr-2 h-3 w-3" />
                        Use Template
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Info */}
        <Card className="border-purple-500/30 bg-purple-500/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <Sparkles className="h-5 w-5 text-purple-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-purple-600 dark:text-purple-400">Why Structured Data Matters</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Structured data helps Google understand your content and enables <strong>rich results</strong> (FAQ dropdowns, star ratings, knowledge panels, etc.).
                  Pages with valid schema markup get up to <strong>30% more clicks</strong> from search results.
                  Validate your schema before deploying to avoid errors that prevent rich results.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
