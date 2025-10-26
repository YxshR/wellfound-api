import React, { useState, useRef, useEffect } from 'react';
import { aiAPI } from '../api/ai';
import './AiAssistant.css';

const AiAssistant = ({ isOpen, onClose, projectId, project, tasks }) => {
  const [activeTab, setActiveTab] = useState('summary');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryResult, setSummaryResult] = useState(null);
  const [summaryError, setSummaryError] = useState(null);
  
  const [questionInput, setQuestionInput] = useState('');
  const [questionLoading, setQuestionLoading] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [questionError, setQuestionError] = useState(null);
  
  const conversationEndRef = useRef(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    if (conversationEndRef.current && typeof conversationEndRef.current.scrollIntoView === 'function') {
      conversationEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversation]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('summary');
      setSummaryResult(null);
      setSummaryError(null);
      setConversation([]);
      setQuestionInput('');
      setQuestionError(null);
    }
  }, [isOpen]);

  const handleGenerateSummary = async () => {
    if (!projectId) return;
    
    setSummaryLoading(true);
    setSummaryError(null);
    
    try {
      const response = await aiAPI.generateSummary(projectId);
      if (response.success) {
        setSummaryResult(response.data);
      } else {
        throw new Error(response.error?.message || 'Failed to generate summary');
      }
    } catch (error) {
      console.error('Error generating summary:', error);
      
      // Handle specific error types
      if (error.response?.status === 503) {
        setSummaryError('AI service is currently unavailable. Please check your configuration.');
      } else if (error.response?.status === 429) {
        setSummaryError('Rate limit exceeded. Please wait a moment before trying again.');
      } else {
        setSummaryError(
          error.response?.data?.error?.message || 
          error.message ||
          'Failed to generate summary. Please try again.'
        );
      }
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleAskQuestion = async (e) => {
    e.preventDefault();
    if (!questionInput.trim() || questionLoading) return;

    const question = questionInput.trim();
    setQuestionInput('');
    setQuestionLoading(true);
    setQuestionError(null);

    // Add user question to conversation
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: question,
      timestamp: new Date()
    };
    setConversation(prev => [...prev, userMessage]);

    try {
      // Prepare context for AI
      const context = {
        projectId,
        projectName: project?.name,
        projectDescription: project?.description,
        tasks: tasks?.map(task => ({
          id: task._id,
          title: task.title,
          description: task.description,
          status: task.status
        })) || []
      };

      const response = await aiAPI.askQuestion(question, context);
      
      if (response.success) {
        const result = response.data;
        
        // Add AI response to conversation
        const aiMessage = {
          id: Date.now() + 1,
          type: 'ai',
          content: result.answer,
          timestamp: new Date(),
          tokensUsed: result.metadata?.tokenUsage,
          estimatedCost: result.usageStats?.estimatedCost,
          cached: result.cached || false
        };
        setConversation(prev => [...prev, aiMessage]);
      } else {
        throw new Error(response.error?.message || 'Failed to get answer');
      }
    } catch (error) {
      console.error('Error asking question:', error);
      
      let errorContent;
      if (error.response?.status === 503) {
        errorContent = 'AI service is currently unavailable. Please check your configuration.';
      } else if (error.response?.status === 429) {
        errorContent = 'Rate limit exceeded. Please wait a moment before asking another question.';
      } else {
        errorContent = error.response?.data?.error?.message || 
                     error.message ||
                     'Failed to get answer. Please try again.';
      }
      
      const errorMessage = {
        id: Date.now() + 1,
        type: 'error',
        content: errorContent,
        timestamp: new Date()
      };
      setConversation(prev => [...prev, errorMessage]);
      setQuestionError(errorContent);
    } finally {
      setQuestionLoading(false);
    }
  };

  const clearConversation = () => {
    setConversation([]);
    setQuestionError(null);
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getTotalTokensUsed = () => {
    return conversation
      .filter(msg => msg.type === 'ai' && msg.tokensUsed)
      .reduce((total, msg) => total + msg.tokensUsed, 0);
  };

  const getTotalEstimatedCost = () => {
    return conversation
      .filter(msg => msg.type === 'ai' && msg.estimatedCost)
      .reduce((total, msg) => total + msg.estimatedCost, 0);
  };

  const shouldShowCostWarning = () => {
    const totalCost = getTotalEstimatedCost();
    return totalCost > 0.01; // Show warning if cost exceeds 1 cent
  };

  if (!isOpen) return null;

  return (
    <div className="ai-assistant-overlay" onClick={onClose}>
      <div className="ai-assistant-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ai-assistant-header">
          <h2>AI Assistant</h2>
          <button 
            className="close-btn" 
            onClick={onClose}
            aria-label="Close AI Assistant"
          >
            ×
          </button>
        </div>

        <div className="ai-assistant-tabs">
          <button 
            className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => setActiveTab('summary')}
          >
            Project Summary
          </button>
          <button 
            className={`tab-btn ${activeTab === 'qa' ? 'active' : ''}`}
            onClick={() => setActiveTab('qa')}
          >
            Ask Questions
          </button>
        </div>

        <div className="ai-assistant-content">
          {activeTab === 'summary' && (
            <div className="summary-tab">
              <div className="tab-header">
                <p>Get an AI-generated summary of your project's current status and tasks.</p>
                <button 
                  className="generate-btn"
                  onClick={handleGenerateSummary}
                  disabled={summaryLoading}
                >
                  {summaryLoading ? 'Generating...' : 'Generate Summary'}
                </button>
              </div>

              {summaryError && (
                <div className="error-message">
                  <p>{summaryError}</p>
                </div>
              )}

              {summaryResult && (
                <div className="summary-result">
                  <div className="summary-content">
                    <h3>Project Summary</h3>
                    <div className="summary-text">
                      {summaryResult.summary}
                    </div>
                  </div>
                  
                  <div className="usage-info">
                    <small>
                      {summaryResult.cached && (
                        <span>📋 Cached result ({Math.floor(summaryResult.cacheAge || 0)}s ago) | </span>
                      )}
                      {summaryResult.metadata?.tokenUsage && (
                        <span>Tokens used: {summaryResult.metadata.tokenUsage}</span>
                      )}
                      {summaryResult.usageStats?.estimatedCost && (
                        <span> | Estimated cost: ${summaryResult.usageStats.estimatedCost.toFixed(4)}</span>
                      )}
                      {summaryResult.usageStats?.rateLimitStatus && (
                        <span> | Rate limit: {summaryResult.usageStats.rateLimitStatus.requestsInLastMinute}/{summaryResult.usageStats.rateLimitStatus.maxRequestsPerMinute}</span>
                      )}
                    </small>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'qa' && (
            <div className="qa-tab">
              <div className="tab-header">
                <p>Ask questions about your project, tasks, or get suggestions for improvements.</p>
                {conversation.length > 0 && (
                  <button 
                    className="clear-btn"
                    onClick={clearConversation}
                  >
                    Clear Conversation
                  </button>
                )}
              </div>

              <div className="conversation-container">
                {conversation.length === 0 ? (
                  <div className="conversation-empty">
                    <p>Start a conversation by asking a question about your project!</p>
                    <div className="example-questions">
                      <p><strong>Example questions:</strong></p>
                      <ul>
                        <li>"What tasks are overdue or need attention?"</li>
                        <li>"Summarize the progress in each column"</li>
                        <li>"What should I prioritize next?"</li>
                        <li>"Are there any potential blockers?"</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="conversation-messages">
                    {conversation.map((message) => (
                      <div 
                        key={message.id} 
                        className={`message ${message.type}-message`}
                      >
                        <div className="message-header">
                          <span className="message-sender">
                            {message.type === 'user' ? 'You' : 
                             message.type === 'ai' ? 'AI Assistant' : 'Error'}
                          </span>
                          <span className="message-time">
                            {formatTimestamp(message.timestamp)}
                          </span>
                        </div>
                        <div className="message-content">
                          {message.content}
                        </div>
                        {message.type === 'ai' && (message.tokensUsed || message.cached) && (
                          <div className="message-usage">
                            <small>
                              {message.cached && <span>📋 Cached | </span>}
                              {message.tokensUsed && <span>Tokens: {message.tokensUsed}</span>}
                              {message.estimatedCost && (
                                <span> | Cost: ${message.estimatedCost.toFixed(4)}</span>
                              )}
                            </small>
                          </div>
                        )}
                      </div>
                    ))}
                    <div ref={conversationEndRef} />
                  </div>
                )}
              </div>

              <form className="question-form" onSubmit={handleAskQuestion}>
                <div className="question-input-container">
                  <textarea
                    value={questionInput}
                    onChange={(e) => setQuestionInput(e.target.value)}
                    placeholder="Ask a question about your project..."
                    className="question-input"
                    rows="3"
                    disabled={questionLoading}
                  />
                  <button 
                    type="submit"
                    className="ask-btn"
                    disabled={!questionInput.trim() || questionLoading}
                  >
                    {questionLoading ? 'Asking...' : 'Ask'}
                  </button>
                </div>
              </form>

              {conversation.length > 0 && (
                <div className="session-usage">
                  <small>
                    Session total - Tokens: {getTotalTokensUsed()}
                    {getTotalEstimatedCost() > 0 && (
                      <span> | Cost: ${getTotalEstimatedCost().toFixed(4)}</span>
                    )}
                  </small>
                  {shouldShowCostWarning() && (
                    <div className="cost-warning">
                      <small>
                        ⚠️ AI usage cost is accumulating. Consider clearing conversation to reset.
                      </small>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AiAssistant;