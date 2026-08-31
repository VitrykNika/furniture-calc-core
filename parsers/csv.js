export function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return { headers: [], rows: [] };

  const delim = lines[0].includes(";") ? ";" : ",";
  const hdr = lines[0].split(delim).map((x) => x.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(delim);
    const row = {};
    hdr.forEach((h, idx) => (row[h] = parts[idx] ?? ""));
    rows.push(row);
  }
  return { headers: hdr, rows };
}
