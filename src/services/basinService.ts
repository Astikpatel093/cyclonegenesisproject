import { requestJson } from './request';
export type BasinRiskLevel = 'LOW' | 'MODERATE' | 'HIGH';
export interface BasinZone {
  id: string; name: string; basin: string; lat: number; lon: number;
  sst: number | null; shear: number | null; humidity: number | null;
  probability: number; riskLevel: BasinRiskLevel;
}
export interface BasinAssessment {
  generatedAt: string; source: string; status: 'LIVE' | 'LATEST_AVAILABLE';
  summary: string; zones: BasinZone[];
}
export async function getBasinAssessment(signal?: AbortSignal): Promise<BasinAssessment> {
  const payload = await requestJson<{ data: BasinAssessment }>('/basin/risk', signal);
  if (!Array.isArray(payload.data?.zones)) throw new Error('The basin assessment is incomplete.');
  return payload.data;
}
