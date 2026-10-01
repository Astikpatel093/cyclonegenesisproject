import { useState, useCallback } from 'react';
import { getHistoricalCyclones, searchCyclones, getSimilarCyclones } from '../services/historicalService';
import { useAsyncResource } from './useAsyncResource';
export function useHistoricalData() {
  const [filters, setFilters] = useState<any>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const fetcher = useCallback(() => searchQuery ? searchCyclones(searchQuery) : getHistoricalCyclones(filters), [filters, searchQuery]);
  const result = useAsyncResource(fetcher);
  return { ...result, cyclones: result.data ?? [], filters, setFilters, searchQuery, setSearchQuery, page, setPage, getSimilarCyclones };
}
