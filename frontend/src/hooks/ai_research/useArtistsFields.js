import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import useLlmServer from './useLlmServer';

// Expected fields that the server researches for each artist
const EXPECTED_FIELDS = ['youtube', 'bio', 'genres', 'website', 'music'];

/**
 * Hook for researching field details for multiple artists.
 * Uses a single EventSource connection with 'artists_fields' mode.
 * Server handles parallelization and sends back individual field values
 * for specific artists as they become available.
 */
const useArtistsFields = ({
  event,
  artistsDataNoFields,
  skipServerCache = false,
  onComplete,
}) => {
  const [artistsData, setArtistsData] = useState([]);
  const skipServerCacheRef = useRef(skipServerCache);
  const initializedKeyRef = useRef('');

  // Keep ref in sync with prop
  useEffect(() => {
    skipServerCacheRef.current = skipServerCache;
  }, [skipServerCache]);

  const initArtists = (artists) => {
    return artists.map(artist => ({
      ...artist,
      status: 'in_progress',
      fields: {},
    }));
  };

  // Initialize artistsData immediately when artistsDataNoFields becomes available
  const artistsListKey = artistsDataNoFields?.length > 0 
    ? artistsDataNoFields.map(a => typeof a === 'string' ? a : a.name).join('|')
    : '';
  
  // Initialize immediately when artistsDataNoFields changes
  useEffect(() => {
    if (artistsListKey && artistsListKey !== initializedKeyRef.current && artistsDataNoFields?.length > 0) {
      const artists = artistsDataNoFields.map(a => typeof a === 'string' ? { name: a } : a);
      const initialized = initArtists(artists);
      setArtistsData(initialized);
      initializedKeyRef.current = artistsListKey;
    } else if (!artistsListKey && artistsData.length > 0) {
      setArtistsData([]);
      initializedKeyRef.current = '';
    }
  }, [artistsListKey, artistsDataNoFields, artistsData.length]);

  // Handle incoming data events - only artist_datapoint events
  const handleData = useCallback((data) => {
    // Handle wrapped format: { type: "artist_datapoint", artist, field, value }
    if (data && data.type === 'artist_datapoint') {
      const { artist: artistName, field, value } = data;
      
      if (!artistName || !field) {
        console.warn('[useArtistsFields] Missing artist or field in datapoint:', data);
        return;
      }

      setArtistsData((prev) => {
        // Check if artist exists in the list
        const artistExists = prev.some(item => item.name === artistName);
        if (!artistExists) {
          console.warn(`[useArtistsFields] Artist "${artistName}" not found in artistsData. Current artists:`, prev.map(a => a.name));
          return prev;
        }

        return prev.map(item => {
          if (item.name !== artistName) return item;

          const updatedFields = { ...(item.fields || {}), [field]: value };
          const hasAllFields = EXPECTED_FIELDS.every(f => updatedFields[f] !== undefined);
          const newStatus = hasAllFields ? 'done' : item.status;

          return {
            ...item,
            fields: updatedFields,
            status: newStatus,
          };
        });
      });
    }
    // Ignore other event types (like "complete")
  }, []);

  const handleError = useCallback(() => {
    // Mark all in-progress artists as done (with error state)
    setArtistsData((prev) => {
      return prev.map(item => 
        item.status === 'in_progress' ? { ...item, status: 'done' } : item
      );
    });
  }, []);

  // Compute artist names for in-progress artists
  const inProgressArtists = artistsData.filter(a => a.status === 'in_progress');
  const artistNames = inProgressArtists.map(a => a.name);

  // Use a function for additionalParams so it reads the latest ref value
  const additionalParamsFn = useCallback(() => {
    const params = artistNames.length > 0 ? { artists: JSON.stringify(artistNames) } : {};
    if (skipServerCacheRef.current) {
      params.no_cache = true;
    }
    console.log(`[useArtistsFields] additionalParams function called with skipServerCacheRef.current=${skipServerCacheRef.current}, artistNames.length=${artistNames.length}:`, params);
    return params;
  }, [artistNames.join(',')]); // Use join to create stable dependency

  const startLlmRequest = useLlmServer({
    event,
    mode: 'artists_fields',
    onData: handleData,
    onError: handleError,
    additionalParams: additionalParamsFn,
  });

  // Check if all artists are complete
  useEffect(() => {
    const allComplete = artistsData.length > 0 && 
      artistsData.every(artist => artist.status === 'done');
    if (allComplete) {
      onComplete?.();
    }
  }, [artistsData, onComplete]);

  // Start request when there are in-progress artists
  useEffect(() => {
    if (artistNames.length > 0) {
      startLlmRequest();
    }
  }, [artistNames.length, startLlmRequest]);

  const run = useCallback((artistsDataNoFieldsOverride) => {
    const artists = artistsDataNoFieldsOverride || artistsDataNoFields;
    if (!artists || artists.length === 0) return;

    const initialData = initArtists(artists);
    setArtistsData(initialData);
  }, [artistsDataNoFields]);

  // Reset artistsData when event changes
  useEffect(() => {
    setArtistsData([]);
  }, [event]);

  const reset = useCallback(() => {
    setArtistsData([]);
  }, []);

  return { artistsData, run, reset };
};

export default useArtistsFields;
