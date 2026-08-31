export function calcMaterialsBreakdown(project) {
  const matById = new Map((project.materials || []).map((m) => [m.id, m]));
  const byMat = new Map();

  let totalArea = 0;
  let effectiveArea = 0;
  let totalCost = 0;

  for (const it of project.items || []) {
    const w = Number(it.wMm);
    const h = Number(it.hMm);
    const qty = Number(it.qty);

    if (!Number.isFinite(w) || !Number.isFinite(h) || !Number.isFinite(qty)) continue;

    const area = (w * h) / 1_000_000 * qty;
    totalArea += area;

    const mat = matById.get(it.materialId);
    const waste = mat?.wasteFactor ?? 1;
    const mult = it.areaMultiplier ?? 1;

    const eff = area * waste * mult;
    effectiveArea += eff;

    const price = mat?.pricePerM2 ?? 0;
    const cost = eff * price;
    totalCost += cost;

    const key = it.materialId || "unknown";
    const cur = byMat.get(key) || {
      materialId: key,
      name: mat?.name || "Невідомий матеріал",
      wasteFactor: waste,
      pricePerM2: price,
      area: 0,
      effectiveArea: 0,
      cost: 0,
    };

    cur.area += area;
    cur.effectiveArea += eff;
    cur.cost += cost;

    cur.name = mat?.name || cur.name;
    cur.wasteFactor = waste;
    cur.pricePerM2 = price;

    byMat.set(key, cur);
  }

  return { totalArea, effectiveArea, totalCost, rows: Array.from(byMat.values()) };
}
