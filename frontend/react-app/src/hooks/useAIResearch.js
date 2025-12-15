import { useCallback, useEffect, useState } from 'react';
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
export default function useAiResearch(event, useCache = true) {
  const [aiError, setAiError] = useState(null);
  const [researchPhase, setResearchPhase] = useState('idle');

  const finishPhase = useCallback(() => {
    setResearchPhase((currentPhase) => {
      switch (currentPhase) {
        case 'quick_loading':
          return 'extracting_artists';
        case 'extracting_artists':
          return 'researching_fields';
        case 'researching_fields':
          return 'complete';
        default:
          return currentPhase;
      }
    });
  }, []);

  const { quickSummary, run: runQuickStage } = useQuickStage({
    event,
    useCache,
    onComplete: finishPhase,
    onError: setAiError,
  });
  
  const { artistsDataNoFields, run: runArtistsList } = useArtistsList({
    event,
    useCache,
    onComplete: finishPhase,
  });
  
  const { artistsData, run: runArtistsFields } = useArtistsFields({
    event,
    artistsDataNoFields,
    useCache,
    onComplete: finishPhase,
  });

  // Listen to researchPhase changes and trigger next phases
  useEffect(() => {
    if (researchPhase === 'extracting_artists') {
      runArtistsList();
    } else if (researchPhase === 'researching_fields' && artistsDataNoFields.length > 0) {
      runArtistsFields(artistsDataNoFields);
    }
  }, [researchPhase, artistsDataNoFields, runArtistsList, runArtistsFields]);

  // Wrapper to set phase when research starts
  const runAIResearch = useCallback(() => {
    setResearchPhase('quick_loading');
    runQuickStage();
  }, [runQuickStage]);

  return {
    state: { quickSummary, artistsData, aiError },
    actions: { runAIResearch }
  };
}
