"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  FileText, 
  Zap,
  Loader2,
  Plus,
  Search,
  BarChart3,
  GitPullRequest,
  Wrench,
  Lightbulb,
  BookOpen,
  CheckCircle,
  ArrowRight
} from "lucide-react"

interface ContentGap {
  id: string
  keyword: string
  searchVolume: number
  difficulty: number
  competitorRank: number
  yourRank: number | null
  opportunity: 'high' | 'medium' | 'low'
  suggestedTitle: string
  action: 'create_blog_post' | 'create_landing_page'
}

interface Competitor {
  domain: string
  visibility: number
  keywords: number
  traffic: number
  change: number
}

const AGENT_URL = "http://localhost:8080"

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [contentGaps, setContentGaps] = useState<ContentGap[]>([])
  const [newCompetitor, setNewCompetitor] = useState("")
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [creatingContent, setCreatingContent] = useState<string | null>(null)
  const [createdContent, setCreatedContent] = useState<Set<string>>(new Set())
  const [prLinks, setPrLinks] = useState<Record<string, string>>({})

  const analyzeCompetitor = async () => {
    if (!newCompetitor) return
    setLoading(true)
    
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Analyze competitor ${newCompetitor}. Find their top ranking keywords, content strategy, and identify content gaps we can exploit.`,
          agentUrl: AGENT_URL
        })
      })
      
      // Add to list
      setCompetitors(prev => [
        ...prev,
        {
          domain: newCompetitor,
          visibility: Math.floor(Math.random() * 50) + 30,
          keywords: Math.floor(Math.random() * 5000) + 1000,
          traffic: Math.floor(Math.random() * 200000) + 50000,
          change: (Math.random() * 20 - 10).toFixed(1) as unknown as number
        }
      ])
      setNewCompetitor("")
    } catch (error) {
      console.error("Analysis failed:", error)
    } finally {
      setLoading(false)
    }
  }

  const createContentForGap = async (gap: ContentGap) => {
    setCreatingContent(gap.id)
    
    try {
      const message = gap.action === 'create_blog_post'
        ? `Create a comprehensive blog post targeting the keyword "${gap.keyword}". 
           Suggested title: "${gap.suggestedTitle}". 
           This is a content gap - competitors rank #${gap.competitorRank} but we ${gap.yourRank ? `rank #${gap.yourRank}` : "don't rank"}.
           Create SEO-optimized content with proper headings, meta description, and schema markup.
           Save to blog directory and create a PR.`
        : `Create a landing page targeting "${gap.keyword}".
           Title: "${gap.suggestedTitle}".
           Include hero section, features, benefits, and call-to-action.
           Save to pages directory and create a PR.`
      
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          agentUrl: AGENT_URL
        })
      })
      
      const data = await response.json()
      
      // Extract PR link
      const prMatch = data.response?.match(/github\.com\/[^/]+\/[^/]+\/pull\/\d+/)
      if (prMatch) {
        setPrLinks(prev => ({ ...prev, [gap.id]: `https://${prMatch[0]}` }))
      }
      
      setCreatedContent(prev => {
        const newSet = new Set(prev)
        newSet.add(gap.id)
        return newSet
      })
    } catch (error) {
      console.error("Content creation failed:", error)
    } finally {
      setCreatingContent(null)
    }
  }

  const createAllHighPriority = async () => {
    const highPriorityGaps = contentGaps.filter(
      g => g.opportunity === 'high' && !createdContent.has(g.id)
    )
    
    for (const gap of highPriorityGaps) {
      await createContentForGap(gap)
      await new Promise(r => setTimeout(r, 3000)) // Delay between creations
    }
  }

  const highPriorityCount = contentGaps.filter(g => g.opportunity === 'high' && !createdContent.has(g.id)).length
  const totalOpportunityVolume = contentGaps
    .filter(g => !createdContent.has(g.id))
    .reduce((sum, g) => sum + g.searchVolume, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Competitor Analysis</h1>
          <p className="text-muted-foreground">
            Find content gaps and auto-generate content to outrank competitors
          </p>
        </div>
        {highPriorityCount > 0 && (
          <Button 
            onClick={createAllHighPriority}
            disabled={creatingContent !== null}
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
          >
            <Zap className="mr-2 h-4 w-4" />
            Create All High Priority ({highPriorityCount}) → PRs
          </Button>
        )}
      </div>

      {/* Add Competitor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Competitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="competitor-domain.com"
              value={newCompetitor}
              onChange={(e) => setNewCompetitor(e.target.value)}
              className="flex-1"
            />
            <Button onClick={analyzeCompetitor} disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Analyze
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Competitor Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Visibility Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {competitors.map((comp, idx) => (
              <div key={comp.domain} className="flex items-center gap-4">
                <div className="w-40 font-medium truncate">
                  {comp.domain.includes("You") ? (
                    <span className="text-primary">{comp.domain}</span>
                  ) : (
                    comp.domain
                  )}
                </div>
                <div className="flex-1">
                  <div className="h-8 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${
                        comp.domain.includes("You")
                          ? "bg-gradient-to-r from-purple-500 to-pink-500"
                          : "bg-gradient-to-r from-slate-400 to-slate-500"
                      }`}
                      style={{ width: `${comp.visibility}%` }}
                    />
                  </div>
                </div>
                <div className="w-16 text-right font-bold">{comp.visibility}%</div>
                <div className="w-24 text-right text-sm text-muted-foreground">
                  {comp.keywords.toLocaleString()} kw
                </div>
                <div className="w-20 text-right">
                  {comp.change > 0 ? (
                    <span className="text-green-500 flex items-center justify-end">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      +{comp.change}%
                    </span>
                  ) : (
                    <span className="text-red-500 flex items-center justify-end">
                      <TrendingDown className="h-4 w-4 mr-1" />
                      {comp.change}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Content Gap Opportunities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Content Gap Opportunities
            {analyzing && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
          </CardTitle>
          <CardDescription>
            Keywords competitors rank for that you don&apos;t. Click &quot;Create Content&quot; to auto-generate and create a PR.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
              <Lightbulb className="h-6 w-6 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-500">{contentGaps.length}</p>
              <p className="text-sm text-muted-foreground">Content Gaps Found</p>
            </div>
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
              <BarChart3 className="h-6 w-6 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-500">{totalOpportunityVolume.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Monthly Search Volume</p>
            </div>
            <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center">
              <CheckCircle className="h-6 w-6 text-purple-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-500">{createdContent.size}</p>
              <p className="text-sm text-muted-foreground">Content Created (PRs)</p>
            </div>
          </div>

          {/* Gap List */}
          <div className="space-y-4">
            {contentGaps.map((gap) => (
              <div
                key={gap.id}
                className={`p-4 rounded-lg border ${
                  createdContent.has(gap.id)
                    ? 'bg-green-500/10 border-green-500/30'
                    : gap.opportunity === 'high'
                    ? 'bg-red-500/5 border-red-500/20'
                    : gap.opportunity === 'medium'
                    ? 'bg-yellow-500/5 border-yellow-500/20'
                    : 'bg-slate-500/5 border-slate-500/20'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        variant={createdContent.has(gap.id) ? 'default' : 'secondary'}
                        className={
                          createdContent.has(gap.id)
                            ? 'bg-green-500'
                            : gap.opportunity === 'high'
                            ? 'bg-red-500'
                            : gap.opportunity === 'medium'
                            ? 'bg-yellow-500 text-black'
                            : 'bg-slate-500'
                        }
                      >
                        {createdContent.has(gap.id) ? '✓ Created' : `${gap.opportunity.toUpperCase()} PRIORITY`}
                      </Badge>
                      <Badge variant="outline">
                        {gap.searchVolume.toLocaleString()} searches/mo
                      </Badge>
                      <Badge variant="outline" className={
                        gap.difficulty < 40 ? 'text-green-500' : 
                        gap.difficulty < 60 ? 'text-yellow-500' : 'text-red-500'
                      }>
                        KD: {gap.difficulty}
                      </Badge>
                    </div>
                    
                    <h4 className="font-semibold text-lg">{gap.keyword}</h4>
                    
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span>
                        Competitors: <span className="text-green-500 font-medium">#{gap.competitorRank}</span>
                      </span>
                      <ArrowRight className="h-4 w-4" />
                      <span>
                        You: {gap.yourRank ? (
                          <span className="text-orange-500 font-medium">#{gap.yourRank}</span>
                        ) : (
                          <span className="text-red-500 font-medium">Not ranking</span>
                        )}
                      </span>
                    </div>
                    
                    <div className="mt-3 p-2 bg-muted/50 rounded flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        <span className="text-muted-foreground">Suggested: </span>
                        {gap.suggestedTitle}
                      </span>
                    </div>
                    
                    {prLinks[gap.id] && (
                      <a
                        href={prLinks[gap.id]}
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
                    {!createdContent.has(gap.id) ? (
                      <Button
                        onClick={() => createContentForGap(gap)}
                        disabled={creatingContent !== null}
                        className={
                          gap.opportunity === 'high'
                            ? "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
                            : "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                        }
                      >
                        {creatingContent === gap.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <FileText className="mr-2 h-4 w-4" />
                            Create Content
                          </>
                        )}
                      </Button>
                    ) : (
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
    </div>
  )
}
