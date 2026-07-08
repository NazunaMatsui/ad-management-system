const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

async function getPastConversations(userId, currentSessionId) {
  const sessions = await pool.query(
    `SELECT cs.id, cs.title, cm.role, cm.content
     FROM chat_sessions cs
     JOIN chat_messages cm ON cm.session_id = cs.id
     WHERE cs.user_id = $1
       AND cs.id != $2
     ORDER BY cs.updated_at DESC, cm.created_at ASC
     LIMIT 60`,
    [userId, currentSessionId || 0]
  );

  if (sessions.rows.length === 0) return '';

  // セッションごとにグループ化
  const grouped = {};
  for (const row of sessions.rows) {
    if (!grouped[row.id]) grouped[row.id] = { title: row.title, messages: [] };
    grouped[row.id].messages.push({ role: row.role, content: row.content });
  }

  const parts = Object.values(grouped).slice(0, 5).map(s => {
    const msgs = s.messages.slice(-6).map(m =>
      `${m.role === 'user' ? 'ユーザー' : 'AI'}: ${m.content.slice(0, 200)}`
    ).join('\n');
    return `【${s.title}】\n${msgs}`;
  });

  return parts.join('\n\n');
}

async function getAdContext() {
  const campaigns = await pool.query(`
    SELECT c.campaign_name, c.status,
      SUM(m.spend) as total_cost,
      SUM(m.impressions) as total_impressions,
      SUM(m.clicks) as total_clicks,
      SUM(m.conversions_meta) as total_conversions,
      MAX(m.date) as latest_date
    FROM campaigns c
    LEFT JOIN daily_metrics m ON c.campaign_id = m.campaign_id
    WHERE m.date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY c.campaign_id, c.campaign_name, c.status
    ORDER BY total_cost DESC NULLS LAST
    LIMIT 10
  `);

  const recentMemos = await pool.query(`
    SELECT c.campaign_name, om.date, om.memo_content
    FROM operation_memos om
    JOIN campaigns c ON om.campaign_id = c.campaign_id
    ORDER BY om.date DESC
    LIMIT 10
  `);

  return { campaigns: campaigns.rows, memos: recentMemos.rows };
}

// セッション一覧取得
router.get('/sessions', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, created_at, updated_at
       FROM chat_sessions
       WHERE user_id = $1
       ORDER BY updated_at DESC
       LIMIT 50`,
      [req.user.userId]
    );
    res.json({ sessions: result.rows });
  } catch (error) {
    console.error('セッション取得エラー:', error);
    res.status(500).json({ error: 'セッション取得に失敗しました' });
  }
});

// セッションのメッセージ取得
router.get('/sessions/:sessionId', async (req, res) => {
  try {
    const session = await pool.query(
      'SELECT * FROM chat_sessions WHERE id = $1 AND user_id = $2',
      [req.params.sessionId, req.user.userId]
    );
    if (session.rows.length === 0) {
      return res.status(404).json({ error: 'セッションが見つかりません' });
    }
    const messages = await pool.query(
      'SELECT role, content, created_at FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC',
      [req.params.sessionId]
    );
    res.json({ session: session.rows[0], messages: messages.rows });
  } catch (error) {
    console.error('メッセージ取得エラー:', error);
    res.status(500).json({ error: 'メッセージ取得に失敗しました' });
  }
});

// セッション削除
router.delete('/sessions/:sessionId', async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM chat_sessions WHERE id = $1 AND user_id = $2',
      [req.params.sessionId, req.user.userId]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '削除に失敗しました' });
  }
});

// メッセージ送信
router.post('/', async (req, res) => {
  const { messages, sessionId } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messagesが必要です' });
  }

  try {
    const { campaigns, memos } = await getAdContext();
    const pastConversations = await getPastConversations(req.user.userId, sessionId);

    const systemPrompt = `あなたは広告運用の分析アシスタントです。以下の最新データをもとにユーザーの質問に答えてください。
${pastConversations ? `\n## 過去の会話履歴（参考）\n以下はユーザーとの過去の会話です。「前回〜」「さっきの〜」などの発言はこの履歴を参照してください。\n${pastConversations}\n` : ''}

## 直近30日間のキャンペーンデータ
${campaigns.length > 0
  ? campaigns.map(c => `- ${c.campaign_name}（${c.status}）: 費用¥${Number(c.total_cost || 0).toLocaleString()} / 表示${Number(c.total_impressions || 0).toLocaleString()}回 / クリック${Number(c.total_clicks || 0).toLocaleString()}回 / CV${c.total_conversions || 0}件`).join('\n')
  : 'データなし'}

## 最近の運用メモ
${memos.length > 0
  ? memos.map(m => `- [${m.date}] ${m.campaign_name}: ${m.memo_content}`).join('\n')
  : 'メモなし'}

## 回答スタイルのルール
- 絵文字を積極的に使って視覚的にわかりやすくする（例：📊 📈 💡 ✅ ⚠️ 🎯 💰 🔍）
- 数値や重要な情報は**太字**で強調する
- 箇条書きを活用して読みやすくする
- 見出しで内容を整理する（例：## 📊 分析結果）
- ポジティブな点と改善点を明確に分けて伝える
- 専門用語は使いすぎず、わかりやすい言葉で説明する
- 最後に簡潔なアクション提案を添える
- 日本語で回答する
- **回答は必ず完結させる。途中で終わらず最後まで書く**
- 1回の回答は500文字以内を目安にコンパクトにまとめる
- 詳細が必要なら「続きを教えてください」と促す`;

    const conversationMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, content: m.content })),
    ];

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: conversationMessages,
      max_tokens: 2048,
    });

    const text = response.choices[0]?.message?.content || '';

    // セッションの保存
    const userMessage = messages[messages.length - 1];
    let currentSessionId = sessionId;

    if (!currentSessionId) {
      // 新規セッション作成（最初のユーザーメッセージをタイトルに）
      const title = userMessage.content.slice(0, 50) + (userMessage.content.length > 50 ? '...' : '');
      const newSession = await pool.query(
        'INSERT INTO chat_sessions (user_id, title) VALUES ($1, $2) RETURNING id',
        [req.user.userId, title]
      );
      currentSessionId = newSession.rows[0].id;

      // 初回のみ既存メッセージ全件を保存（assistant初期メッセージ含む）
      for (const msg of messages.slice(0, -1)) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          await pool.query(
            'INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)',
            [currentSessionId, msg.role, msg.content]
          );
        }
      }
    }

    // 今回のユーザーメッセージとAI返答を保存
    await pool.query(
      'INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)',
      [currentSessionId, 'user', userMessage.content]
    );
    await pool.query(
      'INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)',
      [currentSessionId, 'assistant', text]
    );
    await pool.query(
      'UPDATE chat_sessions SET updated_at = NOW() WHERE id = $1',
      [currentSessionId]
    );

    res.json({
      message: text,
      sessionId: currentSessionId,
      usage: response.usage || null,
    });
  } catch (error) {
    console.error('チャットエラー:', error);
    res.status(500).json({ error: 'AIとの通信に失敗しました' });
  }
});

module.exports = router;
