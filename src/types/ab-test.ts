export type ABTestStatus = "draft" | "running" | "completed";

export type ABTestVariantResult = "pending" | "win" | "lose";

export interface ABTestVariantMetrics {
  impressions?: number;
  reach?: number;
  saves?: number;
  likes?: number;
  comments?: number;
  conversions?: number;
  engagementRate?: number;
  saveRate?: number;
}

export interface ABTestVariant {
  key: string;
  label: string;
  description?: string;
  linkedPostId?: string;
  metrics?: ABTestVariantMetrics;
  result?: ABTestVariantResult;
}

export interface ABTestRecord {
  id: string;
  userId: string;
  name: string;
  goal?: string;
  hypothesis?: string;
  primaryMetric?: string;
  status: ABTestStatus;
  notes?: string;
  winnerVariantKey?: string | null;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  variants: ABTestVariant[];
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface ABTestUpsertPayload {
  id?: string;
  name: string;
  goal?: string;
  hypothesis?: string;
  primaryMetric?: string;
  status?: ABTestStatus;
  notes?: string;
  variants: ABTestVariant[];
  winnerVariantKey?: string | null;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
}

export interface ABTestSummary {
  id: string;
  name: string;
  status: ABTestStatus;
  primaryMetric?: string;
  winnerVariantLabel?: string | null;
  summary?: string;
  completedAt?: string | null;
  variants: Array<{
    label: string;
    metrics?: ABTestVariantMetrics;
    result?: ABTestVariantResult;
    linkedPostId?: string | null;
  }>;
}

export interface ABTestResultTag {
  testId: string;
  testName: string;
  variantLabel: string;
  result?: ABTestVariantResult;
  primaryMetric?: string;
  metricSummary?: string;
  linkedPostId?: string | null;
  winnerVariantLabel?: string | null;
}

