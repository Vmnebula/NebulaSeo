'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Github, 
  FolderTree, 
  FileCode, 
  GitBranch, 
  GitPullRequest,
  RefreshCw,
  Loader2,
  ExternalLink,
  FileText,
  Folder
} from 'lucide-react';

export default function GithubPage() {
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<any>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [prs, setPrs] = useState<any>(null);
  const [repoInfo, setRepoInfo] = useState<any>(null);
  const [currentPath, setCurrentPath] = useState('');
  const [filePath, setFilePath] = useState('');

  const fetchGithub = async (type: string, params?: any) => {
    setLoading(true);
    try {
      let message = '';
      
      switch (type) {
        case 'list_files':
          message = `List files in the NebulaSEO repository at path "${params?.path || ''}"`;
          break;
        case 'read_file':
          message = `Read the file "${params?.file}" from the NebulaSEO repository`;
          break;
        case 'list_prs':
          message = `List all open Pull Requests in the NebulaSEO repository`;
          break;
        case 'repo_info':
          message = `Get the NebulaSEO repository information`;
          break;
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          session_id: `github-${Date.now()}`,
        }),
      });

      const data = await response.json();
      
      switch (type) {
        case 'list_files':
          setFiles(data.response);
          setCurrentPath(params?.path || '');
          break;
        case 'read_file':
          setFileContent(data.response);
          break;
        case 'list_prs':
          setPrs(data.response);
          break;
        case 'repo_info':
          setRepoInfo(data.response);
          break;
      }
    } catch (error) {
      console.error('Error fetching GitHub data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Github className="h-8 w-8" />
            GitHub Integration
          </h1>
          <p className="text-muted-foreground mt-1">
            Browse and manage the NebulaSEO website repository
          </p>
        </div>
        <a 
          href="https://github.com/your-org/your-website-repo" 
          target="_blank" 
          rel="noopener noreferrer"
        >
          <Button variant="outline">
            <ExternalLink className="mr-2 h-4 w-4" />
            Open in GitHub
          </Button>
        </a>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card 
          className="cursor-pointer hover:border-primary transition-colors" 
          onClick={() => fetchGithub('list_files', { path: '' })}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Browse Files</CardTitle>
            <FolderTree className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Explore repository structure
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={() => fetchGithub('list_files', { path: 'website/src/app' })}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">App Pages</CardTitle>
            <FileCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              View website pages
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={() => fetchGithub('list_prs')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pull Requests</CardTitle>
            <GitPullRequest className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              View open PRs
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={() => fetchGithub('repo_info')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Repo Info</CardTitle>
            <Github className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Repository details
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="files" className="space-y-4">
        <TabsList>
          <TabsTrigger value="files">File Browser</TabsTrigger>
          <TabsTrigger value="reader">File Reader</TabsTrigger>
          <TabsTrigger value="prs">Pull Requests</TabsTrigger>
          <TabsTrigger value="info">Repo Info</TabsTrigger>
        </TabsList>

        <TabsContent value="files">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderTree className="h-5 w-5" />
                File Browser
              </CardTitle>
              <CardDescription>
                Current path: /{currentPath || 'root'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="Enter path (e.g., website/src/app)"
                  value={currentPath}
                  onChange={(e) => setCurrentPath(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchGithub('list_files', { path: currentPath })}
                />
                <Button 
                  onClick={() => fetchGithub('list_files', { path: currentPath })}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
              </div>

              {files ? (
                <div className="prose dark:prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg">
                    {files}
                  </pre>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FolderTree className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Click "Browse Files" to explore the repository</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reader">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCode className="h-5 w-5" />
                File Reader
              </CardTitle>
              <CardDescription>
                Read file contents from the repository
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="Enter file path (e.g., website/src/app/page.tsx)"
                  value={filePath}
                  onChange={(e) => setFilePath(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchGithub('read_file', { file: filePath })}
                />
                <Button 
                  onClick={() => fetchGithub('read_file', { file: filePath })}
                  disabled={loading || !filePath}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Read'}
                </Button>
              </div>

              {fileContent ? (
                <div className="prose dark:prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg overflow-auto max-h-[500px]">
                    {fileContent}
                  </pre>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileCode className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Enter a file path and click Read to view contents</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prs">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <GitPullRequest className="h-5 w-5" />
                  Pull Requests
                </CardTitle>
                <CardDescription>
                  SEO fix PRs created by the agent
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => fetchGithub('list_prs')}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
            </CardHeader>
            <CardContent>
              {prs ? (
                <div className="prose dark:prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg">
                    {prs}
                  </pre>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <GitPullRequest className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Click refresh to load Pull Requests</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Github className="h-5 w-5" />
                Repository Information
              </CardTitle>
              <CardDescription>
                your-org/your-website-repo
              </CardDescription>
            </CardHeader>
            <CardContent>
              {repoInfo ? (
                <div className="prose dark:prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg">
                    {repoInfo}
                  </pre>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Github className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Click "Repo Info" card to load repository details</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
