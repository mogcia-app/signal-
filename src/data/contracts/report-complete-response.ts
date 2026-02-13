import type { ReportData } from "@/types/report";

export interface ReportCompleteSuccessResponse {
  success: true;
  data: ReportData;
}

export interface ReportCompleteErrorResponse {
  success: false;
  error: string;
  details?: string;
}

export type ReportCompleteResponse = ReportCompleteSuccessResponse | ReportCompleteErrorResponse;
