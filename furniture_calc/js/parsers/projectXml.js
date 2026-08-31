import { uid } from "../utils/id.js";

function numAttr(node, attr, def = 0) {
  const v = node.getAttribute(attr);
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : def;
}

function strAttr(node, attr, def = "") {
  const v = node.getAttribute(attr);
  return (v ?? def).toString().trim();
}

function safeTextDecoder(enc) {
  try {
    return new TextDecoder(enc);
  } catch {
    return null;
  }
}

export async function readProjectFileAsText(file) {
  const buf = await file.arrayBuffer();

  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(buf);
  const encMatch = utf8.match(/encoding\s*=\s*["']([^"']+)["']/i);
  const declared = encMatch?.[1]?.toLowerCase();

  const candidates = [declared, "windows-1251", "cp1251", "utf-8", "iso-8859-1"].filter(Boolean);

  for (const enc of candidates) {
    const dec = safeTextDecoder(enc);
    if (!dec) continue;
    const text = dec.decode(buf);
    if (text.includes("<project") && text.includes("<part")) return text;
  }

  return utf8;
}

export function convertProjectXmlToFurnitureJson(xmlText, fileBaseName = "Converted .project") {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "application/xml");

  if (xmlDoc.querySelector("parsererror")) {
    throw new Error("Не вдалося розпарсити XML .project (parsererror).");
  }

  const parts = Array.from(xmlDoc.querySelectorAll("part"));
  if (!parts.length) throw new Error("У файлі не знайдено жодної деталі (<part>).");

  const normalize = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();

  function autoCategory(nameRaw) {
    const n = normalize(nameRaw);
    if (n.includes("фасад") || n.includes("фас") || n.includes("двер")) return { category: "фасад", areaMultiplier: 1.15 };
    if (n.includes("хдф") || n.includes("зад") || n.includes("задняя") || n.includes("задня")) return { category: "задня стінка", areaMultiplier: 1.05 };
    if (n.includes("полиц") || n.includes("полка")) return { category: "полиця", areaMultiplier: 1.05 };
    if (n.includes("стільниц") || n.includes("столеш") || n.includes("стіл")) return { category: "стільниця", areaMultiplier: 1.10 };
    if (n.includes("цоколь")) return { category: "цоколь", areaMultiplier: 1.05 };
    return { category: "корпус", areaMultiplier: 1.05 };
  }

  const materialIds = { ldsp: uid(), mdf: uid(), hdf: uid(), top: uid() };

  function pickMaterialId(category) {
    const c = normalize(category);
    if (c.includes("фасад")) return materialIds.mdf;
    if (c.includes("задня")) return materialIds.hdf;
    if (c.includes("стільниц")) return materialIds.top;
    return materialIds.ldsp;
  }

  const items = [];
  const errors = [];

  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];

    const dl = numAttr(p, "dl", NaN);
    const dw = numAttr(p, "dw", NaN);
    const qty = numAttr(p, "count", NaN);

    const name = strAttr(p, "name", "") || `Деталь ${strAttr(p, "id", String(i + 1))}`;
    const code = strAttr(p, "code", "");
    const fullName = code ? `${name} (${code})` : name;

    const rowErr = [];
    if (!Number.isFinite(dl) || dl <= 0) rowErr.push("dl некоректне");
    if (!Number.isFinite(dw) || dw <= 0) rowErr.push("dw некоректне");
    if (!Number.isFinite(qty) || qty <= 0) rowErr.push("count некоректне");

    if (rowErr.length) {
      errors.push({
        index: i + 1,
        name: fullName,
        materialName: "",
        w: dl,
        h: dw,
        qty,
        category: "",
        error: rowErr.join(", "),
      });
      continue;
    }

    const { category, areaMultiplier } = autoCategory(fullName);
    const materialId = pickMaterialId(category);

    items.push({
      id: uid(),
      category,
      name: fullName,
      wMm: Math.round(dl),
      hMm: Math.round(dw),
      qty: Math.round(qty),
      materialId,
      areaMultiplier,
      edgeMeters: 0,
      edgeType: "",
    });
  }

  const now = new Date().toISOString();

  const project = {
    format: "furniture-calc-project",
    version: 1,
    meta: {
      name: `Converted: ${fileBaseName}`,
      client: "",
      type: "other",
      currency: "UAH",
      markupPercent: 0,
      createdAt: now,
      updatedAt: now,
      source: "project-xml",
    },
    materials: [
      { id: materialIds.ldsp, name: "ЛДСП (корпус/полиці/цоколь)", pricePerM2: 0, wasteFactor: 1.08 },
      { id: materialIds.mdf, name: "МДФ (фасади)", pricePerM2: 0, wasteFactor: 1.15 },
      { id: materialIds.hdf, name: "ХДФ (задні стінки)", pricePerM2: 0, wasteFactor: 1.05 },
      { id: materialIds.top, name: "Стільниця", pricePerM2: 0, wasteFactor: 1.10 },
    ],
    items,
  };

  return { project, errors };
}
