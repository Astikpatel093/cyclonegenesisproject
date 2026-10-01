import { requestJson } from './request';
import type { PredictionResult, IntensityForecast } from '../types/prediction';

export async function getPrediction(cycloneId = 'ACTIVE', signal?: AbortSignal): Promise<PredictionResult> {
  const json = await requestJson<{ stormId: string; data: PredictionResult & { issuedAt: string; generatedAt: string } }>(
    `/cyclone/${encodeURIComponent(cycloneId || 'ACTIVE')}/predictions`, signal,
  );
  if (!json.data || !Array.isArray(json.data.forecastPoints)) throw new Error('The prediction response is incomplete.');
  return { ...json.data, cycloneId: json.stormId, predictionTime: json.data.issuedAt,
    intensityForecasts: json.data.intensityForecasts ?? [], uncertaintyCones: [] };
}
export async function getIntensityForecast(cycloneId = 'ACTIVE'): Promise<IntensityForecast[]> {
  return (await getPrediction(cycloneId)).intensityForecasts;
}
