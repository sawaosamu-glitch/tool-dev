const MAX_TAG_LENGTH = 30;
const MAX_TAG_COUNT = 20;

// SRS 8.4: カンマ区切り、1タグ最大30文字、最大20個。上限超過分は保存時に切り捨て
function normalizeTags(rawTags) {
  if (!rawTags) return '';
  const items = String(rawTags)
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .map((t) => t.slice(0, MAX_TAG_LENGTH))
    .slice(0, MAX_TAG_COUNT);
  return items.join(',');
}

module.exports = { normalizeTags, MAX_TAG_LENGTH, MAX_TAG_COUNT };
