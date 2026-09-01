import { toNumber, round2 } from "../utils/numbers.js";
import { calcMaterialsBreakdown } from "./breakdown.js";

export function exportEstimateXlsx(project, markupPercent = 0) {
  if (typeof XLSX === "undefined") {
    throw new Error("XLSX не підключено. Перевір CDN xlsx у index.html.");
  }

  const res = calcMaterialsBreakdown(project);

  const markup = toNumber(markupPercent) || 0;

  const totalWithMarkup =
    res.totalCost * (1 + markup / 100);

  const rows = [];

  // =========================================================
  // МАТЕРІАЛИ
  // =========================================================

  rows.push(["МАТЕРІАЛИ"]);

  rows.push([
    "Матеріал",
    "Waste",
    "Площа (м²)",
    "Площа з відходами (м²)",
    "Ціна за м²",
    "Сума",
  ]);

  for (const r of res.materialRows || res.rows || []) {
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

  rows.push([
    "Разом матеріали",
    "",
    "",
    "",
    "",
    round2(res.totalMaterialCost),
  ]);

  // =========================================================
  // КРАЙКА
  // =========================================================

  rows.push([]);
  rows.push(["КРАЙКА"]);

  rows.push([
    "Крайка",
    "Товщина (мм)",
    "Пог. м",
    "Ціна за м",
    "Сума",
  ]);

  for (const r of res.edgingRows || []) {
    rows.push([
      r.name,
      round2(r.thicknessMm),
      round2(r.meters),
      round2(r.pricePerMeter),
      round2(r.cost),
    ]);
  }

  rows.push([]);

  rows.push([
    "Разом крайка",
    "",
    "",
    "",
    round2(res.totalEdgingCost),
  ]);

  // =========================================================
  // ЗАГАЛЬНИЙ ПІДСУМОК
  // =========================================================

  rows.push([]);
  rows.push(["ПІДСУМОК"]);

  rows.push([
    "Матеріали",
    "",
    "",
    "",
    "",
    round2(res.totalMaterialCost),
  ]);

  rows.push([
    "Крайка",
    "",
    "",
    "",
    "",
    round2(res.totalEdgingCost),
  ]);

  rows.push([
    "Собівартість",
    "",
    "",
    "",
    "",
    round2(res.totalCost),
  ]);

  rows.push([
    "Націнка %",
    markup,
    "",
    "",
    "",
    "",
  ]);

  rows.push([
    "Разом з націнкою",
    "",
    "",
    "",
    "",
    round2(totalWithMarkup),
  ]);

  // =========================================================
  // EXCEL
  // =========================================================

  const ws =
    XLSX.utils.aoa_to_sheet(rows);

  const wb =
    XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    ws,
    "Кошторис"
  );

  XLSX.writeFile(
    wb,
    "koshtorys.xlsx"
  );
}