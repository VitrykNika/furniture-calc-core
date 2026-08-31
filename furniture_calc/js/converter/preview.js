import { escapeHtml, fmt } from "../utils/text.js";

export function renderPreview(els, errors, project, showOnlyValid) {
  if (!els.preview) return;
  els.preview.innerHTML = "";

  const visibleErrors = showOnlyValid ? [] : errors ?? [];

  for (const e of visibleErrors.slice(0, 20)) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${e.index ?? ""}</td>
      <td>${escapeHtml(e.name ?? "")}</td>
      <td>${escapeHtml(e.materialName ?? "")}</td>
      <td>${fmt(e.w)}</td>
      <td>${fmt(e.h)}</td>
      <td>${fmt(e.qty)}</td>
      <td>${escapeHtml(e.category ?? "")}</td>
      <td class="bad">${escapeHtml(e.error ?? "")}</td>
    `;
    els.preview.appendChild(tr);
  }

  for (const it of (project?.items ?? []).slice(0, 20)) {
    const matName = project.materials?.find((m) => m.id === it.materialId)?.name || "";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="ok">ok</td>
      <td>${escapeHtml(it.name)}</td>
      <td>${escapeHtml(matName)}</td>
      <td>${it.wMm}</td>
      <td>${it.hMm}</td>
      <td>${it.qty}</td>
      <td>${escapeHtml(it.category)}</td>
      <td class="ok">—</td>
    `;
    els.preview.appendChild(tr);
  }

  if (els.errorsInfo) {
    els.errorsInfo.textContent =
      `Валідних позицій: ${project?.items?.length ?? 0}. Матеріалів: ${project?.materials?.length ?? 0}. ` +
      `Помилок: ${errors?.length ?? 0}. ` +
      (showOnlyValid ? "(Показані тільки валідні.)" : "(У прев’ю показано частину.)");
  }
}
