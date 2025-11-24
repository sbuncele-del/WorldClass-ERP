import React, { useState } from 'react';
import { Bot, X } from 'lucide-react';
import './CoPilotAssistant.css';

export const CoPilotAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        className="copilot-fab"
        onClick={() => setIsOpen(!isOpen)}
        title="AI Assistant"
      >
        {isOpen ? <X size={24} /> : <Bot size={24} />}
      </button>

      {isOpen && (
        <div className="copilot-panel">
          <div className="copilot-header">
            <div className="copilot-title">
              <Bot size={20} />
              <span>AI Assistant</span>
            </div>
          </div>
          <div className="copilot-content">
            <div className="copilot-message assistant">
              <p>Hello! I'm your AI assistant. How can I help you today?</p>
            </div>
            <div className="copilot-suggestions">
              <button className="suggestion-chip">Show financial summary</button>
              <button className="suggestion-chip">Create journal entry</button>
              <button className="suggestion-chip">Check compliance status</button>
            </div>
          </div>
          <div className="copilot-input">
            <input 
              type="text" 
              placeholder="Ask me anything..." 
              className="copilot-text-input"
            />
          </div>
        </div>
      )}
    </>
  );
};
