import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { chatAPI } from '../utils/api';

const INITIAL_MESSAGE = { role: 'assistant', content: 'こんにちは！広告運用について何でも聞いてください。直近30日のデータをもとに分析します。' };

const AiChat = ({ onClose }) => {
  const [view, setView] = useState('chat'); // 'chat' | 'history'
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  // 前回のセッションを復元
  useEffect(() => {
    const savedSessionId = localStorage.getItem('ai_chat_session_id');
    if (savedSessionId) {
      chatAPI.getSession(savedSessionId).then(res => {
        const msgs = res.data.messages.map(m => ({ role: m.role, content: m.content }));
        if (msgs.length > 0) {
          setMessages(msgs);
          setSessionId(Number(savedSessionId));
        }
      }).catch(() => {
        localStorage.removeItem('ai_chat_session_id');
      });
    }
  }, []);

  // sessionIdをlocalStorageに保存
  useEffect(() => {
    if (sessionId) {
      localStorage.setItem('ai_chat_session_id', String(sessionId));
    }
  }, [sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const adjustHeight = (el) => {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  const loadSessions = async () => {
    setSessionsLoading(true);
    try {
      const res = await chatAPI.getSessions();
      setSessions(res.data.sessions);
    } catch {
      // ignore
    } finally {
      setSessionsLoading(false);
    }
  };

  const openHistory = () => {
    setView('history');
    loadSessions();
  };

  const loadSession = async (session) => {
    try {
      const res = await chatAPI.getSession(session.id);
      setMessages(res.data.messages.map(m => ({ role: m.role, content: m.content })));
      setSessionId(session.id);
      setView('chat');
    } catch {
      alert('会話の読み込みに失敗しました');
    }
  };

  const deleteSession = async (e, sessionId) => {
    e.stopPropagation();
    if (!window.confirm('この会話を削除しますか？')) return;
    try {
      await chatAPI.deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch {
      alert('削除に失敗しました');
    }
  };

  const newChat = () => {
    setMessages([INITIAL_MESSAGE]);
    setSessionId(null);
    setInput('');
    setView('chat');
    localStorage.removeItem('ai_chat_session_id');
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.value = '';
      textareaRef.current.style.height = 'auto';
    }
    setLoading(true);

    try {
      const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }));
      const res = await chatAPI.send(apiMessages, sessionId);
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.message }]);
      const newSessionId = sessionId || res.data.sessionId;
      if (!sessionId) setSessionId(newSessionId);
      // 即座にlocalStorageへ保存（useEffectの非同期を待たない）
      if (newSessionId) localStorage.setItem('ai_chat_session_id', String(newSessionId));
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'エラーが発生しました。もう一度お試しください。' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000,
      width: '400px', height: '560px',
      backgroundColor: '#fff', borderRadius: '16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      border: '1px solid #e2e8f0'
    }}>
      {/* ヘッダー */}
      <div style={{
        padding: '14px 16px',
        background: 'linear-gradient(135deg,#3b82f6,#6366f1)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: '700', fontSize: '0.875rem' }}>AI アシスタント</div>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.7rem' }}>広告運用データを分析中</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* 新規チャットボタン */}
          <button onClick={newChat} title="新しい会話" style={{
            background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer',
            color: '#fff', borderRadius: '8px', padding: '4px 8px', fontSize: '12px',
          }}>＋ 新規</button>
          {/* 履歴ボタン */}
          <button onClick={view === 'history' ? () => setView('chat') : openHistory} title="会話履歴" style={{
            background: view === 'history' ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.15)',
            border: 'none', cursor: 'pointer',
            color: '#fff', borderRadius: '8px', padding: '4px 8px', fontSize: '12px',
          }}>履歴</button>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.8)', fontSize: '18px', lineHeight: 1, padding: '4px'
          }}>✕</button>
        </div>
      </div>

      {/* 履歴ビュー */}
      {view === 'history' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '8px' }}>過去の会話</div>
          {sessionsLoading && <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px', fontSize: '0.82rem' }}>読み込み中...</div>}
          {!sessionsLoading && sessions.length === 0 && (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px', fontSize: '0.82rem' }}>会話履歴がありません</div>
          )}
          {sessions.map(s => (
            <div key={s.id} onClick={() => loadSession(s)} style={{
              padding: '10px 12px', marginBottom: '6px',
              borderRadius: '10px', border: '1px solid #e2e8f0',
              cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
            onMouseLeave={e => e.currentTarget.style.background = '#fff'}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.82rem', color: '#1e293b', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.title}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>{formatDate(s.updated_at)}</div>
              </div>
              <button onClick={(e) => deleteSession(e, s.id)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#cbd5e1', fontSize: '14px', padding: '4px', flexShrink: 0,
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
              onMouseLeave={e => e.currentTarget.style.color = '#cbd5e1'}
              >✕</button>
            </div>
          ))}
        </div>
      )}

      {/* チャットビュー */}
      {view === 'chat' && (
        <>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '82%',
                  padding: '10px 14px',
                  borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  backgroundColor: m.role === 'user' ? '#3b82f6' : '#f1f5f9',
                  color: m.role === 'user' ? '#fff' : '#1e293b',
                  fontSize: '0.82rem', lineHeight: '1.6',
                }}>
                  {m.role === 'assistant' ? (
                    <ReactMarkdown components={{
                      p: ({ children }) => <p style={{ margin: '0 0 8px 0' }}>{children}</p>,
                      ul: ({ children }) => <ul style={{ margin: '4px 0 8px 0', paddingLeft: '18px' }}>{children}</ul>,
                      ol: ({ children }) => <ol style={{ margin: '4px 0 8px 0', paddingLeft: '18px' }}>{children}</ol>,
                      li: ({ children }) => <li style={{ marginBottom: '4px' }}>{children}</li>,
                      strong: ({ children }) => <strong style={{ fontWeight: '700' }}>{children}</strong>,
                    }}>
                      {m.content}
                    </ReactMarkdown>
                  ) : (
                    <span style={{ whiteSpace: 'pre-wrap' }}>{m.content}</span>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  padding: '10px 14px', borderRadius: '16px 16px 16px 4px',
                  backgroundColor: '#f1f5f9', color: '#64748b', fontSize: '0.82rem'
                }}>考え中...</div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* 入力欄 */}
          <div style={{
            padding: '12px 16px', borderTop: '1px solid #e2e8f0',
            display: 'flex', gap: '8px', alignItems: 'flex-end', flexShrink: 0,
          }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => { setInput(e.target.value); adjustHeight(e.target); }}
              onKeyDown={handleKey}
              placeholder="質問を入力... (Shift+Enterで改行)"
              rows={1}
              style={{
                flex: 1, resize: 'none', border: '1.5px solid #e2e8f0',
                borderRadius: '12px', padding: '10px 14px',
                fontSize: '0.875rem', outline: 'none',
                fontFamily: 'inherit', lineHeight: '1.6',
                minHeight: '42px', maxHeight: '120px', overflowY: 'auto',
                boxSizing: 'border-box', transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = '#3b82f6'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              style={{
                width: '40px', height: '40px', borderRadius: '50%',
                background: loading || !input.trim() ? '#cbd5e1' : 'linear-gradient(135deg,#3b82f6,#6366f1)',
                border: 'none', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                color: '#fff', fontSize: '16px', display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}
            >↑</button>
          </div>
        </>
      )}
    </div>
  );
};

export default AiChat;
