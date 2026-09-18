import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  User,
  AlertTriangle,
  RefreshCw,
  Activity,
  ArrowRight,
  Compass,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Wrench,
  ShieldCheck,
  TrendingUp,
  Sliders,
  Plus,
  Clock,
  Sun,
  Moon
} from 'lucide-react';
import { sendChatMessage } from '../../api/chat';

const HERO_CHIPS = [
  { label: 'Which assets are degraded?', query: 'Which assets are degraded?' },
  { label: 'Highest failure risk', query: 'Which assets have highest failure risk?' },
  { label: 'Troubleshoot A035', query: 'Troubleshoot A035' },
  { label: 'Fleet readiness summary', query: 'Fleet readiness summary' },
  { label: 'Recent anomalies', query: 'Show recent anomalies' },
  { label: 'Compare A021 and A035', query: 'Compare A021 and A035' },
  { label: 'Is A021 getting worse?', query: 'Is A021 getting worse?' },
  { label: 'Congestion & bottlenecks', query: 'Congestion status and operational bottlenecks' },
  { label: 'Waiting vessels & berths', query: 'Waiting vessels and berth allocation status' }
];

/**
 * Lightweight, robust Markdown Renderer supporting:
 * - Headings (##, ###)
 * - Tables (| Col 1 | Col 2 |)
 * - Lists (- , * , 1. )
 * - Blockquotes (> )
 * - Bold (**text**), inline code (`code`), and clickable asset badges
 */
function MarkdownRenderer({ content, onNavigateTab, onInspectAsset }) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements = [];
  let tableBuffer = [];
  let listBuffer = [];
  let inCodeBlock = false;
  let codeBuffer = [];

  const formatInline = (textStr, onInspect) => {
    if (!textStr) return '';

    const parts = textStr.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        const codeText = part.slice(1, -1);
        const isAsset = /^A\d{2,6}$/i.test(codeText);
        return (
          <code
            key={idx}
            className={`chat-inline-code ${isAsset && onInspect ? 'clickable-asset' : ''}`}
            onClick={isAsset && onInspect ? () => onInspect(codeText) : undefined}
          >
            {codeText}
          </code>
        );
      }
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={idx} style={{ fontWeight: 600, color: 'var(--color-text)' }}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  const flushTable = (key) => {
    if (tableBuffer.length === 0) return null;
    const rows = [...tableBuffer];
    tableBuffer = [];

    const parseCells = (rowStr) =>
      rowStr
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim());

    if (rows.length < 2) return null;
    const headerCells = parseCells(rows[0]);
    const bodyRows = rows.slice(2).map(parseCells);

    return (
      <div key={key} className="chat-markdown-table-wrapper">
        <table className="chat-markdown-table">
          <thead>
            <tr>
              {headerCells.map((h, i) => (
                <th key={i}>{formatInline(h, onInspectAsset)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bodyRows.map((r, rIdx) => (
              <tr key={rIdx}>
                {r.map((c, cIdx) => (
                  <td key={cIdx}>{formatInline(c, onInspectAsset)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const flushList = (key) => {
    if (listBuffer.length === 0) return null;
    const items = [...listBuffer];
    listBuffer = [];
    return (
      <ul key={key} style={{ margin: '6px 0 10px 18px', padding: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {items.map((it, idx) => (
          <li key={idx} style={{ fontSize: '13px', lineHeight: '1.5', color: 'var(--color-text)' }}>
            {formatInline(it, onInspectAsset)}
          </li>
        ))}
      </ul>
    );
  };

  const flushCode = (key) => {
    if (codeBuffer.length === 0) return null;
    const code = codeBuffer.join('\n');
    codeBuffer = [];
    return (
      <pre key={key} className="chat-markdown-code-block">
        <code>{code}</code>
      </pre>
    );
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Code blocks
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(flushCode(`code-${i}`));
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Markdown Tables
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      tableBuffer.push(trimmed);
      continue;
    } else if (tableBuffer.length > 0) {
      elements.push(flushTable(`table-${i}`));
    }

    // Unordered list items
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      listBuffer.push(trimmed.slice(2));
      continue;
    } else if (listBuffer.length > 0) {
      elements.push(flushList(`list-${i}`));
    }

    // Headings
    if (trimmed.startsWith('## ')) {
      elements.push(
        <h2 key={i} style={{ fontSize: '15px', fontWeight: 700, margin: '12px 0 6px', color: 'var(--color-text)' }}>
          {formatInline(trimmed.slice(3), onInspectAsset)}
        </h2>
      );
      continue;
    }
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h3 key={i} style={{ fontSize: '13px', fontWeight: 700, margin: '10px 0 4px', color: 'var(--color-text)' }}>
          {formatInline(trimmed.slice(4), onInspectAsset)}
        </h3>
      );
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      elements.push(
        <blockquote
          key={i}
          style={{
            margin: '8px 0',
            padding: '8px 12px',
            backgroundColor: 'var(--color-bg-subtle)',
            borderLeft: '3px solid #0284c7',
            borderRadius: '4px',
            fontSize: '12px',
            color: 'var(--color-text-secondary)'
          }}
        >
          {formatInline(trimmed.slice(2), onInspectAsset)}
        </blockquote>
      );
      continue;
    }

    // Standard paragraph
    if (trimmed.length > 0) {
      elements.push(
        <p key={i} style={{ margin: '4px 0', fontSize: '13px', lineHeight: '1.55', color: 'var(--color-text)' }}>
          {formatInline(trimmed, onInspectAsset)}
        </p>
      );
    }
  }

  // Flush remaining buffers
  if (tableBuffer.length > 0) elements.push(flushTable('table-end'));
  if (listBuffer.length > 0) elements.push(flushList('list-end'));
  if (codeBuffer.length > 0) elements.push(flushCode('code-end'));

  return <div>{elements}</div>;
}

export default function MLCopilotView({
  onInspectAsset,
  onNavigateTab,
  user,
  theme = 'dark',
  onToggleTheme
}) {
  const [messages, setMessages] = useState([]);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showNewChatConfirm, setShowNewChatConfirm] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const activeRequestIdRef = useRef(null);

  // User avatar initials
  const userName = user?.name || 'Commander';
  const userInitials = userName ? userName.charAt(0).toUpperCase() : 'C';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || inputQuery).trim();
    if (!query || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      timestamp: new Date()
    };

    // Client-side request ID for race condition protection
    const reqId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    activeRequestIdRef.current = reqId;

    setMessages((prev) => [...prev, userMessage]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const response = await sendChatMessage({
        message: query,
        history: conversationHistory,
        requestId: reqId
      });

      // Discard stale response if newer request was dispatched
      if (response.requestId && activeRequestIdRef.current && response.requestId !== activeRequestIdRef.current) {
        console.warn('Discarding outdated response:', response.requestId);
        return;
      }

      const botMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: response.message,
        responseType: response.responseType,
        resultStatus: response.resultStatus || 'FOUND',
        data: response.data,
        navigation: response.navigation,
        sources: response.sources || [],
        suggestions: response.suggestions || [],
        troubleshooting: response.troubleshooting || null,
        intent: response.intent,
        confidence: response.confidence,
        success: response.success,
        timestamp: new Date()
      };

      setMessages((prev) => [...prev, botMessage]);

      // Update multi-turn history
      setConversationHistory((prev) => [
        ...prev,
        { role: 'user', content: query },
        { role: 'assistant', content: response.message }
      ]);
    } catch (error) {
      console.error('Bob AI Copilot query failed:', error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        isError: true,
        resultStatus: 'DATABASE_ERROR',
        text: 'Unable to retrieve operational intelligence. Please verify backend service and Neon database connectivity.',
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setConversationHistory([]);
    setInputQuery('');
    activeRequestIdRef.current = null;
    setShowNewChatConfirm(false);
  };

  const handleNewChatClick = () => {
    if (messages.length > 0) {
      setShowNewChatConfirm(true);
    } else {
      handleClearChat();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTriggerNavigation = (route) => {
    if (!route) return;
    const tabName = route.replace(/^\//, '').split('/')[0];
    if (onNavigateTab) {
      onNavigateTab(tabName);
    }
  };

  return (
    <div className="bob-copilot-container">
      {/* ─── Warning Confirmation Modal for New Chat ─── */}
      {showNewChatConfirm && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div
            className="modal-content"
            style={{
              maxWidth: '420px',
              padding: '24px',
              borderRadius: '12px',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  color: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px', color: 'var(--color-text)' }}>
                  Start New Conversation?
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  All current chat messages, active analysis, and context will be permanently cleared. Are you sure you want to proceed?
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
              <button
                className="secondary-btn"
                style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '6px' }}
                onClick={() => setShowNewChatConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="primary-btn"
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  borderRadius: '6px',
                  backgroundColor: '#dc2626',
                  borderColor: '#dc2626',
                  color: '#ffffff',
                  fontWeight: 600
                }}
                onClick={() => {
                  setShowNewChatConfirm(false);
                  handleClearChat();
                }}
              >
                Clear & Start New
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Copilot Control Bar ─── */}
      <div className="bob-copilot-subbar">
        <span className="bob-session-name">
          {messages.length > 0
            ? messages[0].text.length > 40
              ? messages[0].text.substring(0, 40) + '...'
              : messages[0].text
            : 'New conversation'}
        </span>

        <div className="bob-subbar-actions">
          <button className="bob-subbar-btn" onClick={handleNewChatClick}>
            <Plus size={13} />
            <span>New Chat</span>
          </button>
        </div>
      </div>

      {/* ─── Main Viewport & Scrollable Content ─── */}
      <main className="bob-copilot-content">
        {messages.length === 0 ? (
          /* ─── Hero Empty State (Blank Screen with Suggested Follow-ups) ─── */
          <div className="bob-hero-container">
            <div className="bob-hero-icon-box">
              <Bot size={24} />
            </div>
            <h2 className="bob-hero-title">Bob AI Copilot</h2>
            <p className="bob-hero-desc">
              Ask anything about mission readiness, asset telemetry, failure predictions, or fleet health.
            </p>

            <div style={{ marginTop: '10px', width: '100%' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--color-text-secondary)',
                  marginBottom: '14px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}
              >
                <Sparkles size={13} style={{ color: '#0284c7' }} />
                <span>Suggested Follow-ups & Inquiries</span>
              </div>
              <div className="bob-hero-chips-row">
                {HERO_CHIPS.map((chip, idx) => (
                  <button
                    key={idx}
                    className="bob-hero-chip"
                    onClick={() => handleSendMessage(chip.query)}
                    disabled={isLoading}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* ─── Active Conversation Stream ─── */
          <div className="bob-stream-wrapper">
            {(() => {
              const lastAssistantIndex = messages.map((m) => m.sender).lastIndexOf('assistant');

              return messages.map((msg, msgIdx) => {
                const isLatestAssistant = msgIdx === lastAssistantIndex;

                return (
                  <div
                    key={msg.id}
                    className={`bob-message-row ${msg.sender === 'user' ? 'user' : 'assistant'}`}
                  >
                    {/* Assistant Avatar */}
                    {msg.sender === 'assistant' && (
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          backgroundColor: msg.isError ? 'rgba(239, 68, 68, 0.12)' : '#2563eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          flexShrink: 0,
                          marginTop: '2px',
                          boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)'
                        }}
                      >
                        <Bot size={17} />
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div className={msg.sender === 'user' ? 'bob-user-bubble' : 'bob-assistant-bubble'}>
                      {/* Meta Bar */}
                      {msg.sender === 'assistant' && !msg.isError && (
                        <div className="chat-meta-bar">
                          <span
                            style={{
                              fontWeight: 700,
                              color: '#0284c7',
                              fontFamily: 'var(--font-family-mono)'
                            }}
                          >
                            INTENT: {(msg.intent || msg.responseType || 'DATA').toUpperCase()}
                          </span>
                          {msg.sources && msg.sources.length > 0 && (
                            <span>Sources: {msg.sources.join(', ')}</span>
                          )}
                        </div>
                      )}

                      {/* Not Found Banner */}
                      {msg.resultStatus === 'NOT_FOUND' && (
                        <div className="chat-status-banner not-found">
                          <AlertTriangle size={14} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
                          <div>
                            <div style={{ fontWeight: 600, marginBottom: '2px' }}>
                              Asset Registry Notice
                            </div>
                            <div style={{ fontSize: '11.5px', opacity: 0.9 }}>
                              The requested asset identifier is not registered in the active fleet (valid range: A001 through A050).
                            </div>
                            <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                              <button
                                className="secondary-btn"
                                style={{ height: '22px', padding: '0 8px', fontSize: '10.5px' }}
                                onClick={() => handleSendMessage('Which assets are degraded?')}
                              >
                                View Degraded Assets
                              </button>
                              <button
                                className="secondary-btn"
                                style={{ height: '22px', padding: '0 8px', fontSize: '10.5px' }}
                                onClick={() => handleSendMessage('Status of A021')}
                              >
                                Inspect A021
                              </button>
                              <button
                                className="secondary-btn"
                                style={{ height: '22px', padding: '0 8px', fontSize: '10.5px' }}
                                onClick={() => handleSendMessage('Status of A035')}
                              >
                                Inspect A035
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Markdown Formatted Content */}
                      <MarkdownRenderer
                        content={msg.text}
                        onNavigateTab={handleTriggerNavigation}
                        onInspectAsset={onInspectAsset}
                      />

                      {/* Structured Troubleshooting Cards */}
                      {(() => {
                        const tbProcedures = Array.isArray(msg.troubleshooting)
                          ? msg.troubleshooting
                          : (msg.troubleshooting?.procedures || []);
                        if (!tbProcedures || tbProcedures.length === 0) return null;
                        return (
                          <div className="troubleshooting-container">
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                color: '#0284c7',
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                                marginTop: '6px'
                              }}
                            >
                              <Wrench size={13} />
                              <span>Operational Diagnostic Procedures</span>
                            </div>
                            {tbProcedures.map((tb, tbIdx) => {
                              const pClass = String(tb.priority || 'medium').toLowerCase();
                              return (
                                <div key={tbIdx} className={`troubleshooting-card priority-${pClass}`}>
                                  <div className="troubleshooting-top">
                                    <span className="troubleshooting-comp-badge">
                                      <span
                                        style={{
                                          width: '6px',
                                          height: '6px',
                                          borderRadius: '50%',
                                          backgroundColor:
                                            pClass === 'high'
                                              ? '#ef4444'
                                              : pClass === 'medium'
                                              ? '#f59e0b'
                                              : '#0284c7',
                                          display: 'inline-block'
                                        }}
                                      />
                                      {tb.component || 'Subsystem'}
                                    </span>
                                    <span className={`troubleshooting-priority-badge ${pClass}`}>
                                      {tb.priority || 'NORMAL'} PRIORITY
                                    </span>
                                  </div>

                                  <div className="troubleshooting-row">
                                    <span className="troubleshooting-label">Diagnostic Check:</span>
                                    <span>{tb.diagnostic_check}</span>
                                  </div>

                                  {tb.telemetry_correlation && (
                                    <div className="troubleshooting-row">
                                      <span className="troubleshooting-label">Telemetry Correlation:</span>
                                      <span
                                        style={{
                                          fontFamily: 'var(--font-family-mono)',
                                          color: '#0284c7'
                                        }}
                                      >
                                        {tb.telemetry_correlation}
                                      </span>
                                    </div>
                                  )}

                                  {tb.operational_directive && (
                                    <div className="troubleshooting-row">
                                      <span className="troubleshooting-label">Operational Directive:</span>
                                      <span>{tb.operational_directive}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}


                      {/* Navigation Action Card */}
                      {msg.navigation && (
                        <div className="chat-nav-card">
                          <div>
                            {msg.navigation.breadcrumb && (
                              <div className="chat-nav-breadcrumb">
                                <Compass size={11} />
                                <span>{msg.navigation.breadcrumb.join(' → ')}</span>
                              </div>
                            )}
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)' }}>
                              {msg.navigation.label}
                            </span>
                          </div>

                          <button
                            className="chat-nav-btn"
                            onClick={() => handleTriggerNavigation(msg.navigation.route)}
                          >
                            <span>{msg.navigation.label}</span>
                            <ArrowRight size={13} />
                          </button>
                        </div>
                      )}

                      {/* Related Assets Quick Chips */}
                      {msg.data?.assets && Array.isArray(msg.data.assets) && msg.data.assets.length > 0 && (
                        <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--color-border)' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              color: 'var(--color-text-muted)',
                              textTransform: 'uppercase',
                              display: 'block',
                              marginBottom: '6px'
                            }}
                          >
                            Inspect Related Platforms:
                          </span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {msg.data.assets.slice(0, 6).map((a, idx) => {
                              const aid = a.id || a.assetId;
                              return (
                                <button
                                  key={idx}
                                  className="secondary-btn"
                                  style={{
                                    height: '24px',
                                    padding: '0 8px',
                                    fontSize: '11px',
                                    fontFamily: 'var(--font-family-mono)'
                                  }}
                                  onClick={() => onInspectAsset && onInspectAsset(aid)}
                                >
                                  <span>{aid}</span>
                                  <ChevronRight size={11} />
                                </button>
                              );
                            })}
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

                    {/* User Avatar */}
                    {msg.sender === 'user' && (
                      <div className="bob-user-avatar" style={{ marginTop: '2px', flexShrink: 0 }}>
                        {userInitials}
                      </div>
                    )}
                  </div>
                );
              });
            })()}

            {/* Loading State */}
            {isLoading && (
              <div className="bob-message-row assistant">
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}
                >
                  <Bot size={17} className="animate-spin" />
                </div>
                <div className="bob-assistant-bubble" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={14} className="animate-pulse" style={{ color: '#0284c7' }} />
                  <span>Synthesizing operational intelligence across databases...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* ─── Bottom Floating Input Bar (Seamless Edge-to-Edge Canvas) ─── */}
      <footer className="bob-input-bar-area">
        <div className="bob-input-bar-box">
          <input
            ref={inputRef}
            className="bob-chat-input"
            type="text"
            style={{
              border: 'none',
              outline: 'none',
              boxShadow: 'none',
              background: 'transparent',
              WebkitAppearance: 'none',
              MozAppearance: 'none',
              appearance: 'none',
              padding: '6px 0',
              fontSize: '13.5px',
              width: '100%'
            }}
            placeholder="Ask about mission readiness, asset telemetry, failure predictions..."
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            aria-label="Ask Bob AI Copilot"
          />

          <button
            className={`bob-send-btn ${inputQuery.trim() ? 'active' : ''}`}
            onClick={() => handleSendMessage()}
            disabled={isLoading || !inputQuery.trim()}
            aria-label="Send query"
          >
            <Send size={14} />
          </button>
        </div>
      </footer>
    </div>
  );
}
