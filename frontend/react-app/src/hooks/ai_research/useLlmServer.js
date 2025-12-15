import { useCallback, useEffect, useRef } from 'react';
import { API_CONFIG } from '../../config';

/**
 * Hook for managing LLM server EventSource connections.
 * Handles SSE streaming and cleanup.
 * 
 * @param {Object} params
 * @param {Object} params.event - The event object
 * @param {string} params.mode - The research mode ('quick', 'artists_list', 'artists_fields')
 * @param {Function} params.onData - Callback for 'data' events
 * @param {Function} params.onError - Error callback
 * @param {Object|Function} params.additionalParams - Additional URL parameters to include (or function returning params)
 * @returns {Function} Function to start the request
 */
export default function useLlmServer({
  event,
  mode,
  onData,
  onError,
  additionalParams = {},
}) {
  const eventSourceRef = useRef(null);

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (eventSourceRef.current) return;

    const params = new URLSearchParams({
      date: event.date,
      title: event.title,
      venue: event.source.commonName,
      url: event.url,
      mode,
    });

    // Add any additional parameters (evaluate function if provided)
    const paramsToAdd = typeof additionalParams === 'function' ? additionalParams() : additionalParams;
    Object.entries(paramsToAdd || {}).forEach(([key, value]) => {
      if (typeof value === 'object') {
        params.append(key, JSON.stringify(value));
      } else {
        params.append(key, value);
      }
    });

    const es = new EventSource(`${API_CONFIG.CONCERT_RESEARCH_ENDPOINT}?${params.toString()}`);
    es.onmessage = null; // Disable default message handler
    eventSourceRef.current = es;

    // Register data event handler - extract data, try to parse JSON, pass to callback
    if (onData) {
      es.addEventListener('data', (e) => {
        try {
          // Try to parse as JSON, fall back to raw string if it fails
          const parsed = JSON.parse(e.data);
          onData(parsed);
        } catch {
          // Not JSON, pass raw string (e.g., for streaming text in quick mode)
          onData(e.data);
        }
      });
    }

    es.onerror = (err) => {
      console.error(`SSE ${mode} Error:`, err);
      cleanup();
      onError?.('Failed to connect. Please try again.');
    };
  }, [event, mode, onData, onError, additionalParams, cleanup]);

  // Cleanup on unmount
  useEffect(() => () => {
    cleanup();
  }, [cleanup]);

  return start;
}
