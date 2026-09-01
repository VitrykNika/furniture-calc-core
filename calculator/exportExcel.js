import { toNumber, round2 } from "../utils/numbers.js";
import { calcMaterialsBreakdown } from "./breakdown.js";

// =========================================================
// CNC SUMMARY FOR ONE ITEM
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

  for (
    const [tool, count] of
      Object.entries(drillingByTool)
  ) {
    multipliedDrillingByTool[tool] =
      count * qty;
  }

  const multipliedMillingByTool = {};

  for (
    const [tool, meters] of
      Object.entries(millingByTool)
  ) {
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

  // =========================================================
  // GENERAL CALCULATION
  // =========================================================

  const res =
    calcMaterialsBreakdown(project);

  const drillingPrice =
    Number(
      project?.meta?.cncPrices?.drillingPerHole
    ) || 0;

  const millingPrice =
    Number(
      project?.meta?.cncPrices?.millingPerMeter
    ) || 0;

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

  // ---------------------------------------------------------
  // МАТЕРІАЛИ
  // ---------------------------------------------------------

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
      res.totalMaterialCost || 0
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
      res.totalEdgingCost || 0
    ),
  ]);

  // ---------------------------------------------------------
  // CNC
  // ---------------------------------------------------------

  estimateRows.push([]);

  estimateRows.push([
    "CNC"
  ]);

  estimateRows.push([
    "Операція",
    "Кількість / довжина",
    "Ціна",
    "Сума",
  ]);

  estimateRows.push([
    "Свердління",
    res.cnc?.drillingCount || 0,
    round2(drillingPrice),
    round2(
      res.cnc?.drillingCost || 0
    ),
  ]);

  estimateRows.push([
    "Фрезерування",
    round2(
      res.cnc?.millingMeters || 0
    ),
    round2(millingPrice),
    round2(
      res.cnc?.millingCost || 0
    ),
  ]);

  estimateRows.push([]);

  estimateRows.push([
    "Разом CNC",
    "",
    "",
    round2(
      res.totalCncCost || 0
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
      res.totalMaterialCost || 0
    ),
  ]);

  estimateRows.push([
    "Крайка",
    "",
    "",
    "",
    "",
    round2(
      res.totalEdgingCost || 0
    ),
  ]);

  estimateRows.push([
    "CNC",
    "",
    "",
    "",
    "",
    round2(
      res.totalCncCost || 0
    ),
  ]);

  estimateRows.push([
    "Собівартість",
    "",
    "",
    "",
    "",
    round2(
      res.totalCost || 0
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
  // HEADER
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
  // DETAILS
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
            edge.thicknessMm ?? "";

          return `${side}: ${thickness} мм`;
        })
        .join("; ");

    // -------------------------------------------------------
    // CNC COST FOR THIS ITEM
    // -------------------------------------------------------

    const drillingCost =
      cnc.drillingCount *
      drillingPrice;

    const millingCost =
      cnc.millingMeters *
      millingPrice;

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

      round2(
        drillingPrice
      ),

      round2(
        drillingCost
      ),

      // Фрезерування
      round2(
        cnc.millingMeters
      ),

      round2(
        millingPrice
      ),

      round2(
        millingCost
      ),

      // Крайка
      round2(
        Number(
          item.edgeMeters
        ) || 0
      ),

      edgingText,

      // Детальна CNC інформація
      cncText,
    ]);

    index += 1;
  }

  // =========================================================
  // TOTALS FOR DETAILS
  // =========================================================

  let totalDrilling = 0;
  let totalDrillingCost = 0;

  let totalMilling = 0;
  let totalMillingCost = 0;

  let totalEdging = 0;

  for (
    const item of
      project.items || []
  ) {
    const cnc =
      getCncSummary(item);

    totalDrilling +=
      cnc.drillingCount;

    totalDrillingCost +=
      cnc.drillingCount *
      drillingPrice;

    totalMilling +=
      cnc.millingMeters;

    totalMillingCost +=
      cnc.millingMeters *
      millingPrice;

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

    round2(
      totalDrilling
    ),

    "",

    round2(
      totalDrillingCost
    ),

    round2(
      totalMilling
    ),

    "",

    round2(
      totalMillingCost
    ),

    round2(
      totalEdging
    ),

    "",
    "",
  ]);

  // =========================================================
  // CREATE DETAILS SHEET
  // =========================================================

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
// 3. ВИМОГИ НА СКЛАД
// =========================================================

const stockRows = [];

stockRows.push([
  "№",
  "Тип",
  "Код",
  "Найменування",
  "Од.в",
  "Кіл.",
]);

let stockIndex = 1;

// ---------------------------------------------------------
// ЛИСТОВІ МАТЕРІАЛИ
// ---------------------------------------------------------

for (const r of res.materialRows || res.rows || []) {
  const material = (project.materials || []).find(
    (m) => m.id === r.materialId
  );

  const sheetLengthMm =
    Number(material?.sheetLengthMm) || 0;

  const sheetWidthMm =
    Number(material?.sheetWidthMm) || 0;

  const sheetAreaM2 =
    sheetLengthMm > 0 &&
    sheetWidthMm > 0
      ? (
          sheetLengthMm *
          sheetWidthMm
        ) / 1_000_000
      : 0;

  const requiredArea =
    Number(r.effectiveArea) || 0;

  let sheetsCount = 0;
  let purchaseArea = requiredArea;

  if (sheetAreaM2 > 0) {
    sheetsCount =
      Math.ceil(
        requiredArea /
        sheetAreaM2
      );

    purchaseArea =
      sheetsCount *
      sheetAreaM2;
  }

  let name =
    material?.name ||
    r.name ||
    "";

  if (sheetsCount > 0) {
    name +=
      ` (Листи: ${sheetsCount} шт`;
      
    if (sheetAreaM2 > 0) {
      name +=
        ` · площа 1 листа: ${round2(sheetAreaM2)} м²`;
    }

    name += ")";
  }

  stockRows.push([
    stockIndex,
    "CS",
    material?.code || "",
    name,
    "м²",
    round2(purchaseArea),
  ]);

  stockIndex += 1;
}

// ---------------------------------------------------------
// КРАЙКА
// ---------------------------------------------------------

for (const r of res.edgingRows || []) {
  stockRows.push([
    stockIndex,
    "EL",
    r.code || "",
    r.name,
    "м",
    round2(r.meters),
  ]);

  stockIndex += 1;
}

// ---------------------------------------------------------
// CNC
// ---------------------------------------------------------

stockRows.push([]);

stockRows.push([
  "",
  "CNC",
  "",
  "Свердління",
  "шт",
  res.cnc?.drillingCount || 0,
]);

stockRows.push([
  "",
  "CNC",
  "",
  "Фрезерування",
  "м",
  round2(
    res.cnc?.millingMeters || 0
  ),
]);

// ---------------------------------------------------------
// CREATE SHEET
// ---------------------------------------------------------

const stockSheet =
  XLSX.utils.aoa_to_sheet(
    stockRows
  );

XLSX.utils.book_append_sheet(
  wb,
  stockSheet,
  "Вимоги на склад"
  );
  
  
  // =========================================================
  // EXPORT FILE
  // =========================================================

  XLSX.writeFile(
    wb,
    "koshorys.xlsx"
  );
}