import { toNumber, round2 } from "../utils/numbers.js";
import { calcMaterialsBreakdown } from "./breakdown.js";

// =========================================================
// CNC SUMMARY
// =========================================================

function getCncSummary(item) {
  let drillingCount = 0;
  let millingMeters = 0;

  const drillingByTool = {};
  const millingByTool = {};

  for (const cnc of item.cnc || []) {
    for (const op of cnc.operations || []) {
      // -----------------------------------------------------
      // СВЕРДЛІННЯ
      // -----------------------------------------------------

      if (
        op.type === "bf" ||
        op.type === "bb" ||
        op.type === "bl" ||
        op.type === "br"
      ) {
        drillingCount += 1;

        const tool = op.tool || "Bore";

        drillingByTool[tool] =
          (drillingByTool[tool] || 0) + 1;
      }

      // -----------------------------------------------------
      // ФРЕЗЕРУВАННЯ
      // -----------------------------------------------------

      if (op.type === "gr") {
        const x1 = Number(op.x1);
        const y1 = Number(op.y1);
        const x2 = Number(op.x2);
        const y2 = Number(op.y2);

        if (
          Number.isFinite(x1) &&
          Number.isFinite(y1) &&
          Number.isFinite(x2) &&
          Number.isFinite(y2)
        ) {
          const dx = x2 - x1;
          const dy = y2 - y1;

          const lengthMm = Math.sqrt(
            dx * dx + dy * dy
          );

          const lengthM =
            lengthMm / 1000;

          millingMeters += lengthM;

          const tool =
            op.tool || "Cut";

          millingByTool[tool] =
            (millingByTool[tool] || 0) +
            lengthM;
        }
      }
    }
  }

  const qty =
    Number(item.qty) || 1;

  const multipliedDrillingByTool = {};

  for (const [tool, count] of Object.entries(
    drillingByTool
  )) {
    multipliedDrillingByTool[tool] =
      count * qty;
  }

  const multipliedMillingByTool = {};

  for (const [tool, meters] of Object.entries(
    millingByTool
  )) {
    multipliedMillingByTool[tool] =
      meters * qty;
  }

  return {
    drillingCount:
      drillingCount * qty,

    millingMeters:
      millingMeters * qty,

    drillingByTool:
      multipliedDrillingByTool,

    millingByTool:
      multipliedMillingByTool,
  };
}

// =========================================================
// EXPORT
// =========================================================

export function exportEstimateXlsx(
  project,
  markupPercent = 0
) {
  if (typeof XLSX === "undefined") {
    throw new Error(
      "XLSX не підключено. Перевір CDN xlsx у index.html."
    );
  }

  const res =
    calcMaterialsBreakdown(project);

  const markup =
    toNumber(markupPercent) || 0;

  const totalWithMarkup =
    res.totalCost *
    (1 + markup / 100);

  const wb =
    XLSX.utils.book_new();

  // =========================================================
  // 1. КОШТОРИС
  // =========================================================

  const estimateRows = [];

  estimateRows.push([
    "МАТЕРІАЛИ"
  ]);

  estimateRows.push([
    "Матеріал",
    "Waste",
    "Площа (м²)",
    "Площа з відходами (м²)",
    "Ціна за м²",
    "Сума",
  ]);

  for (
    const r of
      res.materialRows ||
      res.rows ||
      []
  ) {
    estimateRows.push([
      r.name,
      r.wasteFactor,
      round2(r.area),
      round2(r.effectiveArea),
      round2(r.pricePerM2),
      round2(r.cost),
    ]);
  }

  estimateRows.push([]);

  estimateRows.push([
    "Разом матеріали",
    "",
    "",
    "",
    "",
    round2(
      res.totalMaterialCost
    ),
  ]);

  // ---------------------------------------------------------
  // КРАЙКА
  // ---------------------------------------------------------

  estimateRows.push([]);

  estimateRows.push([
    "КРАЙКА"
  ]);

  estimateRows.push([
    "Крайка",
    "Товщина (мм)",
    "Пог. м",
    "Ціна за м",
    "Сума",
  ]);

  for (
    const r of
      res.edgingRows || []
  ) {
    estimateRows.push([
      r.name,
      round2(r.thicknessMm),
      round2(r.meters),
      round2(r.pricePerMeter),
      round2(r.cost),
    ]);
  }

  estimateRows.push([]);

  estimateRows.push([
    "Разом крайка",
    "",
    "",
    "",
    round2(
      res.totalEdgingCost
    ),
  ]);

  // ---------------------------------------------------------
  // ПІДСУМОК
  // ---------------------------------------------------------

  estimateRows.push([]);

  estimateRows.push([
    "ПІДСУМОК"
  ]);

  estimateRows.push([
    "Матеріали",
    "",
    "",
    "",
    "",
    round2(
      res.totalMaterialCost
    ),
  ]);

  estimateRows.push([
    "Крайка",
    "",
    "",
    "",
    "",
    round2(
      res.totalEdgingCost
    ),
  ]);

  estimateRows.push([
    "Собівартість",
    "",
    "",
    "",
    "",
    round2(
      res.totalCost
    ),
  ]);

  estimateRows.push([
    "Націнка %",
    markup,
    "",
    "",
    "",
    "",
  ]);

  estimateRows.push([
    "Разом з націнкою",
    "",
    "",
    "",
    "",
    round2(
      totalWithMarkup
    ),
  ]);

  const estimateSheet =
    XLSX.utils.aoa_to_sheet(
      estimateRows
    );

  XLSX.utils.book_append_sheet(
    wb,
    estimateSheet,
    "Кошторис"
  );

  // =========================================================
  // 2. ДЕТАЛІ
  // =========================================================

  const materialById =
    new Map(
      (project.materials || [])
        .map(
          (mat) => [
            mat.id,
            mat
          ]
        )
    );

  const detailRows = [];

  // ---------------------------------------------------------
  // ШАПКА
  // ---------------------------------------------------------

  detailRows.push([
    "№",
    "Код",
    "Найменування",
    "Довжина, мм",
    "Ширина, мм",
    "Кількість",
    "Матеріал",
    "Категорія",

    "К-ть свердлінь",
    "Ціна свердління",
    "Вартість свердління",

    "Довжина фрезерування, м",
    "Ціна фрезерування",
    "Вартість фрезерування",

    "Крайка, м",
    "Крайка",

    "CNC операції",
  ]);

  let index = 1;

  // ---------------------------------------------------------
  // ДЕТАЛІ
  // ---------------------------------------------------------

  for (
    const item of
      project.items || []
  ) {
    const mat =
      materialById.get(
        item.materialId
      );

    const cnc =
      getCncSummary(item);

    // -------------------------------------------------------
    // CNC TEXT
    // -------------------------------------------------------

    const drillingText =
      Object.entries(
        cnc.drillingByTool
      )
        .map(
          ([tool, count]) =>
            `${tool} × ${count}`
        )
        .join("; ");

    const millingText =
      Object.entries(
        cnc.millingByTool
      )
        .map(
          ([tool, meters]) =>
            `${tool}: ${round2(
              meters
            )} м`
        )
        .join("; ");

    const cncText = [
      drillingText,
      millingText,
    ]
      .filter(Boolean)
      .join("; ");

    // -------------------------------------------------------
    // EDGING TEXT
    // -------------------------------------------------------

    const edgingText =
      (item.edging || [])
        .map((edge) => {
          const side =
            edge.side || "";

          const thickness =
            edge.thicknessMm ??
            "";

          return `${side}: ${thickness} мм`;
        })
        .join("; ");

    // -------------------------------------------------------
    // ROW
    // -------------------------------------------------------

    detailRows.push([
      index,

      item.code ||
        item.sourceCode ||
        "",

      item.name || "",

      Number(item.wMm) || 0,

      Number(item.hMm) || 0,

      Number(item.qty) || 0,

      mat?.name || "",

      item.category || "",

      // Свердління
      cnc.drillingCount,

      // Ціна свердління
      0,

      // Вартість свердління
      0,

      // Фрезерування
      round2(
        cnc.millingMeters
      ),

      // Ціна фрезерування
      0,

      // Вартість фрезерування
      0,

      // Крайка
      round2(
        Number(
          item.edgeMeters
        ) || 0
      ),

      edgingText,

      // Детальний CNC
      cncText,
    ]);

    index += 1;
  }

  // =========================================================
  // TOTAL ROW
  // =========================================================

  let totalDrilling = 0;
  let totalMilling = 0;
  let totalEdging = 0;

  for (
    const item of
      project.items || []
  ) {
    const cnc =
      getCncSummary(item);

    totalDrilling +=
      cnc.drillingCount;

    totalMilling +=
      cnc.millingMeters;

    totalEdging +=
      Number(
        item.edgeMeters
      ) || 0;
  }

  detailRows.push([]);

  detailRows.push([
    "РАЗОМ",
    "",
    "",
    "",
    "",
    "",
    "",
    "",

    totalDrilling,
    "",
    "",

    round2(
      totalMilling
    ),
    "",
    "",

    round2(
      totalEdging
    ),

    "",
    "",
  ]);

  const detailsSheet =
    XLSX.utils.aoa_to_sheet(
      detailRows
    );

  XLSX.utils.book_append_sheet(
    wb,
    detailsSheet,
    "Деталі"
  );

  // =========================================================
  // EXPORT FILE
  // =========================================================

  XLSX.writeFile(
    wb,
    "koshorys.xlsx"
  );
}