import { FIELDS, REQUIRED } from "../config.js";

export function autoGuessHeaderForField(key, hdrs) {
  const norm = (s) => String(s).toLowerCase().replace(/\s+/g, "");
  const H = hdrs.map((h) => ({ raw: h, n: norm(h) }));
  const pick = (cands) => H.find((x) => cands.some((c) => x.n.includes(c)))?.raw || "";

  switch (key) {
    case "name": return pick(["name", "назва", "деталь", "позиція", "item"]);
    case "material": return pick(["material", "матеріал", "мат", "плита"]);
    case "wMm": return pick(["w", "width", "шир", "x"]);
    case "hMm": return pick(["h", "height", "вис", "y", "long", "len"]);
    case "qty": return pick(["qty", "кіль", "кол", "quantity", "шт"]);
    case "category": return pick(["category", "катег", "тип"]);
    case "edgeMeters": return pick(["edge", "кром", "кромка", "edgem"]);
    case "edgeType": return pick(["edgetype", "типкром", "кромкатип"]);
    case "pricePerM2": return pick(["price", "ціна", "грн", "uah", "м2", "m2"]);
    default: return "";
  }
}

export function renderMapping(els, headers) {
  if (!els.mapping) return;
  els.mapping.innerHTML = "";

  for (const f of FIELDS) {
    const wrap = document.createElement("label");
    wrap.style.display = "flex";
    wrap.style.flexDirection = "column";
    wrap.style.gap = "6px";

    const title = document.createElement("span");
    title.className = "muted";
    title.textContent = f.label;

    const sel = document.createElement("select");
    sel.dataset.key = f.key;

    const o0 = document.createElement("option");
    o0.value = "";
    o0.textContent = "— не мапити —";
    sel.appendChild(o0);

    for (const h of headers) {
      const o = document.createElement("option");
      o.value = h;
      o.textContent = h;
      sel.appendChild(o);
    }

    const guess = autoGuessHeaderForField(f.key, headers);
    if (guess) sel.value = guess;

    wrap.appendChild(title);
    wrap.appendChild(sel);
    els.mapping.appendChild(wrap);
  }
}

export function getMapping(els) {
  const mapping = {};
  els.mapping?.querySelectorAll("select[data-key]")?.forEach((sel) => {
    mapping[sel.dataset.key] = sel.value || "";
  });
  return mapping;
}

export function validateMapping(mapping) {
  return REQUIRED.filter((k) => !mapping[k]);
}
