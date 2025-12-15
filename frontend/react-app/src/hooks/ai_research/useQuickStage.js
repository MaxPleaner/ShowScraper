import { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import useLlmServer from './useLlmServer';

const useQuickStage = ({
  event,
  skipServerCache = false,
  onComplete,
  onError,
}) => {
  const [quickSummary, setQuickSummary] = useState('');
  const accumulatedSummaryRef = useRef('');
  const skipServerCacheRef = useRef(skipServerCache);

  // Keep ref in sync with prop
  useEffect(() => {
    skipServerCacheRef.current = skipServerCache;
  }, [skipServerCache]);

  // Reset quickSummary when event changes
  useEffect(() => {
    setQuickSummary('');
    accumulatedSummaryRef.current = '';
  }, [event]);

  const receiveIncrementalData = useCallback((data) => {
    accumulatedSummaryRef.current += data;
    setQuickSummary(accumulatedSummaryRef.current);
  }, []);

  const receiveFinalData = useCallback((data) => {
    accumulatedSummaryRef.current = data;
    setQuickSummary(data);
    onComplete?.();
  }, [onComplete]);

  const handleStreamComplete = useCallback(() => {
    // When stream completes, trigger completion
    const finalSummary = accumulatedSummaryRef.current;
    console.log(`[useQuickStage] Stream completed, calling onComplete. Summary length: ${finalSummary.length}`);
    onComplete?.();
  }, [onComplete]);

  // Use a function for additionalParams so it reads the latest ref value
  const additionalParamsFn = useCallback(() => {
    const params = skipServerCacheRef.current ? { no_cache: true } : {};
    console.log(`[useQuickStage] additionalParams function called with skipServerCacheRef.current=${skipServerCacheRef.current}:`, params);
    return params;
  }, []);

  const startLlmRequest = useLlmServer({
    event,
    mode: 'quick',
    onData: receiveIncrementalData,
    onError,
    onComplete: handleStreamComplete,
    additionalParams: additionalParamsFn,
  });

  const run = useCallback((forceSkipCache = null) => {
    // If forceSkipCache is provided, use it; otherwise use ref value
    const shouldSkipCache = forceSkipCache !== null ? forceSkipCache : skipServerCacheRef.current;
    console.log(`[useQuickStage] Starting request with skipCache=${shouldSkipCache} (forceSkipCache=${forceSkipCache}, ref=${skipServerCacheRef.current})`);
    
    // Temporarily override ref for this request
    const originalValue = skipServerCacheRef.current;
    if (forceSkipCache !== null) {
      skipServerCacheRef.current = forceSkipCache;
    }
    
    startLlmRequest();
    
    // Restore original value after a tick (in case it's needed elsewhere)
    if (forceSkipCache !== null) {
      setTimeout(() => {
        skipServerCacheRef.current = originalValue;
      }, 0);
    }
  }, [startLlmRequest]);

  const reset = useCallback(() => {
    setQuickSummary('');
  }, []);

  return { quickSummary, run, reset };
};

export default useQuickStage;
