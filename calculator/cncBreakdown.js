export function calcCncBreakdown(project) {
  let drillingCount = 0;
  let millingMeters = 0;

  const drillingByTool = new Map();
  const millingByTool = new Map();

  for (const item of project.items || []) {
    const qty = Number(item.qty) || 1;

    for (const cnc of item.cnc || []) {
      for (const op of cnc.operations || []) {
        // =====================================================
        // СВЕРДЛІННЯ
        // =====================================================

        if (
          op.type === "bf" ||
          op.type === "bb" ||
          op.type === "bl" ||
          op.type === "br"
        ) {
          drillingCount += qty;

          const tool = op.tool || "Bore";

          drillingByTool.set(
            tool,
            (drillingByTool.get(tool) || 0) + qty
          );
        }

        // =====================================================
        // ФРЕЗЕРУВАННЯ
        // =====================================================

        if (op.type === "gr") {
          const x1 = Number(op.x1);
          const y1 = Number(op.y1);
          const x2 = Number(op.x2);
          const y2 = Number(op.y2);

          if (
            !Number.isFinite(x1) ||
            !Number.isFinite(y1) ||
            !Number.isFinite(x2) ||
            !Number.isFinite(y2)
          ) {
            continue;
          }

          const dx = x2 - x1;
          const dy = y2 - y1;

          const lengthMm = Math.sqrt(
            dx * dx + dy * dy
          );

          const lengthM =
            (lengthMm / 1000) * qty;

          millingMeters += lengthM;

          const tool = op.tool || "Cut";

          millingByTool.set(
            tool,
            (millingByTool.get(tool) || 0) + lengthM
          );
        }
      }
    }
  }

  // =========================================================
  // ЦІНИ
  // =========================================================

  const drillingPrice =
    Number(
      project?.meta?.cncPrices?.drillingPerHole
    ) || 0;

  const millingPrice =
    Number(
      project?.meta?.cncPrices?.millingPerMeter
    ) || 0;

  const drillingCost =
    drillingCount * drillingPrice;

  const millingCost =
    millingMeters * millingPrice;

  const totalCncCost =
    drillingCost + millingCost;

  return {
    drillingCount,
    millingMeters,

    drillingPrice,
    millingPrice,

    drillingCost,
    millingCost,

    totalCncCost,

    drillingByTool:
      Array.from(drillingByTool.entries()).map(
        ([tool, count]) => ({
          tool,
          count,
        })
      ),

    millingByTool:
      Array.from(millingByTool.entries()).map(
        ([tool, meters]) => ({
          tool,
          meters,
        })
      ),
  };
}