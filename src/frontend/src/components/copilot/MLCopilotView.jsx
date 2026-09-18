import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  User,
  AlertTriangle,
  ShieldCheck,
  ChevronRight,
  RefreshCw,
  Cpu,
  CornerDownLeft,
  Activity
} from 'lucide-react';
import { askCopilotQuery } from '../../api/copilot';

const INITIAL_PROMPT_SUGGESTIONS = [
  {
    title: 'Immediate Attention Assets',
    query: 'Which assets need immediate attention?',
    desc: 'List grounded or critical-risk assets requiring immediate maintenance.'
  },
  {
    title: 'Mission Readiness Check',
    query: 'Which assets are NOT mission-ready?',
    desc: 'Verify fleet combat readiness and identify grounded platforms.'
  },
  {
    title: 'Highest Failure Risk',
    query: 'Which assets have highest failure risk?',
    desc: 'Isolate components with highest predicted probability of failure.'
  },
  {
    title: 'Subsystem Diagnostics',
    query: 'Why is asset A035 not ready?',
    desc: 'Retrieve deep causal attribution for specific platform degradation.'
  }
];

export default function MLCopilotView({ onInspectAsset }) {
  const [messages, setMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || inputQuery).trim();
    if (!query || isLoading) return;

    // Add user message
    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: query,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const response = await askCopilotQuery(query);

      const aiMessage = {
        id: Date.now() + 1,
        sender: 'copilot',
        text: response?.answer || 'Inference complete. Operational parameters evaluated.',
        intent: response?.intent,
        confidence: response?.confidence,
        evidence: response?.evidence || [],
        related_assets: response?.related_assets || [],
        timestamp: new Date()
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      console.error('AI Copilot error:', err);
      const errorMessage = {
        id: Date.now() + 1,
        sender: 'copilot',
        isError: true,
        text: 'Unable to evaluate query against live telemetry. Please verify backend connection and try again.',
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 120px)',
        minHeight: '600px',
        backgroundColor: '#060606',
        borderRadius: '10px',
        border: '1px solid var(--color-border)',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* Copilot Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          backgroundColor: '#0b0b0b',
          borderBottom: '1px solid var(--color-border)',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38bdf8'
            }}
          >
            <Bot size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
                SentinelAI Copilot
              </h2>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(34, 197, 94, 0.12)',
                  color: '#22c55e',
                  border: '1px solid rgba(34, 197, 94, 0.25)'
                }}
              >
                LIVE ML INFERENCE
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: '2px 0 0' }}>
              Tactical assistant synthesizing multi-sensor telemetry, failure predictions &amp; TreeSHAP attributions
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            className="secondary-btn"
            style={{ height: '30px', padding: '0 10px', fontSize: '11px' }}
            onClick={() => setMessages([])}
          >
            <RefreshCw size={12} />
            <span>Clear Chat</span>
          </button>
        )}
      </div>

      {/* Main Chat Area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}
      >
        {/* If no messages yet: Centered Suggestions Hero (Removed permanently once user queries) */}
        {messages.length === 0 ? (
          <div
            style={{
              margin: 'auto',
              maxWidth: '680px',
              width: '100%',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '20px 0'
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38bdf8',
                marginBottom: '16px'
              }}
            >
              <Sparkles size={32} />
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-text)', margin: '0 0 8px' }}>
              How can SentinelAI assist operational command today?
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '0 0 28px', maxWidth: '520px', lineHeight: '1.5' }}>
              Query real-time fleet health, failure predictions, degraded platforms, or mechanical root causes in natural language.
            </p>

            {/* 2x2 Centered Suggestion Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                width: '100%'
              }}
            >
              {INITIAL_PROMPT_SUGGESTIONS.map((item, index) => (
                <div
                  key={index}
                  onClick={() => handleSendMessage(item.query)}
                  style={{
                    padding: '16px',
                    backgroundColor: '#0e0e0e',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.4)';
                    e.currentTarget.style.backgroundColor = '#141414';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                    e.currentTarget.style.backgroundColor = '#0e0e0e';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text)' }}>
                      {item.title}
                    </span>
                    <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: '1.4' }}>
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Active Chat Conversation Stream */
          messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                gap: '12px',
                justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '100%'
              }}
            >
              {msg.sender === 'copilot' && (
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: msg.isError ? 'rgba(239, 68, 68, 0.15)' : 'rgba(56, 189, 248, 0.12)',
                    border: `1px solid ${msg.isError ? 'rgba(239, 68, 68, 0.3)' : 'rgba(56, 189, 248, 0.25)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: msg.isError ? '#ef4444' : '#38bdf8',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}
                >
                  <Bot size={18} />
                </div>
              )}

              <div
                style={{
                  maxWidth: msg.sender === 'user' ? '70%' : '80%',
                  padding: '14px 18px',
                  borderRadius: '10px',
                  backgroundColor: msg.sender === 'user' ? '#181818' : '#0e0e0e',
                  border: `1px solid ${msg.sender === 'user' ? '#2c2c2c' : 'var(--color-border)'}`,
                  color: 'var(--color-text)',
                  fontSize: '14px',
                  lineHeight: '1.6'
                }}
              >
                {/* Copilot Header meta */}
                {msg.sender === 'copilot' && !msg.isError && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginBottom: '8px',
                      paddingBottom: '8px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                      fontSize: '11px',
                      color: 'var(--color-text-muted)'
                    }}
                  >
                    <span style={{ fontWeight: 700, color: '#38bdf8', fontFamily: 'var(--font-family-mono)' }}>
                      INTENT: {msg.intent || 'OPERATIONAL_INFERENCE'}
                    </span>
                    {msg.confidence !== undefined && (
                      <span>Confidence: {(msg.confidence * 100).toFixed(0)}%</span>
                    )}
                  </div>
                )}

                {/* Message Body */}
                <div style={{ whiteSpace: 'pre-wrap' }}>
                  {msg.text}
                </div>

                {/* Related Assets Chips */}
                {msg.related_assets && msg.related_assets.length > 0 && (
                  <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                      Isolated Platforms:
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {msg.related_assets.map((a, i) => (
                        <button
                          key={i}
                          className="secondary-btn"
                          style={{ height: '26px', padding: '0 8px', fontSize: '11px', fontFamily: 'var(--font-family-mono)' }}
                          onClick={() => onInspectAsset && onInspectAsset(a.asset_code || a.asset_id)}
                        >
                          <span>{a.asset_code || `Asset #${a.asset_id}`}</span>
                          <ChevronRight size={12} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timestamp */}
                <div
                  style={{
                    fontSize: '10px',
                    color: 'var(--color-text-muted)',
                    textAlign: 'right',
                    marginTop: '8px',
                    fontFamily: 'var(--font-family-mono)'
                  }}
                >
                  {msg.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {msg.sender === 'user' && (
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#9ca3af',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}
                >
                  <User size={16} />
                </div>
              )}
            </div>
          ))
        )}

        {/* Loading Bubble */}
        {isLoading && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38bdf8'
              }}
            >
              <Bot size={18} className="animate-spin" />
            </div>
            <div
              style={{
                padding: '12px 18px',
                borderRadius: '10px',
                backgroundColor: '#0e0e0e',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Activity size={14} className="animate-pulse" style={{ color: '#38bdf8' }} />
              <span>Evaluating telemetry across 2,200 sensor channels and ML failure pipelines...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Docked Chat Input Bar */}
      <div
        style={{
          padding: '16px 20px',
          backgroundColor: '#090909',
          borderTop: '1px solid var(--color-border)',
          flexShrink: 0
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: '#121212',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            padding: '8px 14px',
            transition: 'border-color 0.15s ease'
          }}
          onFocusCapture={(e) => (e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.5)')}
          onBlurCapture={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="Ask AI Copilot (e.g. Which assets have highest failure risk?)"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text)',
              fontSize: '14px',
              outline: 'none'
            }}
          />

          <button
            className="primary-btn"
            onClick={() => handleSendMessage()}
            disabled={isLoading || !inputQuery.trim()}
            style={{
              height: '34px',
              padding: '0 14px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>Inquire</span>
            <Send size={13} />
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '8px',
            fontSize: '11px',
            color: 'var(--color-text-muted)'
          }}
        >
          <span>Press Enter to send inquiry. SentinelAI Copilot uses multi-sensor telemetry &amp; TreeSHAP inference.</span>
          <span>Deterministic Military HUMS AI</span>
        </div>
      </div>
    </div>
  );
}

