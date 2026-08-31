import { uid } from "../utils/id.js";
import { toNumber } from "../utils/numbers.js";

const defaultCategoryFactor = (category) => {
  const c = (category || "").toLowerCase();
  if (c.includes("фас")) return 1.15;
  if (c.includes("стіл") || c.includes("стіль")) return 1.1;
  if (c.includes("хдф") || c.includes("зад")) return 1.05;
  if (c.includes("пол")) return 1.05;
  return 1.05;
};

const guessCategory = (name) => {
  const n = (name || "").toLowerCase();
  if (n.includes("фас") || n.includes("двер")) return "фасад";
  if (n.includes("стіл") || n.includes("стіль")) return "стільниця";
  if (n.includes("зад") || n.includes("хдф")) return "задня стінка";
  if (n.includes("пол")) return "полиця";
  return "корпус";
};

export function buildProjectFromRows(rows, mapping, fileBaseName = "Converted project") {
  const errors = [];
  const items = [];
  const materialsMap = new Map();

  // materials
  for (const r of rows) {
    const matName = String(r[mapping.material] ?? "").trim();
    if (!matName) continue;

    if (!materialsMap.has(matName)) {
      const price = mapping.pricePerM2 ? toNumber(r[mapping.pricePerM2]) : NaN;
      materialsMap.set(matName, {
        id: uid(),
        name: matName,
        pricePerM2: Number.isFinite(price) ? price : 0,
        wasteFactor: 1.08,
      });
    }
  }

  if (!materialsMap.size) {
    materialsMap.set("Матеріал", { id: uid(), name: "Матеріал", pricePerM2: 0, wasteFactor: 1.08 });
  }

  const materials = Array.from(materialsMap.values());

  // items
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];

    const name = String(r[mapping.name] ?? "").trim();
    const materialName = String(r[mapping.material] ?? "").trim();

    const w = toNumber(r[mapping.wMm]);
    const h = toNumber(r[mapping.hMm]);
    const qty = toNumber(r[mapping.qty]);

    let category = mapping.category ? String(r[mapping.category] ?? "").trim() : "";
    if (!category) category = guessCategory(name);

    const edgeMeters = mapping.edgeMeters ? toNumber(r[mapping.edgeMeters]) : 0;
    const edgeType = mapping.edgeType ? String(r[mapping.edgeType] ?? "").trim() : "";

    const rowErrors = [];
    if (!name) rowErrors.push("немає name");
    if (!materialName) rowErrors.push("немає material");
    if (!Number.isFinite(w) || w <= 0) rowErrors.push("W некоректне");
    if (!Number.isFinite(h) || h <= 0) rowErrors.push("H некоректне");
    if (!Number.isFinite(qty) || qty <= 0) rowErrors.push("Qty некоректне");

    if (rowErrors.length) {
      errors.push({ index: i + 1, name, materialName, w, h, qty, category, error: rowErrors.join(", ") });
      continue;
    }

    const mat = materialsMap.get(materialName) || materials[0];
    const areaMultiplier = defaultCategoryFactor(category);

    items.push({
      id: uid(),
      category,
      name,
      wMm: Math.round(w),
      hMm: Math.round(h),
      qty: Math.round(qty),
      materialId: mat.id,
      areaMultiplier,
      edgeMeters: Number.isFinite(edgeMeters) ? edgeMeters : 0,
      edgeType,
    });
  }

  const now = new Date().toISOString();

  const project = {
    format: "furniture-calc-project",
    version: 1,
    meta: {
      name: `Converted: ${fileBaseName}`,
      client: "",
      type: "other",
      currency: "UAH",
      markupPercent: 0,
      createdAt: now,
      updatedAt: now,
      source: "table-import",
    },
    materials,
    items,
  };

  return { project, errors };
}
