import React, { useState, useEffect } from 'react';

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
    // If it has a URL property, use that
    if (value.url) {
      return value.url;
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
  
  // Check if value is an error
  const isError = value && typeof value === 'object' && value.error;
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

  const formattedValue = formatFieldValue(field, value);

  return (
    <div className="artist-field-row">
      <span className="artist-field-name">{field}:</span>
      {hasValidValue && formattedValue ? (
        <span className="artist-field-value"> {formattedValue}</span>
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
