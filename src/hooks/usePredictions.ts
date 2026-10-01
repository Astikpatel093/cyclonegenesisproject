import { useState, useEffect, useCallback } from 'react';
import { getPrediction } from '../services/predictionService';
import type { PredictionResult } from '../types/prediction';

export function usePredictions(cycloneId = 'ACTIVE') {
  const [version, setVersion] = useState(0);
  const [selectedHorizon, setSelectedHorizon] = useState(24);
  const key = `${cycloneId}:${version}`;
  const [result, setResult] = useState<{ key: string; prediction: PredictionResult | null; error: string | null }>({ key: '', prediction: null, error: null });
  const refresh = useCallback(() => setVersion(v => v + 1), []);
  useEffect(() => {
    window.addEventListener('cyclone-refresh', refresh);
    return () => window.removeEventListener('cyclone-refresh', refresh);
  }, [refresh]);
  useEffect(() => {
    const controller = new AbortController();
    getPrediction(cycloneId, controller.signal).then(prediction => {
      if (!controller.signal.aborted) setResult({ key, prediction, error: null });
    }).catch(err => {
      if (!controller.signal.aborted) setResult({ key, prediction: null, error: err instanceof Error ? err.message : 'Prediction service unavailable.' });
    });
    return () => controller.abort();
  }, [cycloneId, key]);
  return { prediction: result.key === key ? result.prediction : null, loading: result.key !== key,
    error: result.key === key ? result.error : null, selectedHorizon, setSelectedHorizon, refresh };
}
