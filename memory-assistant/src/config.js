const fs = require('node:fs');
const path = require('node:path');

// C-07 ConfigManager（SDD 1章）: config.jsonを読込・検証し、不正値は既定値にフォールバックする
const DEFAULTS = Object.freeze({
  port: 3000,
  ollamaModel: 'qwen3:4b',
  backupIntervalHours: 24,
});

const CONFIG_PATH = path.join(__dirname, '..', 'config.json');

function load(configPath = CONFIG_PATH) {
  let raw = {};
  try {
    const text = fs.readFileSync(configPath, 'utf8');
    raw = JSON.parse(text);
  } catch (err) {
    console.warn(`[ConfigManager] config.jsonを読み込めなかったため既定値を使用します: ${err.message}`);
    raw = {};
  }

  const port = Number.isInteger(raw.port) && raw.port > 0 && raw.port <= 65535
    ? raw.port
    : DEFAULTS.port;

  const ollamaModel = typeof raw.ollamaModel === 'string' && raw.ollamaModel.trim().length > 0
    ? raw.ollamaModel.trim()
    : DEFAULTS.ollamaModel;

  const backupIntervalHours = typeof raw.backupIntervalHours === 'number' && raw.backupIntervalHours > 0
    ? raw.backupIntervalHours
    : DEFAULTS.backupIntervalHours;

  if (port !== raw.port) console.warn(`[ConfigManager] portが不正なため既定値(${DEFAULTS.port})を使用します`);
  if (ollamaModel !== raw.ollamaModel) console.warn(`[ConfigManager] ollamaModelが不正なため既定値(${DEFAULTS.ollamaModel})を使用します`);
  if (backupIntervalHours !== raw.backupIntervalHours) console.warn(`[ConfigManager] backupIntervalHoursが不正なため既定値(${DEFAULTS.backupIntervalHours})を使用します`);

  return { port, ollamaModel, backupIntervalHours };
}

module.exports = { load, DEFAULTS };
