export interface PlanData {
  id: string;
  title: string;
  targetFollowers: number;
  currentFollowers: number;
  planPeriod: string;
  targetAudience: string;
  category: string;
  strategies: string[];
  createdAt: string;
  simulation: {
    postTypes: {
      tweet: { weeklyCount: number; followerEffect: number };
      thread: { weeklyCount: number; followerEffect: number };
      reply: { weeklyCount: number; followerEffect: number };
    };
  };
  aiPersona: {
    tone: string;
    style: string;
    personality: string;
    interests: string[];
  };
}

export interface SimulationResult {
  totalPosts: number;
  estimatedFollowers: number;
  engagementRate: number;
  reachEstimate: number;
  recommendations: string[];
}

export interface AIDiagnosisResult {
  score: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  priorityActions: string[];
}

export interface ABTestResult {
  testName: string;
  variantA: {
    name: string;
    performance: number;
  };
  variantB: {
    name: string;
    performance: number;
  };
  winner: 'A' | 'B' | 'tie';
  confidence: number;
  recommendation: string;
}
