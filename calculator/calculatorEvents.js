import { toNumber } from "../utils/numbers.js";
import { importProjectJsonFile } from "./validateProject.js";
import {
  clearCalculatorUi,
  renderCalculator,
} from "./renderCalculator.js";
import { exportEstimateXlsx } from "./exportExcel.js";

export function initCalculatorEvents(els, state) {
  // =========================================================
  // LOAD project.json
  // =========================================================

  els.calcFile?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    clearCalculatorUi(els);
    state.calcProject = null;

    try {
      const project =
        await importProjectJsonFile(file);

      state.calcProject = project;

      // беремо markupPercent із JSON, якщо він є
      const mp =
        toNumber(project?.meta?.markupPercent);

      if (
        els.markupInput &&
        Number.isFinite(mp)
      ) {
        els.markupInput.value =
          String(mp);
      }

      renderCalculator(
        els,
        state.calcProject
      );
    } catch (err) {
      console.error(err);

      alert(
        err?.message ||
          "Помилка імпорту project.json"
      );
    } finally {
      if (els.calcFile) {
        els.calcFile.value = "";
      }
    }
  });

  // =========================================================
  // PRICE INPUT HANDLER
  // =========================================================

  function handlePriceInput(e) {
    const t = e.target;

    if (
      !(t instanceof HTMLInputElement)
    ) {
      return;
    }

    if (
      !t.classList.contains(
        "priceInput"
      )
    ) {
      return;
    }

    if (!state.calcProject) {
      return;
    }

    const id =
      t.dataset.materialId;

    const priceKind =
      t.dataset.priceKind ||
      "m2";

    /*
     * Для input type="number"
     * valueAsNumber зручніший за звичайний value.
     */
    const price =
      t.valueAsNumber;

    const mat =
      (
        state.calcProject.materials ||
        []
      ).find(
        (m) => m.id === id
      );

    if (!mat) {
      console.warn(
        "Матеріал не знайдений:",
        id
      );

      return;
    }

    // -------------------------------------------------------
    // КРАЙКА — ціна за погонний метр
    // -------------------------------------------------------

    if (
      priceKind === "meter"
    ) {
      mat.pricePerMeter =
        Number.isFinite(price)
          ? price
          : 0;
    }

    // -------------------------------------------------------
    // ЛИСТОВИЙ МАТЕРІАЛ — ціна за м²
    // -------------------------------------------------------

    else {
      mat.pricePerM2 =
        Number.isFinite(price)
          ? price
          : 0;
    }

    renderCalculator(
      els,
      state.calcProject
    );
  }

  // =========================================================
  // MATERIAL PRICES
  // =========================================================

  els.materialsTable
    ?.addEventListener(
      "input",
      handlePriceInput
    );

  // =========================================================
  // EDGING PRICES
  // =========================================================

  els.edgingTable
    ?.addEventListener(
      "input",
      handlePriceInput
    );

  // =========================================================
  // MARKUP
  // =========================================================

  els.markupInput
    ?.addEventListener(
      "input",
      () => {
        if (
          state.calcProject
        ) {
          renderCalculator(
            els,
            state.calcProject
          );
        }
      }
    );

  // =========================================================
  // EXPORT EXCEL
  // =========================================================

  els.exportExcel
    ?.addEventListener(
      "click",
      () => {
        if (
          !state.calcProject
        ) {
          alert(
            "Спочатку завантаж project.json у калькулятор."
          );

          return;
        }

        const markup =
          toNumber(
            els.markupInput?.value
          ) || 0;

        try {
          exportEstimateXlsx(
            state.calcProject,
            markup
          );
        } catch (err) {
          console.error(err);

          alert(
            err?.message ||
              "Помилка експорту Excel"
          );
        }
      }
    );
}