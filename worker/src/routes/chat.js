import { Hono } from 'hono';
import { authMiddleware } from '../lib/auth.js';
import { getSupabase } from '../lib/supabase.js';

async function callGroq(apiKey, messages) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      messages,
      max_tokens: 2048,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error: ${res.status} ${err}`);
  }
  return res.json();
}

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

  if (!c.env.GROQ_API_KEY) return c.json({ error: 'GROQ_API_KEYが設定されていません' }, 500);

  try {
    const { campaigns, memos } = await getAdContext(sb);
    const pastConversations = await getPastConversations(sb, user.userId, sessionId);

    const systemPrompt = `あなたは広告運用の分析アシスタントです。
${pastConversations ? `\n## 過去の会話履歴（参考）\n${pastConversations}\n` : ''}

## 直近30日間のキャンペーンデータ
${campaigns.length > 0
  ? campaigns.map(camp => `- ${camp.campaign_name}（${camp.status}）: 費用¥${Number(camp.total_cost).toLocaleString()} / 表示${Number(camp.total_impressions).toLocaleString()}回 / クリック${Number(camp.total_clicks).toLocaleString()}回 / CV${camp.total_conversions}件`).join('\n')
  : 'データなし'}

## 最近の運用メモ
${memos.length > 0
  ? memos.map(m => `- [${m.date}] ${m.campaign_name}: ${m.memo_content}`).join('\n')
  : 'メモなし'}

## 回答スタイルのルール（必ず守ること）
- **必ずMarkdown形式**で回答する
- 見出しは ## や ### を使って構造化する
- 重要な数値やキーワードは **太字** で強調する
- 箇条書き（-）や番号リスト（1.）を積極的に使う
- 絵文字を使って視覚的にわかりやすくする（例：📊 💡 ⚠️ ✅ 🔺 🔻）
- 日本語で回答する
- 回答は必ず完結させる
- 内部の思考過程は絶対に出力しない（<think>タグは使わない）`;

    const conversationMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.filter(m => m.role === 'user' || m.role === 'assistant').map(m => ({ role: m.role, content: m.content })),
    ];

    const response = await callGroq(c.env.GROQ_API_KEY, conversationMessages);
    // Qwen3の<think>タグを除去
    const raw = response.choices[0]?.message?.content || '';
    const text = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

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

    return c.json({ message: text, sessionId: currentSessionId, usage: response.usage ?? null });
  } catch (e) {
    console.error('チャットエラー:', e);
    return c.json({ error: 'AIとの通信に失敗しました' }, 500);
  }
});

export default router;
