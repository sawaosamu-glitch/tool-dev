const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const config = require('../../src/config');

function writeTempConfig(content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'memory-assistant-config-'));
  const file = path.join(dir, 'config.json');
  fs.writeFileSync(file, content, 'utf8');
  return { dir, file };
}

test('ConfigManager.load: 正しいconfig.jsonをそのまま反映する', () => {
  const { dir, file } = writeTempConfig(
    JSON.stringify({ port: 4000, ollamaModel: 'qwen3:8b', backupIntervalHours: 12 })
  );
  const cfg = config.load(file);
  assert.deepEqual(cfg, { port: 4000, ollamaModel: 'qwen3:8b', backupIntervalHours: 12 });
  fs.rmSync(dir, { recursive: true, force: true });
});

test('ConfigManager.load: 不正なportは既定値にフォールバックする', () => {
  const { dir, file } = writeTempConfig(JSON.stringify({ port: -1, ollamaModel: 'x', backupIntervalHours: 5 }));
  const cfg = config.load(file);
  assert.equal(cfg.port, config.DEFAULTS.port);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('ConfigManager.load: ファイルが存在しない場合は全て既定値', () => {
  const cfg = config.load('/nonexistent/config.json');
  assert.deepEqual(cfg, config.DEFAULTS);
});

test('ConfigManager.load: 壊れたJSONは全て既定値', () => {
  const { dir, file } = writeTempConfig('{ this is not json');
  const cfg = config.load(file);
  assert.deepEqual(cfg, config.DEFAULTS);
  fs.rmSync(dir, { recursive: true, force: true });
});
