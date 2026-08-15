export interface Keyword {
  keyword: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  url?: string;
  country?: string;
  device?: string;
  trend?: "up" | "down" | "neutral";
  change?: number;
}

export interface PerformanceData {
  date: string;
  clicks: number;
  impressions: number;
  ctr?: number;
  position?: number;
}

export interface DeviceBreakdown {
  device: string;
  clicks: number;
  impressions: number;
  ctr: number;
  percentage: number;
}

export interface CountryPerformance {
  country: string;
  countryName: string;
  clicks: number;
  impressions: number;
  ctr: number;
}

export interface AuditResult {
  score: number;
  maxScore: number;
  categories: AuditCategory[];
  issues: AuditIssue[];
  timestamp: string;
}

export interface AuditCategory {
  name: string;
  score: number;
  maxScore: number;
  status: "pass" | "warning" | "fail";
}

export interface AuditIssue {
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  url?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface Competitor {
  domain: string;
  name: string;
  metrics?: {
    domainAuthority?: number;
    totalKeywords?: number;
    avgPosition?: number;
    pageSpeed?: number;
  };
}

// v5.0 - GSC Live API Types
export interface GSCLiveKeyword {
  keyword: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  url?: string;
  country?: string;
  device?: string;
}

// v5.0 - PageSpeed Insights Types
export interface CoreWebVitals {
  lcp: { value: number; rating: "good" | "needs-improvement" | "poor" };
  fid: { value: number; rating: "good" | "needs-improvement" | "poor" };
  cls: { value: number; rating: "good" | "needs-improvement" | "poor" };
  inp: { value: number; rating: "good" | "needs-improvement" | "poor" };
  ttfb: { value: number; rating: "good" | "needs-improvement" | "poor" };
  fcp: { value: number; rating: "good" | "needs-improvement" | "poor" };
}

export interface PageSpeedResult {
  url: string;
  strategy: "mobile" | "desktop";
  scores: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
  webVitals: CoreWebVitals;
  opportunities: PageSpeedOpportunity[];
  diagnostics: PageSpeedDiagnostic[];
  timestamp: string;
}

export interface PageSpeedOpportunity {
  id: string;
  title: string;
  description: string;
  savings: string;
  score: number;
}

export interface PageSpeedDiagnostic {
  id: string;
  title: string;
  description: string;
  displayValue?: string;
}

// v5.0 - Indexing API Types
export interface IndexingResult {
  url: string;
  status: "success" | "error" | "pending";
  type: "URL_UPDATED" | "URL_DELETED";
  message: string;
  timestamp: string;
}

export interface IndexingBatchResult {
  total: number;
  success: number;
  failed: number;
  results: IndexingResult[];
}

// v5.0 - Schema Validation Types
export interface SchemaValidation {
  url: string;
  valid: boolean;
  schemas: SchemaItem[];
  errors: SchemaError[];
  warnings: SchemaWarning[];
  richResultsEligible: string[];
}

export interface SchemaItem {
  type: string;
  properties: Record<string, unknown>;
  valid: boolean;
}

export interface SchemaError {
  type: string;
  message: string;
  path?: string;
}

export interface SchemaWarning {
  type: string;
  message: string;
  recommendation: string;
}
