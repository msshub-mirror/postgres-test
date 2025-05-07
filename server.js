const express = require('express');
const bodyParser = require('body-parser');
const { Client } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 静的ファイル配信(public/index.html を参照)
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

// CORS 許可（必要に応じて制限してください）
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// 接続テスト用エンドポイント
// …省略…
app.post('/api/test-connection', async (req, res) => {
  const { connectionString } = req.body;
  console.log(`[TEST] 接続試行: ${connectionString}`);    // ← 追加
  if (!connectionString) {
    console.error('[ERROR] connectionString が空です');
    return res.status(400).json({ ok: false, error: 'connectionString is required' });
  }

  const client = new Client({
    connectionString,
    // タイムアウト例: 5秒で打ち切る
    connectionTimeoutMillis: 60000,
    idle_in_transaction_session_timeout: 60000
  });
  client.on('error', err => {
    console.error('[PG CLIENT ERROR]', err);             // ← 追加
  });

  try {
    await client.connect();
    console.log('[TEST] 接続成功: クエリ実行中…');
    const result = await client.query('SELECT version()');
    console.log('[TEST] クエリ結果:', result.rows[0].version);
    await client.end();
    res.json({ ok: true, version: result.rows[0].version });
  } catch (err) {
    // スタック全体をログに出力
    console.error('[TEST ERROR]', err.stack || err);
    res.json({ ok: false, error: err.stack || err.message });
  }
});


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
