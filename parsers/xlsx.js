export function parseXlsx(arrayBuffer) {
  if (typeof XLSX === "undefined") {
    throw new Error("XLSX бібліотека не підключена. Додай SheetJS CDN у index.html.");
  }

  const wb = XLSX.read(arrayBuffer, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
  const hdr = json.length ? Object.keys(json[0]) : [];

  return { headers: hdr, rows: json };
}
