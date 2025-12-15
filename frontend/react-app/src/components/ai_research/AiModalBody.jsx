import React from 'react';
import AiLoadingMessage from './AiLoadingMessage';
import AiErrorMessage from './AiErrorMessage';
import AiDisclaimer from './AiDisclaimer';
import AiQuickSummary from './AiQuickSummary';
import AiResultsArtist from './AiResultsArtist';
import AiResultsArtistField from './AiResultsArtistField';

const statusTextMap = {
  quick_loading: 'Gathering overview…',
  extracting_artists: 'Preparing items…',
  researching_fields: 'Filling in details…',
  complete: '',
  idle: '',
  error: '', // Don't show loading message when there's an error
};

// Expected fields that match the backend
const EXPECTED_FIELDS = ['youtube', 'bio_genres', 'website', 'music'];

const AiModalBody = ({ researchState }) => {
  const { aiError, researchPhase, quickSummary, artistsData = [] } = researchState || {};

  return (
    <div className="ai-modal-body">
      <AiLoadingMessage text={statusTextMap[researchPhase]} />
      {aiError && <AiErrorMessage error={aiError} />}
      <AiDisclaimer />
      {quickSummary && <AiQuickSummary summary={quickSummary} />}

      {artistsData.length > 0 && (
        <div className="ai-content">
          {artistsData.map(({ name, fields = {} }) => (
            <AiResultsArtist key={name} name={name}>
              {EXPECTED_FIELDS.map((field, idx) => {
                const value = fields[field];
                // Check if value exists and is not an error
                const isError = value && typeof value === 'object' && value.error;
                const hasValue = !isError && value !== undefined && value !== null;
                return (
                  <AiResultsArtistField
                    key={`${name}-${field}-${idx}`}
                    field={field}
                    value={value}
                    isLoading={!hasValue}
                  />
                );
              })}
            </AiResultsArtist>
          ))}
        </div>
      )}
    </div>
  );
};

export default AiModalBody;
