const fs = require('node:fs');
const path = require('node:path');
const { ValidationError } = require('../errors');

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

function toMarkdown(notes) {
  return notes
    .map((n) => {
      const tags = n.tags ? `\nタグ: ${n.tags.split(',').join(', ')}` : '';
      return `# ${n.title || '(無題)'}\n登録日時: ${n.created_at}${tags}\n\n${n.body}\n`;
    })
    .join('\n---\n\n');
}

// C-06 ExportService（SDD 1章）: 全メモをMarkdown/JSONへ一括出力
class ExportService {
  constructor(noteStore, { exportDir }) {
    this.noteStore = noteStore;
    this.exportDir = exportDir;
  }

  exportAll(format) {
    if (format !== 'markdown' && format !== 'json') {
      throw new ValidationError('formatは markdown または json を指定してください');
    }

    fs.mkdirSync(this.exportDir, { recursive: true });
    const notes = this._fetchAllNotes();
    const ext = format === 'markdown' ? 'md' : 'json';
    const filePath = path.join(this.exportDir, `notes_${timestamp()}.${ext}`);
    const content = format === 'markdown' ? toMarkdown(notes) : JSON.stringify(notes, null, 2);

    fs.writeFileSync(filePath, content, 'utf8');
    return { path: filePath };
  }

  _fetchAllNotes() {
    const all = [];
    let page = 1;
    for (;;) {
      const batch = this.noteStore.findAll({ page });
      if (batch.length === 0) break;
      all.push(...batch);
      page += 1;
    }
    return all;
  }
}

module.exports = { ExportService };
