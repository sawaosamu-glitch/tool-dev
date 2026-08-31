// SRS 9.4: created_at/updated_at はローカルTZオフセット付きISO 8601形式で生成する
function nowIso() {
  const d = new Date();
  const pad = (n, len = 2) => String(n).padStart(len, '0');

  const offsetMinutes = -d.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const offset = `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;

  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${offset}`
  );
}

module.exports = { nowIso };
