const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const TEST_PORT = 34321;

function waitForServer(url, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tryOnce = async () => {
      try {
        const res = await fetch(url);
        if (res.ok || res.status === 404) return resolve();
      } catch {
        // not up yet
      }
      if (Date.now() > deadline) return reject(new Error('サーバー起動待機がタイムアウトしました'));
      setTimeout(tryOnce, 200);
    };
    tryOnce();
  });
}

function spawnServer(envDirs) {
  return spawn('node', ['src/server.js'], {
    cwd: PROJECT_ROOT,
    env: {
      ...process.env,
      MEMORY_ASSISTANT_DATA_DIR: envDirs.dataDir,
      MEMORY_ASSISTANT_BACKUP_DIR: envDirs.backupDir,
      MEMORY_ASSISTANT_EXPORT_DIR: envDirs.exportDir,
      MEMORY_ASSISTANT_CONFIG_PATH: envDirs.configPath,
    },
    stdio: 'ignore',
  });
}

// E2E-06: 本文上限境界値とプロセス強制終了からの復旧（境界値）
test('E2E-06: SIGKILL後に再起動してもデータが失われず、バックアップが生成される', async (t) => {
  t.diagnostic('実プロセスを起動するため数秒かかります');

  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'memory-assistant-e2e-restart-'));
  const dirs = {
    dataDir: path.join(root, 'data'),
    backupDir: path.join(root, 'backups'),
    exportDir: path.join(root, 'exports'),
    configPath: path.join(root, 'config.json'),
  };
  fs.writeFileSync(dirs.configPath, JSON.stringify({ port: TEST_PORT, ollamaModel: 'qwen3:4b', backupIntervalHours: 24 }));

  const baseUrl = `http://127.0.0.1:${TEST_PORT}`;

  let proc = spawnServer(dirs);
  await waitForServer(`${baseUrl}/api/status`);

  // 境界値: ちょうど50,000文字の本文を保存
  const boundaryBody = 'あ'.repeat(50000);
  const createRes = await fetch(`${baseUrl}/api/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: '境界値テスト', body: boundaryBody }),
  });
  assert.equal(createRes.status, 201);

  // 50,001文字はエラーになることも確認
  const overflowRes = await fetch(`${baseUrl}/api/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: '境界値超過', body: 'あ'.repeat(50001) }),
  });
  assert.equal(overflowRes.status, 400);

  const beforeList = await (await fetch(`${baseUrl}/api/notes`)).json();
  assert.equal(beforeList.notes.length, 1);

  // 強制終了（クラッシュ相当）
  proc.kill('SIGKILL');
  await new Promise((resolve) => proc.once('exit', resolve));

  // 再起動
  proc = spawnServer(dirs);
  try {
    await waitForServer(`${baseUrl}/api/status`);

    const afterList = await (await fetch(`${baseUrl}/api/notes`)).json();
    assert.equal(afterList.notes.length, 1, '強制終了前のメモ件数と再起動後のメモ件数が一致すること');
    assert.equal(afterList.notes[0].body.length, 50000);

    const backupFiles = fs.readdirSync(dirs.backupDir).filter((f) => f.endsWith('.db'));
    assert.ok(backupFiles.length >= 1, '再起動時（起動時バックアップ）にbackupsが生成されていること');
  } finally {
    proc.kill('SIGKILL');
    await new Promise((resolve) => proc.once('exit', resolve));
    fs.rmSync(root, { recursive: true, force: true });
  }
});
