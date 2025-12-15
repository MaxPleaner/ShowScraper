import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Format field value for display
const formatFieldValue = (field, value) => {
  if (!value) return null;
  
  // Handle objects
  if (typeof value === 'object') {
    // Check for error objects first
    if (value.error) {
      return null; // Return null to show loading/error state
    }
    // If it's an array, join with commas
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    // If explicit markdown is provided, prefer that
    if (value.markdown) {
      return value.markdown;
    }
    // If it has a URL property, render as markdown link
    if (value.url) {
      const label = value.label || value.platform || value.name || value.text || value.url;
      return `[${label}](${value.url})`;
    }
    // If it has a text/name property, use that
    if (value.text || value.name) {
      return value.text || value.name;
    }
    // Otherwise, try to stringify nicely
    return JSON.stringify(value);
  }
  
  return String(value);
};

const AiResultsArtistField = ({ field, value, isLoading }) => {
  const [progress, setProgress] = useState(0);
  
  // Distinguish a hard error from a simple not-found
  const isNotFound = value && typeof value === 'object' && value.error === 'not_found';
  const isError = value && typeof value === 'object' && value.error && value.error !== 'not_found';
  const hasValidValue = !isError && value !== undefined && value !== null;
  // Only show loading if we're actually loading (not if there's an error)
  const shouldShowLoading = isLoading && !isError;

  // Animate progress bar over 10 seconds when loading
  useEffect(() => {
    if (shouldShowLoading) {
      setProgress(0);
      const startTime = Date.now();
      const duration = 10000; // 10 seconds
      
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const newProgress = Math.min((elapsed / duration) * 100, 100);
        setProgress(newProgress);
        
        if (newProgress >= 100) {
          clearInterval(interval);
        }
      }, 50); // Update every 50ms for smooth animation
      
      return () => clearInterval(interval);
    } else {
      setProgress(0);
    }
  }, [shouldShowLoading]);

  // Normalize not_found to a friendly string so the UI shows something
  const normalizedValue = isNotFound ? '(not found)' : value;
  const formattedValue = formatFieldValue(field, normalizedValue);

  return (
    <div className="artist-field-row">
      <span className="artist-field-name">{field}:</span>
      {hasValidValue && formattedValue ? (
        <span className="artist-field-value">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{formattedValue}</ReactMarkdown>
        </span>
      ) : isError ? (
        // Show nothing or a subtle indicator when there's an error (timeout, etc.)
        <span className="artist-field-value" style={{ color: '#9ca3af', fontStyle: 'italic' }}>
          (unavailable)
        </span>
      ) : (
        <div className="progress-track" aria-label={`Loading ${field}`}>
          <div
            className="progress-fill"
            style={{ width: `${Math.max(progress, 2)}%` }}
          ></div>
          <div className="progress-percent">{Math.round(progress)}%</div>
        </div>
      )}
    </div>
  );
};

export default AiResultsArtistField;
