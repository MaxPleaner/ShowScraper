import React from 'react';
import { useRecoilValue } from 'recoil';
import * as Atoms from '../../state/atoms';
import AiLoadingMessage from './AiLoadingMessage';
import AiErrorMessage from './AiErrorMessage';
import AiDisclaimer from './AiDisclaimer';
import AiQuickSummary from './AiQuickSummary';
import AiResultsArtist from './AiResultsArtist';
import AiResultsArtistField from './AiResultsArtistField';
import useAIResearch from '../../hooks/useAIResearch';

const statusTextMap = {
  gathering_overview: 'Gathering overview…',
  preparing_items: 'Preparing items…',
  filling_details: 'Filling in details…',
};

const AiModalBody = () => {
  const event = useRecoilValue(Atoms.aiModalEventState);
  const { state: { aiError, aiPhase, quickSummary, artistsData = [] } } = useAIResearch(event);

  return (
    <div className="ai-modal-body">
      <AiLoadingMessage text={statusTextMap[aiPhase]} />
      {aiError && <AiErrorMessage error={aiError} />}
      <AiDisclaimer />
      {quickSummary && <AiQuickSummary summary={quickSummary} />}

      {artistsData.length > 0 && (
        <div className="ai-content">
          {artistsData.map(({ name, fields = [] }) => (
            <AiResultsArtist key={name} name={name}>
              {fields.map(({ field, value, progress: fieldPct }, idx) => (
                <AiResultsArtistField
                  key={`${name}-${field}-${idx}`}
                  field={field}
                  value={value}
                  progress={fieldPct}
                />
              ))}
            </AiResultsArtist>
          ))}
        </div>
      )}
    </div>
  );
};

export default AiModalBody;
