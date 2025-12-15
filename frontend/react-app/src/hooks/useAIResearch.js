import { useCallback, useEffect, useState, useRef } from 'react';
import useArtistsFields from './ai_research/useArtistsFields';
import useArtistsList from './ai_research/useArtistsList';
import useQuickStage from './ai_research/useQuickStage';

/**
 * Main hook for AI research functionality.
 * 
 * Manages the three-phase research process:
 * 1. Quick Summary - Brief overview of the event
 * 2. Artists List - Extraction of artist names
 * 3. Parallel Field Lookups - Concurrent research for each artist's fields
 * 
 * @param {Object} event - The event object to research
 * @returns {Object} State and actions for the research process
 */
export default function useAiResearch(event) {
  const [aiError, setAiError] = useState(null);
  const [researchPhase, setResearchPhase] = useState('idle');
  const hasRunArtistsListRef = useRef(false);
  const hasRunArtistsFieldsRef = useRef(false);
  const runArtistsListRef = useRef(null);
  const runArtistsFieldsRef = useRef(null);
  const errorPhaseSetRef = useRef(false);
  const skipServerCacheRef = useRef(false);
  const currentSkipCacheRef = useRef(false); // Track current skipCache for phase transitions
  const [skipServerCache, setSkipServerCache] = useState(false);

  // Keep ref in sync with state
  useEffect(() => {
    skipServerCacheRef.current = skipServerCache;
  }, [skipServerCache]);

  const finishPhase = useCallback(() => {
    // Use a ref to check error state without causing re-renders
    setResearchPhase((currentPhase) => {
      // Don't advance if we're in error state
      if (currentPhase === 'error') {
        return currentPhase;
      }
      
      // Advance to next phase
      switch (currentPhase) {
        case 'quick_loading':
          return 'extracting_artists';
        case 'extracting_artists':
          return 'researching_fields';
        case 'researching_fields':
          // Reset skipServerCache when research completes
          setSkipServerCache(false);
          return 'complete';
        default:
          return currentPhase;
      }
    });
  }, []);

  const { quickSummary, run: runQuickStage, reset: resetQuickStage } = useQuickStage({
    event,
    skipServerCache,
    onComplete: finishPhase,
    onError: setAiError,
  });
  
  const { artistsDataNoFields, run: runArtistsList, reset: resetArtistsList } = useArtistsList({
    event,
    skipServerCache,
    onComplete: finishPhase,
    onError: setAiError,
  });
  
  const { artistsData, run: runArtistsFields, reset: resetArtistsFields } = useArtistsFields({
    event,
    artistsDataNoFields,
    skipServerCache,
    onComplete: finishPhase,
  });

  // Store run functions in refs to avoid dependency issues
  useEffect(() => {
    runArtistsListRef.current = runArtistsList;
  }, [runArtistsList]);

  useEffect(() => {
    runArtistsFieldsRef.current = runArtistsFields;
  }, [runArtistsFields]);

  // Reset state when event changes
  useEffect(() => {
    setAiError(null);
    setResearchPhase('idle');
    skipServerCacheRef.current = false;
    currentSkipCacheRef.current = false;
    setSkipServerCache(false);
    hasRunArtistsListRef.current = false;
    hasRunArtistsFieldsRef.current = false;
    errorPhaseSetRef.current = false;
  }, [event]);

  // Reset refs when research starts
  useEffect(() => {
    if (researchPhase === 'quick_loading') {
      hasRunArtistsListRef.current = false;
      hasRunArtistsFieldsRef.current = false;
    }
    // Also reset when going to error state
    if (researchPhase === 'error') {
      hasRunArtistsListRef.current = false;
      hasRunArtistsFieldsRef.current = false;
    }
  }, [researchPhase]);

  // Update phase to error state when error occurs (but only once)
  useEffect(() => {
    if (aiError && researchPhase !== 'complete' && researchPhase !== 'error' && !errorPhaseSetRef.current) {
      console.log(`[useAIResearch] Setting phase to error from ${researchPhase}`);
      errorPhaseSetRef.current = true;
      setResearchPhase('error');
    } else if (!aiError) {
      errorPhaseSetRef.current = false;
    }
  }, [aiError, researchPhase]);

  // Listen to researchPhase changes and trigger next phases
  // But only if there's no error
  useEffect(() => {
    // Don't trigger if we're in error state
    if (researchPhase === 'error' || aiError) {
      return;
    }
    
    // Only trigger if we're in the right phase and haven't run yet
    if (researchPhase === 'extracting_artists' && !hasRunArtistsListRef.current) {
      if (!runArtistsListRef.current) {
        console.warn('[useAIResearch] runArtistsList not available yet');
        return;
      }
      console.log(`[useAIResearch] Triggering artists_list request with skipCache=${currentSkipCacheRef.current}`);
      hasRunArtistsListRef.current = true;
      runArtistsListRef.current(currentSkipCacheRef.current);
    } else if (researchPhase === 'researching_fields' && artistsDataNoFields.length > 0 && !hasRunArtistsFieldsRef.current) {
      if (!runArtistsFieldsRef.current) {
        console.warn('[useAIResearch] runArtistsFields not available yet');
        return;
      }
      console.log(`[useAIResearch] Triggering artists_fields request with skipCache=${currentSkipCacheRef.current}`);
      hasRunArtistsFieldsRef.current = true;
      runArtistsFieldsRef.current(artistsDataNoFields);
    }
  }, [researchPhase, artistsDataNoFields.length, aiError]);

  // Wrapper to set phase when research starts
  const runAIResearch = useCallback((skipCache = false) => {
    if (!event) {
      console.error('Cannot run AI research: event is null or undefined');
      return;
    }
    
    // Always clear errors when starting a new research run
    setAiError(null);
    
    // Track skipCache for phase transitions
    currentSkipCacheRef.current = skipCache;
    
    if (skipCache) {
      // Clear all state values immediately
      resetQuickStage();
      resetArtistsList();
      resetArtistsFields();
      // Skip server cache when refetching - update both state and ref immediately
      skipServerCacheRef.current = true;
      setSkipServerCache(true);
    } else {
      skipServerCacheRef.current = false;
      setSkipServerCache(false);
    }
    
    // Reset refs to allow phases to run again
    hasRunArtistsListRef.current = false;
    hasRunArtistsFieldsRef.current = false;
    
    setResearchPhase('quick_loading');
    
    // Pass skipCache directly to run functions to avoid timing issues with refs
    console.log(`[useAIResearch] Starting research with skipCache=${skipCache}`);
    runQuickStage(skipCache);
  }, [runQuickStage, event, resetQuickStage, resetArtistsList, resetArtistsFields]);

  return {
    state: { quickSummary, artistsData, aiError, researchPhase },
    actions: { runAIResearch }
  };
}
