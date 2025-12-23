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
 * @param {Function} params.onComplete - Callback when stream completes successfully
 * @param {Object|Function} params.additionalParams - Additional URL parameters to include (or function returning params)
 * @returns {Function} Function to start the request
 */
export default function useLlmServer({
  event,
  mode,
  onData,
  onError,
  onComplete,
  additionalParams = {},
}) {
  const eventSourceRef = useRef(null);

  const requestTimeoutRef = useRef(null);
  
  const cleanup = useCallback(() => {
    if (requestTimeoutRef.current) {
      clearTimeout(requestTimeoutRef.current);
      requestTimeoutRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (eventSourceRef.current) {
      console.log(`[SSE ${mode}] Request already in progress, skipping`);
      return;
    }
    if (!event) {
      console.error('Cannot start LLM request: event is null or undefined');
      onError?.('Event data is missing. Please try again.');
      return;
    }

    if (!event.source || !event.source.commonName) {
      console.error('Cannot start LLM request: event.source or event.source.commonName is missing', event);
      onError?.('Event venue data is missing. Please try again.');
      return;
    }

    // Normalize date to YYYY-MM-DD format (backend expects this)
    let normalizedDate = event.date || '';
    if (normalizedDate) {
      // Extract YYYY-MM-DD from ISO datetime string if present
      const dateMatch = normalizedDate.match(/^(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        normalizedDate = dateMatch[1];
      }
    }

    const params = new URLSearchParams({
      date: normalizedDate,
      title: event.title || '',
      venue: event.source.commonName,
      url: event.url || '',
      mode,
    });

    // Add any additional parameters (evaluate function if provided)
    const paramsToAdd = typeof additionalParams === 'function' ? additionalParams() : additionalParams;
    Object.entries(paramsToAdd || {}).forEach(([key, value]) => {
      if (key === 'no_cache') {
        // Always append as 'true' string for boolean true, omit for false
        if (value === true) {
          params.append(key, 'true');
        }
      } else if (typeof value === 'object') {
        params.append(key, JSON.stringify(value));
      } else {
        params.append(key, value);
      }
    });

    const es = new EventSource(`${API_CONFIG.CONCERT_RESEARCH_ENDPOINT}?${params.toString()}`);
    es.onmessage = null; // Disable default message handler
    eventSourceRef.current = es;

    const urlString = `${API_CONFIG.CONCERT_RESEARCH_ENDPOINT}?${params.toString()}`;
    console.log(`[SSE ${mode}] Starting EventSource connection to: ${urlString}`);
    console.log(`[SSE ${mode}] no_cache parameter:`, params.get('no_cache'));

    let hasOpened = false;
    let hasReceivedData = false;
    let errorTimeout = null;
    
    // Set overall request timeout based on mode
    const timeoutMs = mode === 'artists_fields' 
      ? API_CONFIG.DETAILED_TIMEOUT_MS 
      : mode === 'quick' 
        ? API_CONFIG.QUICK_TIMEOUT_MS 
        : API_CONFIG.DETAILED_TIMEOUT_MS; // Default to detailed timeout for other modes
    
    // Set timeout for the entire request
    requestTimeoutRef.current = setTimeout(() => {
      const isStillOpen = eventSourceRef.current?.readyState === 1; // OPEN
      const isStillConnecting = eventSourceRef.current?.readyState === 0; // CONNECTING
      if (isStillOpen || isStillConnecting) {
        console.error(`[SSE ${mode}] Request timed out after ${timeoutMs}ms`);
        cleanup();
        onError?.('Request timed out. The server may be taking longer than expected. Please try again.');
      }
    }, timeoutMs);

    // Also listen for 'open' event to confirm connection
    es.addEventListener('open', () => {
      hasOpened = true;
      console.log(`[SSE ${mode}] Connection opened (timeout: ${timeoutMs}ms)`);
      if (errorTimeout) {
        clearTimeout(errorTimeout);
        errorTimeout = null;
      }
    });

    // Register error event handler for server-sent error events
    // Only handle if there's actual error data (not just connection closure)
    es.addEventListener('error', (e) => {
      // Only treat as error if there's actual error data
      if (!e.data) {
        // No error data, this might be normal stream closure - ignore
        return;
      }
      
      hasReceivedData = true; // Mark as received so we don't treat this as connection failure
      if (errorTimeout) {
        clearTimeout(errorTimeout);
        errorTimeout = null;
      }
      console.error(`[SSE ${mode}] Received error event:`, e.data);
      cleanup();
      const errorMessage = e.data || 'An error occurred on the server.';
      onError?.(errorMessage);
    });

    // Register data event handler - extract data, try to parse JSON, pass to callback
    if (onData) {
      es.addEventListener('data', (e) => {
        hasReceivedData = true;
        if (errorTimeout) {
          clearTimeout(errorTimeout);
          errorTimeout = null;
        }
        // Reset timeout on data receipt - we're making progress
        // For artists_fields mode, we want to allow the full timeout since data comes in chunks
        if (mode !== 'artists_fields' && requestTimeoutRef.current) {
          clearTimeout(requestTimeoutRef.current);
          requestTimeoutRef.current = setTimeout(() => {
            console.error(`[SSE ${mode}] Request timed out after ${timeoutMs}ms`);
            cleanup();
            onError?.('Request timed out. The server may be taking longer than expected. Please try again.');
          }, timeoutMs);
        }
        // console.log(`[SSE ${mode}] Received data event:`, e.data?.substring(0, 100));
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

    // Handle all errors (connection errors and server-sent errors)
    es.onerror = (err) => {
      const readyState = err.target?.readyState;
      // Check if this is a MessageEvent with data (server-sent error)
      const errorData = err.data || (err instanceof MessageEvent ? err.data : null);
      
      // If connection hasn't opened yet and readyState is 0, wait a bit before erroring
      // This handles the case where EventSource fires onerror during initial connection
      if (!hasOpened && readyState === 0) {
        if (!errorTimeout) {
          errorTimeout = setTimeout(() => {
            if (!hasOpened && !hasReceivedData) {
              console.error(`SSE ${mode} Connection failed to open after timeout`);
              cleanup();
              onError?.('Failed to connect to server. Please try again.');
            }
          }, 2000); // Wait 2 seconds before declaring failure
        }
        return; // Don't error yet, wait for connection to establish
      }
      
      // If we've received data and connection closes, that's normal (stream complete)
      if (hasReceivedData && (readyState === 2 || readyState === 0)) {
        // readyState 2 = CLOSED, readyState 0 = CONNECTING (might happen during closure)
        // If we got data, the stream completed successfully
        console.log(`[SSE ${mode}] Stream completed normally (readyState: ${readyState})`);
        if (requestTimeoutRef.current) {
          clearTimeout(requestTimeoutRef.current);
          requestTimeoutRef.current = null;
        }
        cleanup();
        onComplete?.();
        return;
      }
      
      if (readyState === 1 && errorData) {
        // Server-sent error event (connection is open, server sent error message)
        console.error(`SSE ${mode} Server Error:`, errorData);
        cleanup();
        // Extract the actual error message if it's in "Error: ..." format
        const errorMessage = typeof errorData === 'string' && errorData.startsWith('Error: ')
          ? errorData.substring(7) // Remove "Error: " prefix
          : errorData;
        onError?.(errorMessage || 'Server error occurred. Please try again.');
      } else if (readyState === 2 && !hasReceivedData) {
        // Connection closed without receiving data - might be an error
        console.error(`SSE ${mode} Connection closed without data`);
        cleanup();
        onError?.('Connection closed unexpectedly. Please try again.');
      } else if (hasOpened && readyState === 0 && !hasReceivedData) {
        // Connection was open but now failed before receiving data
        console.error(`SSE ${mode} Connection Error after opening:`, err);
        cleanup();
        onError?.('Connection lost. Please try again.');
      }
      // If hasOpened && readyState === 0 && hasReceivedData, we already handled it above
    };
  }, [event, mode, onData, onError, onComplete, additionalParams, cleanup]);

  // Cleanup on unmount
  useEffect(() => () => {
    cleanup();
  }, [cleanup]);

  return start;
}
