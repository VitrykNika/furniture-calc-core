import {
  money,
  toNumber
} from "../utils/numbers.js";

import {
  escapeHtml
} from "../utils/text.js";

import {
  calcMaterialsBreakdown
} from "./breakdown.js";


export function clearCalculatorUi(els) {
  els.totalArea &&
    (els.totalArea.textContent = "—");

  els.effectiveArea &&
    (els.effectiveArea.textContent = "—");

  els.materialsSum &&
    (els.materialsSum.textContent = "—");

  els.edgingSum &&
    (els.edgingSum.textContent = "—");

  els.totalWithMarkup &&
    (els.totalWithMarkup.textContent = "—");

  els.materialsTable &&
    (els.materialsTable.innerHTML = "");

  els.edgingTable &&
    (els.edgingTable.innerHTML = "");
  els.drillingCount &&
  (els.drillingCount.textContent = "—");

els.drillingCost &&
  (els.drillingCost.textContent = "—");

els.drillingDetails &&
  (els.drillingDetails.textContent = "");

els.millingMeters &&
  (els.millingMeters.textContent = "—");

els.millingCost &&
  (els.millingCost.textContent = "—");

els.millingDetails &&
  (els.millingDetails.textContent = "");

els.cncSum &&
  (els.cncSum.textContent = "—");

els.cncSumTop &&
  (els.cncSumTop.textContent = "—");
}


export function renderCalculator(
  els,
  project
) {
  if (
    !project ||
    !els.materialsTable
  ) {
    return;
  }

  const res =
    calcMaterialsBreakdown(project);

  // =========================================================
  // ВЕРХНІ ПІДСУМКИ
  // =========================================================

  els.totalArea &&
    (
      els.totalArea.textContent =
        money(res.totalArea)
    );

  els.effectiveArea &&
    (
      els.effectiveArea.textContent =
        money(res.effectiveArea)
    );

  els.materialsSum &&
    (
      els.materialsSum.textContent =
        `${money(res.totalMaterialCost)} UAH`
    );

  els.edgingSum &&
    (
      els.edgingSum.textContent =
        `${money(res.totalEdgingCost)} UAH`
    );

  const markup =
    toNumber(
      els.markupInput?.value
    ) || 0;

  const totalWithMarkup =
    res.totalCost *
    (1 + markup / 100);

  els.totalWithMarkup &&
    (
      els.totalWithMarkup.textContent =
        `${money(totalWithMarkup)} UAH`
    );

  // =========================================================
  // ЛИСТОВІ МАТЕРІАЛИ
  // =========================================================

  els.materialsTable.innerHTML = "";

  for (
    const r of res.materialRows
  ) {
    const tr =
      document.createElement("tr");

    tr.innerHTML = `
      <td>
        ${escapeHtml(r.name)}
      </td>

      <td>
        ${escapeHtml(
          String(r.wasteFactor)
        )}
      </td>

      <td>
        ${money(r.area)}
      </td>

      <td>
        ${money(
          r.effectiveArea
        )}
      </td>

      <td>
        <input
          type="number"
          step="0.01"
          min="0"

          value="${
            Number(
              r.pricePerM2
            ) || 0
          }"

          data-material-id="${
            escapeHtml(
              r.materialId
            )
          }"

          data-price-kind="m2"

          class="priceInput"

          style="width:140px"
        />
      </td>

      <td>
        ${money(r.cost)} UAH
      </td>
    `;

    els.materialsTable
      .appendChild(tr);
  }

  // =========================================================
  // КРАЙКА
  // =========================================================

  if (els.edgingTable) {
    els.edgingTable.innerHTML = "";

    for (
      const r of res.edgingRows
    ) {
      const tr =
        document.createElement(
          "tr"
        );

      const info = [];

      if (r.thicknessMm) {
        info.push(
          `${r.thicknessMm} мм`
        );
      }

      if (r.widthMm) {
        info.push(
          `ширина ${r.widthMm} мм`
        );
      }

      if (r.code) {
        info.push(
          `код ${r.code}`
        );
      }

      tr.innerHTML = `
        <td>
          <strong>
            ${escapeHtml(
              r.name
            )}
          </strong>

          ${
            info.length
              ? `
                <div
                  class="muted small"
                >
                  ${escapeHtml(
                    info.join(" · ")
                  )}
                </div>
              `
              : ""
          }
        </td>

        <td>
          ${money(
            r.meters
          )}
        </td>

        <td>
          <input
            type="number"
            step="0.01"
            min="0"

            value="${
              Number(
                r.pricePerMeter
              ) || 0
            }"

            data-material-id="${
              escapeHtml(
                r.materialId
              )
            }"

            data-price-kind="meter"

            class="priceInput"

            style="width:140px"
          />
        </td>

        <td>
          ${money(
            r.cost
          )} UAH
        </td>
      `;

      els.edgingTable
        .appendChild(tr);
    }
  }
  // =========================================================
// CNC
// =========================================================

const cnc = res.cnc;

if (cnc) {
  // -------------------------------------------------------
  // СВЕРДЛІННЯ
  // -------------------------------------------------------

  els.drillingCount &&
    (
      els.drillingCount.textContent =
        String(cnc.drillingCount)
    );

  els.drillingCost &&
    (
      els.drillingCost.textContent =
        `${money(cnc.drillingCost)} UAH`
    );

  if (els.drillingDetails) {
    els.drillingDetails.textContent =
      cnc.drillingByTool
        .map(
          (r) =>
            `${r.tool} × ${r.count}`
        )
        .join(" · ");
  }

  // -------------------------------------------------------
  // ФРЕЗЕРУВАННЯ
  // -------------------------------------------------------

  els.millingMeters &&
    (
      els.millingMeters.textContent =
        money(cnc.millingMeters)
    );

  els.millingCost &&
    (
      els.millingCost.textContent =
        `${money(cnc.millingCost)} UAH`
    );

  if (els.millingDetails) {
    els.millingDetails.textContent =
      cnc.millingByTool
        .map(
          (r) =>
            `${r.tool}: ${money(r.meters)} м`
        )
        .join(" · ");
  }

  // -------------------------------------------------------
  // CNC TOTAL
  // -------------------------------------------------------

  els.cncSum &&
    (
      els.cncSum.textContent =
        `${money(cnc.totalCncCost)} UAH`
    );

  els.cncSumTop &&
    (
      els.cncSumTop.textContent =
        `${money(cnc.totalCncCost)} UAH`
    );
}
}