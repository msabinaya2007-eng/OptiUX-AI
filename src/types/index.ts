export type AnalysisInputType = "url" | "screenshots" | "video";

export interface AnalysisContext {
  projectName?: string;
  targetAudience?: string;
  productDescription?: string;
  uxGoals?: string;
}

export interface AnalysisRequest {
  inputType: AnalysisInputType;
  url?: string;
  screenshots?: string[];
  videoFrames?: string[];
  context?: AnalysisContext;
}

export type Severity = "critical" | "high" | "medium" | "low";

export type UXCategory =
  | "accessibility"
  | "usability"
  | "visualHierarchy"
  | "interactionCost"
  | "cognitiveLoad";

export interface UXIssue {
  id: string;
  title: string;
  category: string;
  severity: Severity;
  description: string;
  evidence: string;
  recommendation: string;
}

export interface UXRecommendation {
  title: string;
  impact: "High" | "Medium" | "Low";
  description: string;
}

export interface UXAnalysisResult {
  overallScore: number;
  summary: string;
  categories: Record<UXCategory, number>;
  strengths: string[];
  issues: UXIssue[];
  recommendations: UXRecommendation[];
}

export interface AnalysisSession {
  id: string;
  inputType: AnalysisInputType;
  url?: string;
  screenshotCount: number;
  hasVideo: boolean;
  context?: AnalysisContext;
  result?: UXAnalysisResult;
  timestamp: string;
}

export interface ImprovedCodeRequest {
  issues: UXIssue[];
  recommendations: UXRecommendation[];
  technology: string;
  context?: AnalysisContext;
}

export interface GeneratedCodeBlock {
  issueTitle: string;
  recommendation: string;
  code: string;
}

export interface ImprovedCodeResponse {
  blocks: GeneratedCodeBlock[];
  technology: string;
}
