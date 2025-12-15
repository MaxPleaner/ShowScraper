import { useCallback, useState } from 'react';
import useResearchCache from './useResearchCache';
import useLlmServer from './useLlmServer';

const useQuickStage = ({
  event,
  useCache,
  onComplete,
  onError,
}) => {
  const [quickSummary, setQuickSummary] = useState('');
  const cache = useResearchCache();

  const receiveIncrementalData = (data) => {
    setQuickSummary((prev) => {
      const updated = prev + data;
      cache.setCached(event, 'quick', { quick: updated });
      return updated;
    });
  };

  const receiveFinalData = (data) => {
    setQuickSummary(data);
    cache.setCached(event, 'quick', { quick: data });
    onComplete?.();
  };

  const startLlmRequest = useLlmServer({
    event,
    mode: 'quick',
    onData: receiveIncrementalData,
    onError,
  });

  const run = () => {
    if (useCache) {
      const cached = cache.getCached(event, 'quick');
      if (cached) {
        receiveFinalData(cached.quick);
        return;
      }
    }

    startLlmRequest();
  }

  return { quickSummary, run };
};

export default useQuickStage;
