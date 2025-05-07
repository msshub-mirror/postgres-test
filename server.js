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
app.post('/api/test-connection', async (req, res) => {
  const { connectionString } = req.body;
  if (!connectionString) {
    return res.status(400).json({ ok: false, error: 'connectionString is required' });
  }

  const client = new Client({ connectionString });
  try {
    await client.connect();
    // 簡易クエリでバージョン取得
    const result = await client.query('SELECT version()');
    await client.end();
    res.json({ ok: true, version: result.rows[0].version });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
