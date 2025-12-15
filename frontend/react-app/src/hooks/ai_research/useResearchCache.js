import { useCallback } from 'react';

const CACHE_TYPES = [
  'quick',
  'artists_list',
  'artists_fields',
];

const cacheKeyForEvent = (event, cacheType = 'quick') =>
  `aiCache:${cacheType}:${event.date}:${event.source.commonName}:${event.title}`;

const clearCacheKey = (event, cacheType) => {
  localStorage.removeItem(cacheKeyForEvent(event, cacheType));
};

const getCached = (event, cacheType) => {
  const cached = localStorage.getItem(cacheKeyForEvent(event, cacheType));
  if (!cached) return null;
  try {
    return JSON.parse(cached);
  } catch (e) {
    console.error('Error parsing cached data:', e);
    return null;
  }
};

const setCached = (event, cacheType, data) => {
  localStorage.setItem(cacheKeyForEvent(event, cacheType), JSON.stringify(data));
};

const clearCached = (event, cacheType) => {
  clearCacheKey(event, cacheType);
};

const clearAll = (event) => {
  CACHE_TYPES.forEach((cacheType) => clearCacheKey(event, cacheType));
};

/**
 * Hook for managing research cache operations.
 * Provides methods to get, set, and clear cached research data for different cache types.
 * @returns {Object} Cache operations: getCached, setCached, clearCached, clearAll
 */
export default function useResearchCache() {
  return {
    getCached,
    setCached,
    clearCached,
    clearAll,
  };
}
