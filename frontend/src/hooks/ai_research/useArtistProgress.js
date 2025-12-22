import { useRef } from 'react';
import { API_CONFIG } from '../../config';

/**
 * Manages artist progress timers for the detailed research phase.
 * Handles starting, stopping, and clearing progress timers for individual artists.
 * 
 * @param {Object} callbacks
 * @param {Function} callbacks.onProgressClear - Called when all progress is cleared (progress set to 0)
 * @param {Function} callbacks.onProgressUpdate - Called when an artist's progress updates (artistName, progress, status)
 */
export default function useArtistProgress({ onProgressClear, onProgressUpdate }) {
  const artistProgressTimersRef = useRef({});

  const stopArtistProgressTimer = (artist) => {
    const timer = artistProgressTimersRef.current[artist];
    if (timer) {
      clearInterval(timer);
      delete artistProgressTimersRef.current[artist];
    }
  };

  const clearArtistProgress = () => {
    Object.values(artistProgressTimersRef.current).forEach(clearInterval);
    artistProgressTimersRef.current = {};
    onProgressClear?.();
  };

  const startArtistProgress = (list) => {
    clearArtistProgress();
    list.forEach((artistName) => {
      const start = Date.now();
      const tick = () => {
        const elapsed = Date.now() - start;
        const pct = Math.min(100, Math.round((elapsed / API_CONFIG.ARTIST_PROGRESS_DURATION_MS) * 100));
        onProgressUpdate?.(artistName, pct, 'in_progress');
        if (elapsed >= API_CONFIG.ARTIST_PROGRESS_DURATION_MS) {
          stopArtistProgressTimer(artistName);
        }
      };
      tick();
      artistProgressTimersRef.current[artistName] = setInterval(tick, 300);
    });
  };

  return {
    clearArtistProgress,
    stopArtistProgress: stopArtistProgressTimer,
    startArtistProgress,
  };
}
