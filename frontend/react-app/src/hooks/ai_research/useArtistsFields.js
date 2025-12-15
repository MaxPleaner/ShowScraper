import { useEffect, useState, useCallback } from 'react';
import useResearchCache from './useResearchCache';
import useLlmServer from './useLlmServer';

// Expected fields that the server researches for each artist
const EXPECTED_FIELDS = ['youtube', 'bio_genres', 'website', 'music'];

/**
 * Hook for researching field details for multiple artists.
 * Uses a single EventSource connection with 'artists_fields' mode.
 * Server handles parallelization and sends back individual field values
 * for specific artists as they become available.
 */
const useArtistsFields = ({
  event,
  artistsDataNoFields,
  useCache,
  onComplete,
}) => {
  const [artistsData, setArtistsData] = useState([]);
  const cache = useResearchCache();

  const loadOrInitArtists = (artists) => {
    return artists.map(artist => {
      const cached = cache.getCached(event, `artist_fields_${artist.name}`);
      if (cached && cached.fields) {
        const hasAllFields = EXPECTED_FIELDS.every(f => cached.fields[f] !== undefined);
        return {
          ...artist,
          status: hasAllFields ? 'done' : 'in_progress',
          fields: cached.fields || {},
        };
      }
      return {
        ...artist,
        status: 'in_progress',
        fields: {},
      };
    });
  };

  // Handle incoming data events - only artist_datapoint events
  const handleData = useCallback((data) => {
    const { artist: artistName, field, value } = data;
    setArtistsData((prev) => {
      return prev.map(item => {
        if (item.name !== artistName) return item;

        const updatedFields = { ...(item.fields || {}), [field]: value };
        const hasAllFields = EXPECTED_FIELDS.every(f => updatedFields[f] !== undefined);
        const newStatus = hasAllFields ? 'done' : item.status;

        // Cache when all fields are complete
        if (hasAllFields && item.status !== 'done') {
          cache.setCached(event, `artist_fields_${artistName}`, { fields: updatedFields });
        }

        return {
          ...item,
          fields: updatedFields,
          status: newStatus,
        };
      });
    });
  }, [event, cache]);

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

  const startLlmRequest = useLlmServer({
    event,
    mode: 'artists_fields',
    onData: handleData,
    onError: handleError,
    additionalParams: () => {
      return artistNames.length > 0 ? { artists: JSON.stringify(artistNames) } : {};
    },
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

  const run = (artistsDataNoFieldsOverride) => {
    const artists = artistsDataNoFieldsOverride || artistsDataNoFields;
    if (!artists || artists.length === 0) return;

    const initialData = loadOrInitArtists(artists);
    setArtistsData(initialData);
  };

  return { artistsData, run };
};

export default useArtistsFields;
