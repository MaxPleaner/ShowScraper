import React from 'react';
import ReactMarkdown from 'react-markdown';
import 'github-markdown-css/github-markdown-dark.css';

export default class AIResearchModal extends React.Component {

  render() {
    if (!this.props.isOpen) return null;

    return (
      <div className="ai-modal-overlay" onClick={this.props.onClose}>
        <div className="ai-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="ai-modal-header">
            <h2>AI Concert Research</h2>
            <div className="ai-modal-controls">
              <button
                className="ai-refetch"
                onClick={this.props.onRefetch}
                title="Re-run AI research (ignores cache)"
              >
                Re-fetch
              </button>
              <button className="ai-modal-close" onClick={this.props.onClose}>
                ×
              </button>
            </div>
          </div>

          <div className="ai-modal-body">
            {this.props.loading && (
              <div className="ai-loading">
                <i className="fas fa-spinner fa-spin"></i>
                <span> Getting quick summary...</span>
              </div>
            )}

            {this.props.error && (
              <div className="ai-error">
                <i className="fas fa-exclamation-triangle"></i>
                <span> {this.props.error}</span>
              </div>
            )}

            {(this.props.quickSummary || this.props.content) && (
              <div className="ai-disclaimer">
                <strong>⚠️ Disclaimer:</strong> Take these AI-generated results with a grain of salt.
                They are VERY LIKELY wrong about many things. Always verify information independently.
              </div>
            )}

            {this.props.quickSummary && (
              <div className="ai-quick-summary">
                <h3>Quick Summary</h3>
                <p>{this.props.quickSummary}</p>
              </div>
            )}

            {this.props.detailedLoading && !this.props.proofreading && (
              <div className="ai-loading">
                <i className="fas fa-spinner fa-spin"></i>
                <span> Extracting artist list...</span>
              </div>
            )}

            {this.props.proofreading && (
              <div className="ai-loading">
                <i className="fas fa-spinner fa-spin"></i>
                <span> Researching artist details...</span>
              </div>
            )}

            {this.props.content && (
              <div className="ai-content">
                {this.props.drafting && (
                  <div className="ai-status ai-drafting">Extracting artists…</div>
                )}
                <div className="markdown-body">
                  <ReactMarkdown key={this.props.content}>
                    {this.props.content.replace(/^\s+/, '')}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}
