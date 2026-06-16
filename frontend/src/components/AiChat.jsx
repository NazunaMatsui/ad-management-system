import React, { useState, useRef, useEffect } from 'react';
import { chatAPI } from '../utils/api';

const AiChat = ({ onClose }) => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'こんにちは！広告運用について何でも聞いてください。直近30日のデータをもとに分析します。' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }));
      const res = await chatAPI.send(apiMessages);
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.message }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'エラーが発生しました。もう一度お試しください。' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000,
      width: '380px', height: '520px',
      backgroundColor: '#fff', borderRadius: '16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      border: '1px solid #e2e8f0'
    }}>
      {/* ヘッダー */}
      <div style={{
        padding: '14px 16px',
        background: 'linear-gradient(135deg,#3b82f6,#6366f1)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              <line x1="9" y1="10" x2="9" y2="10"/><line x1="12" y1="10" x2="12" y2="10"/><line x1="15" y1="10" x2="15" y2="10"/>
            </svg>
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: '700', fontSize: '0.875rem' }}>AI アシスタント</div>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.7rem' }}>広告運用データを分析中</div>
          </div>
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(255,255,255,0.8)', fontSize: '18px', lineHeight: 1,
          padding: '4px'
        }}>✕</button>
      </div>

      {/* メッセージ一覧 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start'
          }}>
            <div style={{
              maxWidth: '80%',
              padding: '10px 14px',
              borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              backgroundColor: m.role === 'user' ? '#3b82f6' : '#f1f5f9',
              color: m.role === 'user' ? '#fff' : '#1e293b',
              fontSize: '0.82rem', lineHeight: '1.5',
              whiteSpace: 'pre-wrap'
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '10px 14px', borderRadius: '16px 16px 16px 4px',
              backgroundColor: '#f1f5f9', color: '#64748b', fontSize: '0.82rem'
            }}>
              考え中...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 入力欄 */}
      <div style={{
        padding: '12px 16px', borderTop: '1px solid #e2e8f0',
        display: 'flex', gap: '8px', alignItems: 'flex-end'
      }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="質問を入力... (Enterで送信)"
          rows={1}
          style={{
            flex: 1, resize: 'none', border: '1px solid #e2e8f0',
            borderRadius: '10px', padding: '8px 12px',
            fontSize: '0.82rem', outline: 'none',
            fontFamily: 'inherit', lineHeight: '1.4',
            maxHeight: '80px', overflowY: 'auto'
          }}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: loading || !input.trim() ? '#cbd5e1' : 'linear-gradient(135deg,#3b82f6,#6366f1)',
            border: 'none', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            color: '#fff', fontSize: '16px', display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}
        >
          ↑
        </button>
      </div>
    </div>
  );
};

export default AiChat;
