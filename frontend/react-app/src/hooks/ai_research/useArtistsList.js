import { useState } from 'react';
import { API_CONFIG } from '../../config';
import useResearchCache from './useResearchCache';
import useLlmServer from './useLlmServer';

/**
 * Hook for extracting the artist list from an event.
 * 
 * Listens for 'data' SSE event which contains a JSON array of artist names.
 */
const useArtistsList = ({
  event,
  useCache,
  onComplete,
}) => {
  const [artistsDataNoFields, setArtistsDataNoFields] = useState([]);
  const cache = useResearchCache();

  const receiveData = (artistsList) => {
    const artistsDataNoFields = artistsList.map(name => ({ name }));
    setArtistsDataNoFields(artistsDataNoFields);
    cache.setCached(event, 'artists_list', { artists: artistsList });
    onComplete?.(artistsDataNoFields);
  };

  const startLlmRequest = useLlmServer({
    event,
    mode: 'artists_list',
    onData: receiveData,
  });

  const run = () => {
    if (useCache) {
      const cached = cache.getCached(event, 'artists_list');
      if (cached && cached.artists) {
        const artistsDataNoFields = cached.artists.map(name => ({ name }));
        setArtistsDataNoFields(artistsDataNoFields);
        onComplete?.(artistsDataNoFields);
        return;
      }
    }

    startLlmRequest();
  };

  return { artistsDataNoFields, run };
};

export default useArtistsList;
