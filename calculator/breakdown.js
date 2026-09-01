import { calcCncBreakdown } from "./cncBreakdown.js";
export function calcMaterialsBreakdown(project) {
  const matById = new Map(
    (project.materials || []).map((m) => [m.id, m])
  );

  const byMat = new Map();
  const byEdge = new Map();

  let totalArea = 0;
  let effectiveArea = 0;

  let totalMaterialCost = 0;
  let totalEdgingCost = 0;

  // =========================================================
  // ДЕТАЛІ
  // =========================================================

  for (const it of project.items || []) {
    const w = Number(it.wMm);
    const h = Number(it.hMm);
    const qty = Number(it.qty);

    if (
      !Number.isFinite(w) ||
      !Number.isFinite(h) ||
      !Number.isFinite(qty)
    ) {
      continue;
    }

    // ---------------------------------------------------------
    // 1. ЛИСТОВИЙ МАТЕРІАЛ
    // ---------------------------------------------------------

    const area =
      ((w * h) / 1_000_000) * qty;

    totalArea += area;

    const mat = matById.get(it.materialId);

    // В калькуляцію площі беремо тільки sheet.
    // Крайка band нижче рахується окремо в погонних метрах.
    if (mat?.type === "sheet" || !mat?.type) {
      const waste = Number(mat?.wasteFactor ?? 1);
      const mult = Number(it.areaMultiplier ?? 1);

      const eff =
        area *
        (Number.isFinite(waste) ? waste : 1) *
        (Number.isFinite(mult) ? mult : 1);

      effectiveArea += eff;

      const price = Number(mat?.pricePerM2 ?? 0);

      const cost =
        eff *
        (Number.isFinite(price) ? price : 0);

      totalMaterialCost += cost;

      const key =
        it.materialId || "unknown";

      const cur = byMat.get(key) || {
        materialId: key,
        name: mat?.name || "Невідомий матеріал",
        wasteFactor:
          Number.isFinite(waste) ? waste : 1,
        pricePerM2:
          Number.isFinite(price) ? price : 0,
        area: 0,
        effectiveArea: 0,
        cost: 0,
      };

      cur.area += area;
      cur.effectiveArea += eff;
      cur.cost += cost;

      cur.name =
        mat?.name || cur.name;

      cur.wasteFactor =
        Number.isFinite(waste)
          ? waste
          : 1;

      cur.pricePerM2 =
        Number.isFinite(price)
          ? price
          : 0;

      byMat.set(key, cur);
    }

    // ---------------------------------------------------------
    // 2. КРАЙКА
    // ---------------------------------------------------------

    for (const edge of it.edging || []) {
      const edgeMat =
        matById.get(edge.materialId);

      const edgeMaterialId =
        edge.materialId ||
        `edge-${edge.materialName || edge.thicknessMm || "unknown"}`;

      /*
       * Визначаємо довжину конкретної сторони.
       *
       * top/bottom = wMm
       * left/right = hMm
       *
       * Це важливіше, ніж просто використовувати
       * item.edgeMeters, тому що так ми можемо
       * правильно групувати різні типи крайки.
       */

      let lengthMm = 0;

      if (
        edge.side === "top" ||
        edge.side === "bottom"
      ) {
        lengthMm = w;
      }

      if (
        edge.side === "left" ||
        edge.side === "right"
      ) {
        lengthMm = h;
      }

      if (lengthMm <= 0) {
        continue;
      }

      const meters =
        (lengthMm / 1000) * qty;

      const pricePerMeter =
        Number(edgeMat?.pricePerMeter ?? 0);

      const edgeCost =
        meters *
        (Number.isFinite(pricePerMeter)
          ? pricePerMeter
          : 0);

      totalEdgingCost += edgeCost;

      const cur =
        byEdge.get(edgeMaterialId) || {
          materialId: edgeMaterialId,

          name:
            edgeMat?.name ||
            edge.materialName ||
            `Крайка ${edge.thicknessMm || ""} мм`,

          code:
            edgeMat?.code ||
            edge.materialCode ||
            "",

          thicknessMm:
            Number(
              edgeMat?.thickness ??
              edgeMat?.thicknessMm ??
              edge.thicknessMm ??
              0
            ),

          widthMm:
            Number(
              edgeMat?.width ??
              edgeMat?.widthMm ??
              edge.widthMm ??
              0
            ),

          meters: 0,

          pricePerMeter:
            Number.isFinite(pricePerMeter)
              ? pricePerMeter
              : 0,

          cost: 0,
        };

      cur.meters += meters;
      cur.cost += edgeCost;

      cur.pricePerMeter =
        Number.isFinite(pricePerMeter)
          ? pricePerMeter
          : 0;

      byEdge.set(
        edgeMaterialId,
        cur
      );
    }
  }

  // =========================================================
  // ПІДСУМОК
  // =========================================================

const cnc =
  calcCncBreakdown(project);

const totalCncCost =
  cnc.totalCncCost;

const totalCost =
  totalMaterialCost +
  totalEdgingCost +
  totalCncCost;

  return {
    // Старі поля залишаємо,
    // щоб нічого іншого не зламалося.
    totalArea,
    effectiveArea,
    totalCost,

    rows: Array.from(byMat.values()),

    // Нові поля.
    materialRows:
      Array.from(byMat.values()),

    edgingRows:
      Array.from(byEdge.values()),

    totalMaterialCost,
    totalEdgingCost,

      // CNC
  cnc,
  totalCncCost,
  };
}