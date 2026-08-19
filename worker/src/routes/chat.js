import { Hono } from 'hono';
import Groq from 'groq-sdk';
import { authMiddleware } from '../lib/auth.js';
import { getSupabase } from '../lib/supabase.js';

const router = new Hono();
router.use('*', authMiddleware());

async function getPastConversations(sb, userId, currentSessionId) {
  const { data } = await sb.from('chat_sessions')
    .select('id, title, chat_messages(role, content)')
    .eq('user_id', userId)
    .neq('id', currentSessionId || 0)
    .order('updated_at', { ascending: false })
    .limit(5);
  if (!data?.length) return '';
  return data.map(s => {
    const msgs = (s.chat_messages || []).slice(-6).map(m =>
      `${m.role === 'user' ? 'ユーザー' : 'AI'}: ${m.content.slice(0, 200)}`
    ).join('\n');
    return `【${s.title}】\n${msgs}`;
  }).join('\n\n');
}

async function getAdContext(sb) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const since = thirtyDaysAgo.toISOString().slice(0, 10);

  const { data: metrics } = await sb.from('daily_metrics')
    .select('*, campaigns(campaign_name, status)')
    .gte('date', since);

  // キャンペーンごとに集計
  const grouped = {};
  for (const m of metrics || []) {
    const cid = m.campaign_id;
    if (!grouped[cid]) grouped[cid] = { campaign_name: m.campaigns?.campaign_name, status: m.campaigns?.status, total_cost: 0, total_impressions: 0, total_clicks: 0, total_conversions: 0, latest_date: '' };
    grouped[cid].total_cost += Number(m.spend || 0);
    grouped[cid].total_impressions += Number(m.impressions || 0);
    grouped[cid].total_clicks += Number(m.clicks || 0);
    grouped[cid].total_conversions += Number(m.conversions_meta || 0);
    if (m.date > grouped[cid].latest_date) grouped[cid].latest_date = m.date;
  }
  const campaigns = Object.values(grouped).sort((a, b) => b.total_cost - a.total_cost).slice(0, 10);

  const { data: memoData } = await sb.from('operation_memos')
    .select('*, campaigns(campaign_name)')
    .order('date', { ascending: false }).limit(10);
  const memos = (memoData || []).map(m => ({ campaign_name: m.campaigns?.campaign_name, date: m.date, memo_content: m.memo_content }));

  return { campaigns, memos };
}

// セッション一覧
router.get('/sessions', async (c) => {
  const sb = getSupabase(c.env);
  const user = c.get('user');
  try {
    const { data, error } = await sb.from('chat_sessions')
      .select('id, title, created_at, updated_at')
      .eq('user_id', user.userId)
      .order('updated_at', { ascending: false }).limit(50);
    if (error) throw error;
    return c.json({ sessions: data });
  } catch (e) {
    return c.json({ error: 'セッション取得に失敗しました' }, 500);
  }
});

// セッションのメッセージ取得
router.get('/sessions/:sessionId', async (c) => {
  const sb = getSupabase(c.env);
  const user = c.get('user');
  try {
    const { data: session } = await sb.from('chat_sessions')
      .select('*').eq('id', c.req.param('sessionId')).eq('user_id', user.userId).single();
    if (!session) return c.json({ error: 'セッションが見つかりません' }, 404);
    const { data: messages } = await sb.from('chat_messages')
      .select('role, content, created_at')
      .eq('session_id', c.req.param('sessionId'))
      .order('created_at', { ascending: true });
    return c.json({ session, messages: messages || [] });
  } catch (e) {
    return c.json({ error: 'メッセージ取得に失敗しました' }, 500);
  }
});

// セッション削除
router.delete('/sessions/:sessionId', async (c) => {
  const sb = getSupabase(c.env);
  const user = c.get('user');
  try {
    await sb.from('chat_sessions').delete().eq('id', c.req.param('sessionId')).eq('user_id', user.userId);
    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: '削除に失敗しました' }, 500);
  }
});

// メッセージ送信
router.post('/', async (c) => {
  const { messages, sessionId } = await c.req.json();
  if (!messages || !Array.isArray(messages)) return c.json({ error: 'messagesが必要です' }, 400);

  const sb = getSupabase(c.env);
  const user = c.get('user');
  const groq = c.env.GROQ_API_KEY ? new Groq({ apiKey: c.env.GROQ_API_KEY }) : null;

  try {
    const { campaigns, memos } = await getAdContext(sb);
    const pastConversations = await getPastConversations(sb, user.userId, sessionId);

    const systemPrompt = `あなたは広告運用の分析アシスタントです。
${pastConversations ? `\n## 過去の会話履歴（参考）\n${pastConversations}\n` : ''}

## 直近30日間のキャンペーンデータ
${campaigns.length > 0
  ? campaigns.map(c => `- ${c.campaign_name}（${c.status}）: 費用¥${Number(c.total_cost).toLocaleString()} / 表示${Number(c.total_impressions).toLocaleString()}回 / クリック${Number(c.total_clicks).toLocaleString()}回 / CV${c.total_conversions}件`).join('\n')
  : 'データなし'}

## 最近の運用メモ
${memos.length > 0
  ? memos.map(m => `- [${m.date}] ${m.campaign_name}: ${m.memo_content}`).join('\n')
  : 'メモなし'}

## 回答スタイルのルール
- 絵文字を積極的に使って視覚的にわかりやすくする
- 数値や重要な情報は**太字**で強調する
- 箇条書きを活用して読みやすくする
- 日本語で回答する
- 回答は必ず完結させる
- 1回の回答は500文字以内を目安にコンパクトにまとめる`;

    const conversationMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.filter(m => m.role === 'user' || m.role === 'assistant').map(m => ({ role: m.role, content: m.content })),
    ];

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: conversationMessages,
      max_tokens: 2048,
    });
    const text = response.choices[0]?.message?.content || '';

    const userMessage = messages[messages.length - 1];
    let currentSessionId = sessionId;

    if (!currentSessionId) {
      const title = userMessage.content.slice(0, 50) + (userMessage.content.length > 50 ? '...' : '');
      const { data: newSession } = await sb.from('chat_sessions').insert({ user_id: user.userId, title }).select('id').single();
      currentSessionId = newSession.id;
      for (const msg of messages.slice(0, -1)) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          await sb.from('chat_messages').insert({ session_id: currentSessionId, role: msg.role, content: msg.content });
        }
      }
    }

    await sb.from('chat_messages').insert({ session_id: currentSessionId, role: 'user', content: userMessage.content });
    await sb.from('chat_messages').insert({ session_id: currentSessionId, role: 'assistant', content: text });
    await sb.from('chat_sessions').update({ updated_at: new Date().toISOString() }).eq('id', currentSessionId);

    return c.json({ message: text, sessionId: currentSessionId, usage: response.usage || null });
  } catch (e) {
    console.error('チャットエラー:', e);
    return c.json({ error: 'AIとの通信に失敗しました' }, 500);
  }
});

export default router;
