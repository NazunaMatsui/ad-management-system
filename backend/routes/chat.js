const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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

router.post('/', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messagesが必要です' });
  }

  try {
    const { campaigns, memos } = await getAdContext();

    const systemPrompt = `あなたは広告運用の分析アシスタントです。以下の最新データをもとにユーザーの質問に答えてください。

## 直近30日間のキャンペーンデータ
${campaigns.length > 0
  ? campaigns.map(c => `- ${c.campaign_name}（${c.status}）: 費用¥${Number(c.total_cost || 0).toLocaleString()} / 表示${Number(c.total_impressions || 0).toLocaleString()}回 / クリック${Number(c.total_clicks || 0).toLocaleString()}回 / CV${c.total_conversions || 0}件`).join('\n')
  : 'データなし'}

## 最近の運用メモ
${memos.length > 0
  ? memos.map(m => `- [${m.date}] ${m.campaign_name}: ${m.memo_content}`).join('\n')
  : 'メモなし'}

データをもとに、費用対効果・改善点・気づきなどを日本語で簡潔に答えてください。`;

    const conversationMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, content: m.content })),
    ];

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: conversationMessages,
      max_tokens: 1024,
    });

    const text = response.choices[0]?.message?.content || '';
    res.json({ message: text });
  } catch (error) {
    console.error('チャットエラー:', error);
    res.status(500).json({ error: 'AIとの通信に失敗しました' });
  }
});

module.exports = router;
