"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Zap, 
  FileCode, 
  Link2, 
  Image, 
  Smartphone,
  Clock,
  GitPullRequest,
  Loader2,
  RefreshCw,
  Wrench,
  PlayCircle
} from "lucide-react"

interface AuditIssue {
  id: string
  type: 'critical' | 'warning' | 'opportunity'
  category: 'performance' | 'seo' | 'accessibility' | 'best-practices'
  title: string
  description: string
  impact: string
  filePath?: string
  action: 'fix_meta_tags' | 'add_schema_markup' | 'fix_heading_structure' | 'optimize_images' | 'fix_links'
  autoFixable: boolean
}

interface AuditResult {
  url: string
  score: {
    performance: number
    seo: number
    accessibility: number
    bestPractices: number
  }
  issues: AuditIssue[]
  timestamp: string
}

const AGENT_URL = "http://localhost:8080"

export default function AuditsPage() {
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null)
  const [fixingIssue, setFixingIssue] = useState<string | null>(null)
  const [fixedIssues, setFixedIssues] = useState<Set<string>>(new Set())
  const [prLinks, setPrLinks] = useState<Record<string, string>>({})

  const runAudit = async () => {
    if (!url) return
    setLoading(true)
    setAnalyzing(true)
    
    try {
      // Use pagespeed_audit for real Lighthouse scores + SEO audit
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Run a comprehensive SEO audit on ${url}. First use pagespeed_audit to get Lighthouse scores and Core Web Vitals on mobile. Then check meta tags, schema markup, heading structure, images, and links. Return performance, SEO, accessibility, best practices scores and all issues found.`,
          session_id: `audit-${Date.now()}`
        })
      })
      
      const data = await response.json()
      // Results will be shown from agent response
      console.log('Audit response:', data.response)
    } catch (error) {
      console.error("Audit failed:", error)
    } finally {
      setLoading(false)
      setAnalyzing(false)
    }
  }

  const autoFixIssue = async (issue: AuditIssue) => {
    setFixingIssue(issue.id)
    
    try {
      let message = ""
      
      switch (issue.action) {
        case "fix_meta_tags":
          message = `Fix the meta tags issue: "${issue.title}". ${issue.description}. Target file: ${issue.filePath || 'auto-detect'}. Create a PR with the fix.`
          break
        case "add_schema_markup":
          message = `Add proper schema.org structured data to fix: "${issue.title}". ${issue.description}. Target file: ${issue.filePath || 'auto-detect'}. Create a PR with the fix.`
          break
        case "fix_heading_structure":
          message = `Fix the heading structure issue: "${issue.title}". ${issue.description}. Target file: ${issue.filePath || 'auto-detect'}. Ensure proper H1-H6 hierarchy. Create a PR with the fix.`
          break
        case "optimize_images":
          message = `Fix image issues: "${issue.title}". ${issue.description}. Add alt text to all images. Create a PR with the fix.`
          break
        case "fix_links":
          message = `Fix link issues: "${issue.title}". ${issue.description}. Add rel="noopener noreferrer" to external links. Create a PR with the fix.`
          break
      }
      
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          agentUrl: AGENT_URL
        })
      })
      
      const data = await response.json()
      
      // Extract PR link from response
      const prMatch = data.response?.match(/github\.com\/[^/]+\/[^/]+\/pull\/\d+/)
      if (prMatch) {
        setPrLinks(prev => ({ ...prev, [issue.id]: `https://${prMatch[0]}` }))
      }
      
      setFixedIssues(prev => {
        const newSet = new Set(prev)
        newSet.add(issue.id)
        return newSet
      })
    } catch (error) {
      console.error("Auto-fix failed:", error)
    } finally {
      setFixingIssue(null)
    }
  }

  const fixAllCritical = async () => {
    if (!auditResult) return
    
    const criticalIssues = auditResult.issues.filter(
      i => i.type === 'critical' && i.autoFixable && !fixedIssues.has(i.id)
    )
    
    for (const issue of criticalIssues) {
      await autoFixIssue(issue)
      await new Promise(r => setTimeout(r, 2000)) // Delay between fixes
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-500"
    if (score >= 50) return "text-yellow-500"
    return "text-red-500"
  }

  const getScoreBg = (score: number) => {
    if (score >= 90) return "bg-green-500/10 border-green-500/20"
    if (score >= 50) return "bg-yellow-500/10 border-yellow-500/20"
    return "bg-red-500/10 border-red-500/20"
  }

  const criticalCount = auditResult?.issues.filter(i => i.type === 'critical').length || 0
  const warningCount = auditResult?.issues.filter(i => i.type === 'warning').length || 0
  const fixableCount = auditResult?.issues.filter(i => i.autoFixable && !fixedIssues.has(i.id)).length || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Site Audits</h1>
          <p className="text-muted-foreground">
            Comprehensive SEO &amp; PageSpeed audit with one-click auto-fixes
          </p>
        </div>
        {auditResult && fixableCount > 0 && (
          <Button 
            onClick={fixAllCritical}
            disabled={fixingIssue !== null}
            className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
          >
            <Wrench className="mr-2 h-4 w-4" />
            Fix All Critical ({criticalCount} issues) → Create PRs
          </Button>
        )}
      </div>

      {/* URL Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Run SEO Audit
          </CardTitle>
          <CardDescription>
            Enter a URL to audit. The agent will analyze and auto-fix issues by creating PRs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="https://your-website.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1"
            />
            <Button onClick={runAudit} disabled={loading || !url}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <PlayCircle className="mr-2 h-4 w-4" />
              )}
              Run Audit
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Scores */}
      {auditResult && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Performance", score: auditResult.score.performance, icon: Zap },
            { label: "SEO", score: auditResult.score.seo, icon: Search },
            { label: "Accessibility", score: auditResult.score.accessibility, icon: Smartphone },
            { label: "Best Practices", score: auditResult.score.bestPractices, icon: CheckCircle },
          ].map((item) => (
            <Card key={item.label} className={`${getScoreBg(item.score)} border`}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    <p className={`text-3xl font-bold ${getScoreColor(item.score)}`}>
                      {item.score}
                    </p>
                  </div>
                  <item.icon className={`h-8 w-8 ${getScoreColor(item.score)}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Issues Summary */}
      {auditResult && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-red-500/10 border-red-500/20">
            <CardContent className="pt-6 text-center">
              <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-red-500">{criticalCount}</p>
              <p className="text-sm text-muted-foreground">Critical Issues</p>
            </CardContent>
          </Card>
          <Card className="bg-yellow-500/10 border-yellow-500/20">
            <CardContent className="pt-6 text-center">
              <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-yellow-500">{warningCount}</p>
              <p className="text-sm text-muted-foreground">Warnings</p>
            </CardContent>
          </Card>
          <Card className="bg-green-500/10 border-green-500/20">
            <CardContent className="pt-6 text-center">
              <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-500">{fixedIssues.size}</p>
              <p className="text-sm text-muted-foreground">Fixed (PRs Created)</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Issues List */}
      {auditResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Detected Issues
              {analyzing && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            </CardTitle>
            <CardDescription>
              Click "Auto Fix" to create a PR that fixes the issue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {auditResult.issues.map((issue) => (
                <div
                  key={issue.id}
                  className={`p-4 rounded-lg border ${
                    fixedIssues.has(issue.id)
                      ? 'bg-green-500/10 border-green-500/30'
                      : issue.type === 'critical'
                      ? 'bg-red-500/5 border-red-500/20'
                      : issue.type === 'warning'
                      ? 'bg-yellow-500/5 border-yellow-500/20'
                      : 'bg-blue-500/5 border-blue-500/20'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant={
                            fixedIssues.has(issue.id)
                              ? 'default'
                              : issue.type === 'critical'
                              ? 'destructive'
                              : 'secondary'
                          }
                          className={
                            fixedIssues.has(issue.id)
                              ? 'bg-green-500'
                              : issue.type === 'warning'
                              ? 'bg-yellow-500 text-black'
                              : issue.type === 'opportunity'
                              ? 'bg-blue-500'
                              : ''
                          }
                        >
                          {fixedIssues.has(issue.id) ? '✓ Fixed' : issue.type.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">{issue.category}</Badge>
                        {issue.autoFixable && !fixedIssues.has(issue.id) && (
                          <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30">
                            <Zap className="h-3 w-3 mr-1" />
                            Auto-Fixable
                          </Badge>
                        )}
                      </div>
                      <h4 className="font-semibold">{issue.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {issue.description}
                      </p>
                      <p className="text-sm text-orange-400 mt-1">
                        Impact: {issue.impact}
                      </p>
                      {issue.filePath && (
                        <p className="text-xs text-muted-foreground mt-1 font-mono">
                          📁 {issue.filePath}
                        </p>
                      )}
                      {prLinks[issue.id] && (
                        <a
                          href={prLinks[issue.id]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-green-400 hover:underline mt-2 inline-flex items-center gap-1"
                        >
                          <GitPullRequest className="h-3 w-3" />
                          View PR →
                        </a>
                      )}
                    </div>
                    <div className="ml-4">
                      {!fixedIssues.has(issue.id) && issue.autoFixable && (
                        <Button
                          size="sm"
                          onClick={() => autoFixIssue(issue)}
                          disabled={fixingIssue !== null}
                          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                        >
                          {fixingIssue === issue.id ? (
                            <>
                              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                              Creating PR...
                            </>
                          ) : (
                            <>
                              <Wrench className="mr-2 h-3 w-3" />
                              Auto Fix
                            </>
                          )}
                        </Button>
                      )}
                      {!issue.autoFixable && !fixedIssues.has(issue.id) && (
                        <Badge variant="outline" className="text-muted-foreground">
                          Manual Fix Required
                        </Badge>
                      )}
                      {fixedIssues.has(issue.id) && (
                        <Badge className="bg-green-500">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          PR Created
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!auditResult && (
        <Card className="border-dashed">
          <CardContent className="pt-12 pb-12 text-center">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Audit Results Yet</h3>
            <p className="text-muted-foreground mb-4">
              Enter a URL above to run a comprehensive SEO audit. The agent will analyze the page and detect issues.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
