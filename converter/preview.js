import { escapeHtml, fmt } from "../utils/text.js";

function renderEdging(item) {
  if (!item.edging?.length) {
    return "—";
  }

  return item.edging
    .map(
      (edge) =>
        `${edge.side}: ${edge.thicknessMm} мм`
    )
    .join("<br>");
}

function renderCnc(item) {
  if (!item.cnc?.length) {
    return "—";
  }

  const summary = item.cncSummary || {};

  return Object.entries(summary)
    .map(
      ([tool, count]) =>
        `${escapeHtml(tool)} × ${count}`
    )
    .join("<br>");
}

export function renderPreview(
  els,
  errors,
  project,
  showOnlyValid
) {
  if (!els.preview) return;

  els.preview.innerHTML = "";

  /* ------------------------------------------
     Помилки
  ------------------------------------------ */

  const visibleErrors =
    showOnlyValid
      ? []
      : errors ?? [];

  for (const error of visibleErrors) {
    const tr =
      document.createElement("tr");

    tr.innerHTML = `
      <td>${error.index ?? ""}</td>

      <td>
        ${escapeHtml(error.name ?? "")}
      </td>

      <td>
        ${escapeHtml(
          error.materialName ?? ""
        )}
      </td>

      <td>${fmt(error.w)}</td>

      <td>${fmt(error.h)}</td>

      <td>${fmt(error.qty)}</td>

      <td>
        ${escapeHtml(
          error.category ?? ""
        )}
      </td>

      <td class="bad">
        ${escapeHtml(
          error.error ?? ""
        )}
      </td>
    `;

    els.preview.appendChild(tr);
  }

  /* ------------------------------------------
     УСІ валідні деталі
     
     ВАЖЛИВО:
     більше немає slice(0, 20)
  ------------------------------------------ */

  for (const item of project?.items ?? []) {
    const tr =
      document.createElement("tr");

    const materialName =
      item.material?.name ||
      project.materials?.find(
        (material) =>
          material.id ===
          item.materialId
      )?.name ||
      "";

    const materialThickness =
      item.material
        ?.thicknessMm || 0;

    tr.innerHTML = `
      <td class="ok">
        ${escapeHtml(
          item.sourceId ?? ""
        )}
      </td>

      <td>
        <strong>
          ${escapeHtml(
            item.name ?? ""
          )}
        </strong>

        <div class="muted small">
          code:
          ${escapeHtml(
            item.code ?? ""
          )}
        </div>
      </td>

      <td>
        ${escapeHtml(
          materialName
        )}

        <div class="muted small">
          ${materialThickness} мм
        </div>
      </td>

      <td>
        ${item.wMm}
      </td>

      <td>
        ${item.hMm}
      </td>

      <td>
        ${item.qty}
      </td>

      <td>
        ${escapeHtml(
          item.category ?? ""
        )}
      </td>

      <td>
        <div>
          <strong>Крайка:</strong>
        </div>

        <div class="small">
          ${renderEdging(item)}
        </div>

        <div
          class="muted small"
          style="margin-top: 6px"
        >
          Разом:
          ${Number(
            item.edgeMeters || 0
          ).toFixed(3)}
          м
        </div>

        <div
          class="small"
          style="margin-top: 6px"
        >
          <strong>CNC:</strong>
        </div>

        <div class="small">
          ${renderCnc(item)}
        </div>
      </td>
    `;

    els.preview.appendChild(tr);
  }

  /* ------------------------------------------
     Інформація
  ------------------------------------------ */

  if (els.errorsInfo) {
    els.errorsInfo.textContent =
      `Валідних позицій: ${
        project?.items?.length ?? 0
      }. ` +

      `Матеріалів: ${
        project?.materials?.length ?? 0
      }. ` +

      `Помилок: ${
        errors?.length ?? 0
      }.`;
  }
}