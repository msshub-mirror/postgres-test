const express = require('express');
const bodyParser = require('body-parser');
const { Client } = require('pg');
const { exec } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 静的ファイル配信
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

// CORS 許可
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// 接続テスト用エンドポイント
app.post('/api/test-connection', async (req, res) => {
  const { connectionString, query } = req.body;
  console.log(`[TEST] 接続試行: ${connectionString}`);
  if (!connectionString) {
    console.error('[ERROR] connectionString が空です');
    return res.status(400).json({ ok: false, error: 'connectionString is required' });
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
    idle_in_transaction_session_timeout: 5000
  });

  client.on('error', err => console.error('[PG CLIENT ERROR]', err));

  try {
    await client.connect();
    console.log('[TEST] 接続成功');

    const sql = query && query.trim().length > 0 ? query : 'SELECT version()';
    console.log('[TEST] 実行クエリ：', sql);
    const result = await client.query(sql);
    console.log('[TEST] クエリ結果行数:', result.rowCount);
    await client.end();

    res.json({ ok: true, rows: result.rows, rowCount: result.rowCount });
  } catch (err) {
    console.error('[TEST ERROR]', err.stack || err);
    res.json({ ok: false, error: err.stack || err.message });
  }
});

// データベース丸ごとコピーエンドポイント
app.post('/api/copy-database', (req, res) => {
  const { source, target } = req.body;
  console.log(`[COPY] ${source} => ${target}`);
  if (!source || !target) {
    return res.status(400).json({ ok: false, error: 'source と target の両方が必要です' });
  }

  const cmd = `pg_dump "${source}" | psql "${target}"`;
  exec(cmd, { timeout: 600000 }, (err, stdout, stderr) => {
    if (err) {
      console.error('[COPY ERROR]', stderr || err.message);
      return res.json({ ok: false, error: stderr || err.message });
    }
    console.log('[COPY DONE]', stdout);
    res.json({ ok: true, log: stdout || '（stdout empty）' });
  });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
