import { useState, useCallback } from 'react';
import { getEnvironmentalSummary } from '../services/environmentalService';
import { useAsyncResource } from './useAsyncResource';
export function useEnvironmentalData(cycloneId?: string) {
  const [selectedVariable, setSelectedVariable] = useState('sst');
  const fetcher = useCallback(() => getEnvironmentalSummary(cycloneId!), [cycloneId]);
  return { ...useAsyncResource(fetcher, !!cycloneId), selectedVariable, setSelectedVariable };
}
