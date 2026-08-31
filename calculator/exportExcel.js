import { toNumber, round2 } from "../utils/numbers.js";
import { calcMaterialsBreakdown } from "./breakdown.js";

export function exportEstimateXlsx(project, markupPercent = 0) {
  if (typeof XLSX === "undefined") {
    throw new Error("XLSX не підключено. Перевір CDN xlsx у index.html.");
  }

  const res = calcMaterialsBreakdown(project);
  const totalWithMarkup = res.totalCost * (1 + markupPercent / 100);

  const rows = [];
  rows.push(["Матеріал", "Waste", "Площа (м²)", "Площа з відходами (м²)", "Ціна за м²", "Сума"]);

  for (const r of res.rows) {
    rows.push([
      r.name,
      r.wasteFactor,
      round2(r.area),
      round2(r.effectiveArea),
      round2(r.pricePerM2),
      round2(r.cost),
    ]);
  }

  rows.push([]);
  rows.push(["Разом (матеріали)", "", "", "", "", round2(res.totalCost)]);
  rows.push(["Націнка %", toNumber(markupPercent) || 0, "", "", "", ""]);
  rows.push(["Разом з націнкою", "", "", "", "", round2(totalWithMarkup)]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Кошторис");

  XLSX.writeFile(wb, "koshorys.xlsx");
}
