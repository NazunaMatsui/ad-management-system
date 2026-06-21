import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { chatAPI } from '../utils/api';

const INITIAL_MESSAGE = { role: 'assistant', content: 'こんにちは！広告運用について何でも聞いてください。直近30日のデータをもとに分析します。' };
const DAILY_LIMIT = 500000; // Groq無料枠 トークン/日
const LS_SESSION = 'ai_chat_session_id';
const LS_MESSAGES = 'ai_chat_messages';
const LS_USAGE = 'ai_chat_usage';

const AiChat = ({ onClose }) => {
  const [view, setView] = useState('chat');
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [usage, setUsage] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_USAGE)) || { total: 0, date: '' }; } catch { return { total: 0, date: '' }; }
  });
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  // 起動時にlocalStorageから即座に復元（DBが遅くても表示できる）
  useEffect(() => {
    const savedId = localStorage.getItem(LS_SESSION);
    const savedMsgs = localStorage.getItem(LS_MESSAGES);

    if (savedMsgs) {
      try {
        const msgs = JSON.parse(savedMsgs);
        if (msgs.length > 0) setMessages(msgs);
      } catch {}
    }

    if (savedId) {
      setSessionId(Number(savedId));
      // DBからも最新データを取得して上書き
      chatAPI.getSession(savedId).then(res => {
        const msgs = res.data.messages.map(m => ({ role: m.role, content: m.content }));
        if (msgs.length > 0) {
          setMessages(msgs);
          localStorage.setItem(LS_MESSAGES, JSON.stringify(msgs));
        }
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 今日の使用量をリセット（日付が変わったら）
  const getTodayUsage = () => {
    const today = new Date().toISOString().slice(0, 10);
    if (usage.date !== today) {
      const reset = { total: 0, date: today };
      setUsage(reset);
      localStorage.setItem(LS_USAGE, JSON.stringify(reset));
      return 0;
    }
    return usage.total;
  };

  const addUsage = (tokens) => {
    const today = new Date().toISOString().slice(0, 10);
    const current = usage.date === today ? usage.total : 0;
    const next = { total: current + tokens, date: today };
    setUsage(next);
    localStorage.setItem(LS_USAGE, JSON.stringify(next));
  };

  const adjustHeight = (el) => {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  const loadSessions = async () => {
    setSessionsLoading(true);
    try {
      const res = await chatAPI.getSessions();
      setSessions(res.data.sessions);
    } catch {}
    finally { setSessionsLoading(false); }
  };

  const loadSession = async (session) => {
    try {
      const res = await chatAPI.getSession(session.id);
      const msgs = res.data.messages.map(m => ({ role: m.role, content: m.content }));
      setMessages(msgs);
      setSessionId(session.id);
      localStorage.setItem(LS_SESSION, String(session.id));
      localStorage.setItem(LS_MESSAGES, JSON.stringify(msgs));
      setView('chat');
    } catch {
      alert('会話の読み込みに失敗しました');
    }
  };

  const deleteSession = async (e, sid) => {
    e.stopPropagation();
    if (!window.confirm('この会話を削除しますか？')) return;
    try {
      await chatAPI.deleteSession(sid);
      setSessions(prev => prev.filter(s => s.id !== sid));
      if (sessionId === sid) newChat();
    } catch {
      alert('削除に失敗しました');
    }
  };

  const newChat = () => {
    setMessages([INITIAL_MESSAGE]);
    setSessionId(null);
    setInput('');
    setView('chat');
    localStorage.removeItem(LS_SESSION);
    localStorage.removeItem(LS_MESSAGES);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    localStorage.setItem(LS_MESSAGES, JSON.stringify(newMessages));
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.value = '';
      textareaRef.current.style.height = 'auto';
    }
    setLoading(true);

    try {
      const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }));
      const res = await chatAPI.send(apiMessages, sessionId);
      const finalMessages = [...newMessages, { role: 'assistant', content: res.data.message }];
      setMessages(finalMessages);
      localStorage.setItem(LS_MESSAGES, JSON.stringify(finalMessages));

      const newSid = sessionId || res.data.sessionId;
      if (!sessionId && newSid) {
        setSessionId(newSid);
        localStorage.setItem(LS_SESSION, String(newSid));
        // 履歴リストに新しいセッションをすぐ追加
        const title = text.slice(0, 50) + (text.length > 50 ? '...' : '');
        setSessions(prev => [{ id: newSid, title, updated_at: new Date().toISOString() }, ...prev]);
      } else if (sessionId) {
        // 既存セッションのupdated_atを更新
        setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, updated_at: new Date().toISOString() } : s));
      }

      if (res.data.usage) {
        addUsage(res.data.usage.total_tokens || 0);
      }
    } catch {
      const errMessages = [...newMessages, { role: 'assistant', content: 'エラーが発生しました。もう一度お試しください。' }];
      setMessages(errMessages);
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

  const todayUsed = getTodayUsage();
  const usagePct = Math.min((todayUsed / DAILY_LIMIT) * 100, 100);
  const usageColor = usagePct > 80 ? '#ef4444' : usagePct > 50 ? '#f59e0b' : '#22c55e';

  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000,
      width: '400px', height: '580px',
      backgroundColor: '#fff', borderRadius: '16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      border: '1px solid #e2e8f0'
    }}>
      {/* ヘッダー */}
      <div style={{
        padding: '12px 16px',
        background: 'linear-gradient(135deg,#3b82f6,#6366f1)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '30px', height: '30px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: '700', fontSize: '0.85rem' }}>AI アシスタント</div>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.65rem' }}>広告運用データを分析中</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button onClick={newChat} style={{
            background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer',
            color: '#fff', borderRadius: '8px', padding: '4px 8px', fontSize: '11px',
          }}>＋ 新規</button>
          <button onClick={view === 'history' ? () => setView('chat') : () => { setView('history'); loadSessions(); }} style={{
            background: view === 'history' ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.15)',
            border: 'none', cursor: 'pointer',
            color: '#fff', borderRadius: '8px', padding: '4px 8px', fontSize: '11px',
          }}>履歴</button>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.8)', fontSize: '18px', lineHeight: 1, padding: '4px'
          }}>✕</button>
        </div>
      </div>

      {/* トークン使用状況バー */}
      <div style={{
        padding: '6px 14px', background: '#f8fafc',
        borderBottom: '1px solid #e2e8f0', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
          <span style={{ fontSize: '0.65rem', color: '#64748b' }}>📊 本日のトークン使用量（無料枠 50万/日）</span>
          <span style={{ fontSize: '0.65rem', fontWeight: '600', color: usageColor }}>
            {todayUsed.toLocaleString()} / {DAILY_LIMIT.toLocaleString()} ({usagePct.toFixed(1)}%)
          </span>
        </div>
        <div style={{ height: '4px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${usagePct}%`,
            background: usageColor,
            borderRadius: '2px', transition: 'width 0.4s ease',
          }} />
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
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '82%', padding: '9px 13px',
                  borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  backgroundColor: m.role === 'user' ? '#3b82f6' : '#f1f5f9',
                  color: m.role === 'user' ? '#fff' : '#1e293b',
                  fontSize: '0.82rem', lineHeight: '1.6',
                }}>
                  {m.role === 'assistant' ? (
                    <ReactMarkdown components={{
                      p: ({ children }) => <p style={{ margin: '0 0 6px 0' }}>{children}</p>,
                      ul: ({ children }) => <ul style={{ margin: '4px 0 6px 0', paddingLeft: '16px' }}>{children}</ul>,
                      ol: ({ children }) => <ol style={{ margin: '4px 0 6px 0', paddingLeft: '16px' }}>{children}</ol>,
                      li: ({ children }) => <li style={{ marginBottom: '3px' }}>{children}</li>,
                      strong: ({ children }) => <strong style={{ fontWeight: '700' }}>{children}</strong>,
                      h2: ({ children }) => <h2 style={{ fontSize: '0.85rem', fontWeight: '700', margin: '8px 0 4px 0' }}>{children}</h2>,
                      h3: ({ children }) => <h3 style={{ fontSize: '0.82rem', fontWeight: '700', margin: '6px 0 3px 0' }}>{children}</h3>,
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
                  padding: '9px 13px', borderRadius: '16px 16px 16px 4px',
                  backgroundColor: '#f1f5f9', color: '#64748b', fontSize: '0.82rem'
                }}>考え中...</div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* 入力欄 */}
          <div style={{
            padding: '10px 14px', borderTop: '1px solid #e2e8f0',
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
                borderRadius: '12px', padding: '9px 13px',
                fontSize: '0.875rem', outline: 'none',
                fontFamily: 'inherit', lineHeight: '1.6',
                minHeight: '40px', maxHeight: '120px', overflowY: 'auto',
                boxSizing: 'border-box', transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = '#3b82f6'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              style={{
                width: '38px', height: '38px', borderRadius: '50%',
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
