import { parseCsv } from "../parsers/csv.js";
import { parseXlsx } from "../parsers/xlsx.js";
import { readProjectFileAsText, convertProjectXmlToFurnitureJson } from "../parsers/projectXml.js";
import { renderMapping, getMapping, validateMapping } from "./mapping.js";
import { buildProjectFromRows } from "./buildProjectFromRows.js";
import { renderPreview } from "./preview.js";
import { downloadJson } from "../utils/download.js";

export function initConverterEvents(els, state) {
  els.onlyValid?.addEventListener("change", (e) => {
    state.showOnlyValid = e.target.checked;
    if (state.projectJson) renderPreview(els, state.lastErrors, state.projectJson, state.showOnlyValid);
  });

  els.file?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const lower = file.name.toLowerCase();
    const baseName = file.name.replace(/\.[^.]+$/, "");

    els.fileInfo && (els.fileInfo.textContent = `${file.name} (${Math.round(file.size / 1024)} KB)`);
    els.status && (els.status.textContent = "Читаю файл…");

    // reset converter
    state.projectJson = null;
    state.lastErrors = [];
    state.rawRows = [];
    state.headers = [];

    els.preview && (els.preview.innerHTML = "");
    els.errorsInfo && (els.errorsInfo.textContent = "");
    els.mapping && (els.mapping.innerHTML = "");
    els.btnDownload && (els.btnDownload.disabled = true);

    try {
      // .project -> direct
      if (lower.endsWith(".project")) {
        const xmlText = await readProjectFileAsText(file);
        const { project, errors } = convertProjectXmlToFurnitureJson(xmlText, baseName);

        state.projectJson = project;
        state.lastErrors = errors;

        renderPreview(els, state.lastErrors, state.projectJson, state.showOnlyValid);

        els.btnConvert && (els.btnConvert.disabled = true);
        els.btnDownload && (els.btnDownload.disabled = false);

        els.status &&
          (els.status.textContent = errors.length
            ? `Імпортовано .project з помилками (${errors.length}).`
            : `Імпортовано .project успішно. Позицій: ${project.items.length}.`);

        return;
      }

      // table -> mapping flow
      els.btnConvert && (els.btnConvert.disabled = false);

      if (lower.endsWith(".csv")) {
        const text = await file.text();
        const parsed = parseCsv(text);
        state.headers = parsed.headers;
        state.rawRows = parsed.rows;
      } else {
        const buf = await file.arrayBuffer();
        const parsed = parseXlsx(buf);
        state.headers = parsed.headers;
        state.rawRows = parsed.rows;
      }

      if (!state.headers.length || !state.rawRows.length) {
        els.status && (els.status.textContent = "Не знайшов даних у файлі.");
        return;
      }

      renderMapping(els, state.headers);
      els.status && (els.status.textContent = `Зчитано рядків: ${state.rawRows.length}. Налаштуй мапінг і натисни “Конвертувати”.`);
    } catch (err) {
      console.error(err);
      els.status && (els.status.textContent = err?.message || "Помилка читання файлу.");
    } finally {
      els.file.value = "";
    }
  });

  els.btnConvert?.addEventListener("click", () => {
    if (!state.rawRows.length) {
      els.status && (els.status.textContent = "Спочатку завантаж Excel/CSV файл.");
      return;
    }

    const mapping = getMapping(els);
    const missing = validateMapping(mapping);
    if (missing.length) {
      els.status && (els.status.textContent = `Заповни обов’язкові поля: ${missing.join(", ")}`);
      return;
    }

    const { project, errors } = buildProjectFromRows(state.rawRows, mapping, "table");

    state.projectJson = project;
    state.lastErrors = errors;

    renderPreview(els, state.lastErrors, state.projectJson, state.showOnlyValid);

    els.btnDownload && (els.btnDownload.disabled = false);
    els.status &&
      (els.status.textContent = errors.length ? `Конвертовано з помилками (${errors.length}).` : "Конвертовано успішно.");
  });

  els.btnDownload?.addEventListener("click", () => {
    if (!state.projectJson) return;
    const safe = (state.projectJson.meta?.name || "project").replace(/[^\w\-а-яіїєґ ]/gi, "_");
    downloadJson(state.projectJson, `${safe}.json`);
  });
}
