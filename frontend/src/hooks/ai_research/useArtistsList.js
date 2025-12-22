import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { API_CONFIG } from '../../config';
import useLlmServer from './useLlmServer';

/**
 * Hook for extracting the artist list from an event.
 * 
 * Listens for 'data' SSE event which contains a JSON array of artist names.
 */
const useArtistsList = ({
  event,
  skipServerCache = false,
  onComplete,
  onError,
}) => {
  const [artistsDataNoFields, setArtistsDataNoFields] = useState([]);
  const runRef = useRef(false);
  const skipServerCacheRef = useRef(skipServerCache);

  // Keep ref in sync with prop
  useEffect(() => {
    skipServerCacheRef.current = skipServerCache;
  }, [skipServerCache]);

  // Reset artistsDataNoFields when event changes
  useEffect(() => {
    setArtistsDataNoFields([]);
    runRef.current = false;
  }, [event]);

  const receiveData = useCallback((artistsList) => {
    try {
      // Parse JSON if it's a string (from SSE)
      const parsedList = typeof artistsList === 'string' ? JSON.parse(artistsList) : artistsList;
      
      // Validate it's an array
      if (!Array.isArray(parsedList)) {
        console.error('[useArtistsList] Received invalid data, expected array:', parsedList);
        onError?.('Invalid response format from server.');
        return;
      }

      // Check if we got an empty list
      if (parsedList.length === 0) {
        console.warn('[useArtistsList] Received empty artist list');
        onError?.('No artists found for this event.');
        return;
      }

      const artistsDataNoFields = parsedList.map(name => ({ name }));
      setArtistsDataNoFields(artistsDataNoFields);
      console.log(`[useArtistsList] Received ${parsedList.length} artists:`, parsedList);
      onComplete?.(artistsDataNoFields);
    } catch (error) {
      console.error('[useArtistsList] Error parsing artist list:', error);
      onError?.('Failed to parse artist list from server.');
    }
  }, [onComplete, onError]);


  const handleError = useCallback((errorMessage) => {
    console.error('[useArtistsList] Error:', errorMessage);
    runRef.current = false; // Reset so we can retry
    onError?.(errorMessage);
  }, [onError]);

  const handleStreamComplete = useCallback(() => {
    console.log(`[useArtistsList] Stream completed`);
    runRef.current = false; // Reset when stream completes
    // If we already have data, onComplete was already called in receiveData
    // If we don't have data, check if we should error
    if (artistsDataNoFields.length === 0) {
      console.warn('[useArtistsList] Stream completed but no artists received');
    }
  }, [artistsDataNoFields.length]);

  // Use a function for additionalParams so it reads the latest ref value
  const additionalParamsFn = useCallback(() => {
    const params = skipServerCacheRef.current ? { no_cache: true } : {};
    console.log(`[useArtistsList] additionalParams function called with skipServerCacheRef.current=${skipServerCacheRef.current}:`, params);
    return params;
  }, []);

  const startLlmRequest = useLlmServer({
    event,
    mode: 'artists_list',
    onData: receiveData,
    onError: handleError,
    onComplete: handleStreamComplete,
    additionalParams: additionalParamsFn,
  });

  const run = useCallback((forceSkipCache = null) => {
    // Prevent multiple calls
    if (runRef.current) {
      console.log('[useArtistsList] Run already in progress, skipping');
      return;
    }
    
    runRef.current = true;
    const shouldSkipCache = forceSkipCache !== null ? forceSkipCache : skipServerCacheRef.current;
    console.log(`[useArtistsList] Starting LLM request with skipCache=${shouldSkipCache} (forceSkipCache=${forceSkipCache}, ref=${skipServerCacheRef.current})`);
    
    // Temporarily override ref for this request
    const originalValue = skipServerCacheRef.current;
    if (forceSkipCache !== null) {
      skipServerCacheRef.current = forceSkipCache;
    }
    
    startLlmRequest();
    
    // Restore original value after a tick
    if (forceSkipCache !== null) {
      setTimeout(() => {
        skipServerCacheRef.current = originalValue;
      }, 0);
    }
  }, [startLlmRequest]);

  // Reset runRef when event changes or when reset is called
  useEffect(() => {
    runRef.current = false;
  }, [event]);

  const reset = useCallback(() => {
    setArtistsDataNoFields([]);
    runRef.current = false;
  }, []);

  return { artistsDataNoFields, run, reset };
};

export default useArtistsList;
