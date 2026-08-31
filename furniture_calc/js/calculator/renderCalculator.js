import { money, toNumber } from "../utils/numbers.js";
import { escapeHtml } from "../utils/text.js";
import { calcMaterialsBreakdown } from "./breakdown.js";

export function clearCalculatorUi(els) {
  els.totalArea && (els.totalArea.textContent = "—");
  els.effectiveArea && (els.effectiveArea.textContent = "—");
  els.materialsSum && (els.materialsSum.textContent = "—");
  els.totalWithMarkup && (els.totalWithMarkup.textContent = "—");
  els.materialsTable && (els.materialsTable.innerHTML = "");
}

export function renderCalculator(els, project) {
  if (!project || !els.materialsTable) return;

  const res = calcMaterialsBreakdown(project);

  els.totalArea && (els.totalArea.textContent = money(res.totalArea));
  els.effectiveArea && (els.effectiveArea.textContent = money(res.effectiveArea));
  els.materialsSum && (els.materialsSum.textContent = `${money(res.totalCost)} UAH`);

  const markup = toNumber(els.markupInput?.value) || 0;
  const totalWithMarkup = res.totalCost * (1 + markup / 100);
  els.totalWithMarkup && (els.totalWithMarkup.textContent = `${money(totalWithMarkup)} UAH`);

  els.materialsTable.innerHTML = "";

  for (const r of res.rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(r.name)}</td>
      <td>${escapeHtml(String(r.wasteFactor))}</td>
      <td>${money(r.area)}</td>
      <td>${money(r.effectiveArea)}</td>
      <td>
        <input
          type="number"
          step="0.01"
          min="0"
          value="${Number(r.pricePerM2) || 0}"
          data-material-id="${escapeHtml(r.materialId)}"
          class="priceInput"
          style="width:140px"
        />
      </td>
      <td>${money(r.cost)} UAH</td>
    `;
    els.materialsTable.appendChild(tr);
  }
}
