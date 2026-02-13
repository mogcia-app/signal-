import type { KPIDashboard } from "@/domain/analysis/kpi/types";

export interface KPIBreakdownSuccessResponse {
  success: true;
  data: KPIDashboard;
}

export interface KPIBreakdownErrorResponse {
  success: false;
  error: string;
  details?: string;
}

export type KPIBreakdownResponse = KPIBreakdownSuccessResponse | KPIBreakdownErrorResponse;
