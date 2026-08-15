'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Wand2, 
  FileEdit, 
  Code, 
  PenTool, 
  Heading,
  Loader2,
  CheckCircle,
  ExternalLink,
  AlertCircle,
  Globe,
  Send,
  Shield,
  Code2,
} from 'lucide-react';

export default function ActionsPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  
  // Form states
  const [metaFix, setMetaFix] = useState({ 
    pageUrl: '', 
    filePath: '', 
    keyword: '',
    issues: 'improve_title,improve_meta_description'
  });
  
  const [schemaFix, setSchemaFix] = useState({
    pageUrl: '',
    filePath: '',
    schemaType: 'Organization',
  });
  
  const [blogCreate, setBlogCreate] = useState({
    topic: '',
    keywords: '',
    slug: '',
  });
  
  const [headingFix, setHeadingFix] = useState({
    pageUrl: '',
    filePath: '',
    issues: 'multiple_h1',
  });

  // v5.0 new action states
  const [indexUrl, setIndexUrl] = useState('');
  const [schemaCheckUrl, setSchemaCheckUrl] = useState('');

  const executeAction = async (action: string) => {
    setLoading(true);
    setResult('');
    
    try {
      let message = '';
      
      switch (action) {
        case 'fix_meta':
          message = `Use the fix_meta_tags tool to fix meta tag issues on ${metaFix.pageUrl}. The file path in the repo is ${metaFix.filePath}. Target keyword: "${metaFix.keyword}". Issues to fix: ${metaFix.issues}`;
          break;
        case 'add_schema':
          message = `Use the add_schema_markup tool to add ${schemaFix.schemaType} schema to ${schemaFix.pageUrl}. The file path is ${schemaFix.filePath}`;
          break;
        case 'create_blog':
          message = `Use the create_blog_post tool to generate and submit a blog post about "${blogCreate.topic}". Target keywords: ${blogCreate.keywords}. URL slug: ${blogCreate.slug}`;
          break;
        case 'fix_headings':
          message = `Use the fix_heading_structure tool to fix heading issues on ${headingFix.pageUrl}. File path: ${headingFix.filePath}. Issues: ${headingFix.issues}`;
          break;
        case 'request_indexing':
          message = `Use request_indexing to submit ${indexUrl} for re-indexing with type URL_UPDATED`;
          break;
        case 'validate_schema':
          message = `Use validate_schema_on_page to check the structured data on ${schemaCheckUrl}. Report all JSON-LD schemas found, validation errors, and rich result eligibility.`;
          break;
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          session_id: `actions-${Date.now()}`,
        }),
      });

      const data = await response.json();
      setResult(data.response);
    } catch (error) {
      console.error('Error executing action:', error);
      setResult('Error executing action. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Wand2 className="h-8 w-8 text-primary" />
          Autonomous SEO Actions
        </h1>
        <p className="text-muted-foreground mt-1">
          Auto-fix SEO issues, request re-indexing, and validate schema
        </p>
      </div>

      {/* Info Banner */}
      <Card className="mb-8 border-blue-500/50 bg-blue-500/10">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <p className="font-medium text-blue-600 dark:text-blue-400">How Autonomous Actions Work</p>
              <p className="text-sm text-muted-foreground mt-1">
                When you execute an action, the AI agent will:
                1️⃣ Create a new branch → 
                2️⃣ Generate optimized content → 
                3️⃣ Commit changes → 
                4️⃣ Open a Pull Request.
                When you merge the PR, Cloud Build auto-deploys the changes!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Actions */}
        <div className="space-y-6">
          {/* Fix Meta Tags */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileEdit className="h-5 w-5 text-orange-500" />
                Fix Meta Tags
                <Badge variant="secondary">Creates PR</Badge>
              </CardTitle>
              <CardDescription>
                Auto-fix title and meta description issues
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Page URL *</label>
                  <Input
                    placeholder="https://example.com/services"
                    value={metaFix.pageUrl}
                    onChange={(e) => setMetaFix({ ...metaFix, pageUrl: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">File Path *</label>
                  <Input
                    placeholder="website/src/app/services/page.tsx"
                    value={metaFix.filePath}
                    onChange={(e) => setMetaFix({ ...metaFix, filePath: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Target Keyword *</label>
                <Input
                  placeholder="app development dubai"
                  value={metaFix.keyword}
                  onChange={(e) => setMetaFix({ ...metaFix, keyword: e.target.value })}
                />
              </div>
              <Button 
                onClick={() => executeAction('fix_meta')} 
                disabled={loading || !metaFix.pageUrl || !metaFix.filePath || !metaFix.keyword}
                className="w-full"
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                Fix Meta Tags & Create PR
              </Button>
            </CardContent>
          </Card>

          {/* Add Schema */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5 text-purple-500" />
                Add Schema Markup
                <Badge variant="secondary">Creates PR</Badge>
              </CardTitle>
              <CardDescription>
                Add JSON-LD structured data for rich snippets
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Page URL *</label>
                  <Input
                    placeholder="https://example.com"
                    value={schemaFix.pageUrl}
                    onChange={(e) => setSchemaFix({ ...schemaFix, pageUrl: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">File Path *</label>
                  <Input
                    placeholder="website/src/app/page.tsx"
                    value={schemaFix.filePath}
                    onChange={(e) => setSchemaFix({ ...schemaFix, filePath: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Schema Type *</label>
                <Select 
                  value={schemaFix.schemaType} 
                  onValueChange={(v) => setSchemaFix({ ...schemaFix, schemaType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Organization">Organization</SelectItem>
                    <SelectItem value="LocalBusiness">Local Business</SelectItem>
                    <SelectItem value="Service">Service</SelectItem>
                    <SelectItem value="FAQ">FAQ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={() => executeAction('add_schema')} 
                disabled={loading || !schemaFix.pageUrl || !schemaFix.filePath}
                className="w-full"
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Code className="mr-2 h-4 w-4" />}
                Add Schema & Create PR
              </Button>
            </CardContent>
          </Card>

          {/* Create Blog Post */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PenTool className="h-5 w-5 text-green-500" />
                Create Blog Post
                <Badge variant="secondary">Creates PR</Badge>
              </CardTitle>
              <CardDescription>
                Generate a full SEO blog post and submit as PR
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Blog Topic *</label>
                <Input
                  placeholder="Mobile App Development Cost in Dubai 2026"
                  value={blogCreate.topic}
                  onChange={(e) => setBlogCreate({ ...blogCreate, topic: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Target Keywords *</label>
                  <Input
                    placeholder="app development cost, dubai"
                    value={blogCreate.keywords}
                    onChange={(e) => setBlogCreate({ ...blogCreate, keywords: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">URL Slug *</label>
                  <Input
                    placeholder="app-development-cost-dubai"
                    value={blogCreate.slug}
                    onChange={(e) => setBlogCreate({ ...blogCreate, slug: e.target.value })}
                  />
                </div>
              </div>
              <Button 
                onClick={() => executeAction('create_blog')} 
                disabled={loading || !blogCreate.topic || !blogCreate.keywords || !blogCreate.slug}
                className="w-full"
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PenTool className="mr-2 h-4 w-4" />}
                Generate Blog & Create PR
              </Button>
              <p className="text-xs text-muted-foreground">
                ⚡ This generates a 1500+ word blog post - may take 60-90 seconds
              </p>
            </CardContent>
          </Card>

          {/* Fix Headings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heading className="h-5 w-5 text-blue-500" />
                Fix Heading Structure
                <Badge variant="secondary">Creates PR</Badge>
              </CardTitle>
              <CardDescription>
                Fix multiple H1s and heading hierarchy issues
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Page URL *</label>
                  <Input
                    placeholder="https://example.com"
                    value={headingFix.pageUrl}
                    onChange={(e) => setHeadingFix({ ...headingFix, pageUrl: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">File Path *</label>
                  <Input
                    placeholder="website/src/app/page.tsx"
                    value={headingFix.filePath}
                    onChange={(e) => setHeadingFix({ ...headingFix, filePath: e.target.value })}
                  />
                </div>
              </div>
              <Button 
                onClick={() => executeAction('fix_headings')} 
                disabled={loading || !headingFix.pageUrl || !headingFix.filePath}
                className="w-full"
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Heading className="mr-2 h-4 w-4" />}
                Fix Headings & Create PR
              </Button>
            </CardContent>
          </Card>

          {/* Request Re-indexing - v5.0 */}
          <Card className="border-blue-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-500" />
                Request Re-indexing
                <Badge className="text-[10px] bg-blue-500/20 text-blue-400 border-blue-500/30">v5.3</Badge>
              </CardTitle>
              <CardDescription>
                Submit a URL to Google for immediate re-crawling
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Page URL *</label>
                <Input
                  placeholder="https://example.com/services"
                  value={indexUrl}
                  onChange={(e) => setIndexUrl(e.target.value)}
                />
              </div>
              <Button 
                onClick={() => executeAction('request_indexing')} 
                disabled={loading || !indexUrl}
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Submit for Re-indexing
              </Button>
              <p className="text-xs text-muted-foreground">
                ⚡ Google Indexing API — processes within minutes
              </p>
            </CardContent>
          </Card>

          {/* Validate Schema - v5.0 */}
          <Card className="border-purple-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code2 className="h-5 w-5 text-purple-500" />
                Validate Schema
                <Badge className="text-[10px] bg-purple-500/20 text-purple-400 border-purple-500/30">v5.3</Badge>
              </CardTitle>
              <CardDescription>
                Check structured data and rich results eligibility
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Page URL *</label>
                <Input
                  placeholder="https://example.com"
                  value={schemaCheckUrl}
                  onChange={(e) => setSchemaCheckUrl(e.target.value)}
                />
              </div>
              <Button 
                onClick={() => executeAction('validate_schema')} 
                disabled={loading || !schemaCheckUrl}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
                Validate Schema
              </Button>
              <p className="text-xs text-muted-foreground">
                ⚡ Checks JSON-LD, validates properties, reports rich results eligibility
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <div>
          <Card className="sticky top-4 h-fit">
            <CardHeader>
              <CardTitle>Action Result</CardTitle>
              <CardDescription>
                PR details and status will appear here
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground">Executing action...</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Creating branch, generating content, opening PR...
                  </p>
                </div>
              ) : result ? (
                <div className="prose dark:prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg overflow-auto max-h-[600px]">
                    {result}
                  </pre>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Wand2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select an action and fill in the form</p>
                  <p className="text-xs mt-2">
                    The agent will automatically create a PR with the fixes
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
