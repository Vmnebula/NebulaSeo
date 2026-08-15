'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Sparkles, FileText, Code, Heading, Image, Link, Loader2, Copy, Check } from 'lucide-react';

export default function ContentPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [copied, setCopied] = useState(false);
  
  // Form states
  const [metaTitle, setMetaTitle] = useState({ currentTitle: '', keyword: '', url: '' });
  const [metaDesc, setMetaDesc] = useState({ summary: '', keyword: '', url: '' });
  const [schema, setSchema] = useState({ type: 'Organization', data: '' });
  const [blog, setBlog] = useState({ topic: '', keywords: '', audience: '' });

  const generateContent = async (type: string) => {
    setLoading(true);
    setResult('');
    
    try {
      let message = '';
      
      switch (type) {
        case 'meta_title':
          message = `Use generate_meta_title to create an optimized title. Current title: "${metaTitle.currentTitle}", target keyword: "${metaTitle.keyword}", page URL: "${metaTitle.url}"`;
          break;
        case 'meta_description':
          message = `Use generate_meta_description to create an optimized meta description. Page summary: "${metaDesc.summary}", target keyword: "${metaDesc.keyword}", page URL: "${metaDesc.url}"`;
          break;
        case 'schema':
          message = `Use generate_schema_markup to create ${schema.type} schema markup. Data: ${schema.data || 'Use NebulaSEO default information'}`;
          break;
        case 'blog_outline':
          message = `Use generate_blog_outline to create an outline for a blog post about "${blog.topic}". Target keywords: ${blog.keywords}. Target audience: ${blog.audience || 'Business owners in Dubai'}`;
          break;
        case 'blog_content':
          message = `Use generate_blog_content to create a full SEO-optimized blog post about "${blog.topic}". Target keywords: ${blog.keywords}. Make it 1500+ words.`;
          break;
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          session_id: `content-${Date.now()}`,
        }),
      });

      const data = await response.json();
      setResult(data.response);
    } catch (error) {
      console.error('Error generating content:', error);
      setResult('Error generating content. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-primary" />
          AI Content Generator
        </h1>
        <p className="text-muted-foreground mt-1">
          Generate SEO-optimized content using AI
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Input Section */}
        <div>
          <Tabs defaultValue="meta_title" className="space-y-4">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="meta_title" className="text-xs">Title</TabsTrigger>
              <TabsTrigger value="meta_desc" className="text-xs">Description</TabsTrigger>
              <TabsTrigger value="schema" className="text-xs">Schema</TabsTrigger>
              <TabsTrigger value="blog_outline" className="text-xs">Outline</TabsTrigger>
              <TabsTrigger value="blog_content" className="text-xs">Blog</TabsTrigger>
            </TabsList>

            <TabsContent value="meta_title">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heading className="h-5 w-5" />
                    Meta Title Generator
                  </CardTitle>
                  <CardDescription>
                    Generate SEO-optimized titles (50-60 characters)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Current Title</label>
                    <Input
                      placeholder="Services | NebulaSEO"
                      value={metaTitle.currentTitle}
                      onChange={(e) => setMetaTitle({ ...metaTitle, currentTitle: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Target Keyword *</label>
                    <Input
                      placeholder="app development dubai"
                      value={metaTitle.keyword}
                      onChange={(e) => setMetaTitle({ ...metaTitle, keyword: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Page URL</label>
                    <Input
                      placeholder="https://example.com/services"
                      value={metaTitle.url}
                      onChange={(e) => setMetaTitle({ ...metaTitle, url: e.target.value })}
                    />
                  </div>
                  <Button 
                    onClick={() => generateContent('meta_title')} 
                    disabled={loading || !metaTitle.keyword}
                    className="w-full"
                  >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Generate Title
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="meta_desc">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Meta Description Generator
                  </CardTitle>
                  <CardDescription>
                    Generate compelling descriptions (150-160 characters)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Page Summary *</label>
                    <Textarea
                      placeholder="Describe what the page is about..."
                      value={metaDesc.summary}
                      onChange={(e) => setMetaDesc({ ...metaDesc, summary: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Target Keyword *</label>
                    <Input
                      placeholder="ai automation services"
                      value={metaDesc.keyword}
                      onChange={(e) => setMetaDesc({ ...metaDesc, keyword: e.target.value })}
                    />
                  </div>
                  <Button 
                    onClick={() => generateContent('meta_description')} 
                    disabled={loading || !metaDesc.keyword || !metaDesc.summary}
                    className="w-full"
                  >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Generate Description
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="schema">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    Schema Markup Generator
                  </CardTitle>
                  <CardDescription>
                    Generate JSON-LD structured data for rich snippets
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Schema Type *</label>
                    <Select value={schema.type} onValueChange={(v) => setSchema({ ...schema, type: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Organization">Organization</SelectItem>
                        <SelectItem value="LocalBusiness">Local Business</SelectItem>
                        <SelectItem value="Service">Service</SelectItem>
                        <SelectItem value="Article">Article</SelectItem>
                        <SelectItem value="FAQ">FAQ</SelectItem>
                        <SelectItem value="HowTo">How To</SelectItem>
                        <SelectItem value="Product">Product</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Custom Data (optional)</label>
                    <Textarea
                      placeholder="Add any specific data for the schema..."
                      value={schema.data}
                      onChange={(e) => setSchema({ ...schema, data: e.target.value })}
                    />
                  </div>
                  <Button 
                    onClick={() => generateContent('schema')} 
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Code className="mr-2 h-4 w-4" />}
                    Generate Schema
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="blog_outline">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Blog Outline Generator
                  </CardTitle>
                  <CardDescription>
                    Generate a detailed SEO-optimized blog outline
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Blog Topic *</label>
                    <Input
                      placeholder="Mobile App Development Cost in Dubai 2026"
                      value={blog.topic}
                      onChange={(e) => setBlog({ ...blog, topic: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Target Keywords *</label>
                    <Input
                      placeholder="app development cost, dubai app developers"
                      value={blog.keywords}
                      onChange={(e) => setBlog({ ...blog, keywords: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Target Audience</label>
                    <Input
                      placeholder="Business owners in Dubai"
                      value={blog.audience}
                      onChange={(e) => setBlog({ ...blog, audience: e.target.value })}
                    />
                  </div>
                  <Button 
                    onClick={() => generateContent('blog_outline')} 
                    disabled={loading || !blog.topic || !blog.keywords}
                    className="w-full"
                  >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                    Generate Outline
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="blog_content">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Full Blog Post Generator
                  </CardTitle>
                  <CardDescription>
                    Generate a complete 1500+ word SEO blog post
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Blog Topic *</label>
                    <Input
                      placeholder="How AI is Transforming Business in UAE"
                      value={blog.topic}
                      onChange={(e) => setBlog({ ...blog, topic: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Target Keywords *</label>
                    <Input
                      placeholder="AI automation, business UAE, AI services dubai"
                      value={blog.keywords}
                      onChange={(e) => setBlog({ ...blog, keywords: e.target.value })}
                    />
                  </div>
                  <Button 
                    onClick={() => generateContent('blog_content')} 
                    disabled={loading || !blog.topic || !blog.keywords}
                    className="w-full"
                  >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Generate Full Blog Post
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    ⚡ This may take 30-60 seconds to generate
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Output Section */}
        <div>
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Generated Content</CardTitle>
                <CardDescription>AI-generated SEO content</CardDescription>
              </div>
              {result && (
                <Button variant="outline" size="sm" onClick={copyToClipboard}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground">Generating content...</p>
                </div>
              ) : result ? (
                <div className="prose dark:prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg overflow-auto max-h-[600px]">
                    {result}
                  </pre>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a content type and fill in the form to generate SEO content</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
