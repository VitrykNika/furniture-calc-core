import { uid } from "../utils/id.js";

function numAttr(node, attr, def = 0) {
  if (!node) return def;

  const value = node.getAttribute(attr);

  if (value === null || value === undefined || value === "") {
    return def;
  }

  const n = Number(String(value).replace(",", "."));

  return Number.isFinite(n) ? n : def;
}

function strAttr(node, attr, def = "") {
  if (!node) return def;

  const value = node.getAttribute(attr);

  return (value ?? def).toString().trim();
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

  const utf8 = new TextDecoder("utf-8", {
    fatal: false,
  }).decode(buf);

  const encMatch = utf8.match(
    /encoding\s*=\s*["']([^"']+)["']/i
  );

  const declared = encMatch?.[1]?.toLowerCase();

  const candidates = [
    declared,
    "windows-1251",
    "cp1251",
    "utf-8",
    "iso-8859-1",
  ].filter(Boolean);

  for (const enc of candidates) {
    const decoder = safeTextDecoder(enc);

    if (!decoder) continue;

    const text = decoder.decode(buf);

    if (
      text.includes("<project") &&
      text.includes("<part")
    ) {
      return text;
    }
  }

  return utf8;
}

/* ---------------------------------------------------------
   Допоміжні функції
--------------------------------------------------------- */

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function getSideName(side) {
  const names = {
    elt: "top",
    elb: "bottom",
    ell: "left",
    elr: "right",
  };

  return names[side] || side;
}

/* ---------------------------------------------------------
   Категорія деталі
--------------------------------------------------------- */

function detectCategory(name, material) {
  const n = normalize(name);
  const m = normalize(material?.name);

  if (
    n.includes("фас") ||
    n.includes("двер")
  ) {
    return "фасад";
  }

  if (
    n.includes("зад") ||
    n.includes("хдф") ||
    m.includes("хдф") ||
    m.includes("hdf")
  ) {
    return "задня стінка";
  }

  if (
    n.includes("полиц") ||
    n.includes("полка")
  ) {
    return "полиця";
  }

  if (
    n.includes("цоколь")
  ) {
    return "цоколь";
  }

  if (
    n.includes("стільниц") ||
    n.includes("столеш")
  ) {
    return "стільниця";
  }

  return "корпус";
}

/* ---------------------------------------------------------
   Парсинг вкладеної CNC-програми
--------------------------------------------------------- */

function parseCncProgram(programText) {
  if (!programText) {
    return null;
  }

  const parser = new DOMParser();

  const doc = parser.parseFromString(
    programText,
    "application/xml"
  );

  if (doc.querySelector("parsererror")) {
    return {
      valid: false,
      error: "Не вдалося розпарсити CNC program",
      tools: [],
      operations: [],
    };
  }

  const program = doc.querySelector("program");

  if (!program) {
    return {
      valid: false,
      error: "У CNC program немає <program>",
      tools: [],
      operations: [],
    };
  }

  const tools = Array.from(
    program.querySelectorAll(":scope > tool")
  ).map((tool) => ({
    name: strAttr(tool, "name"),
    diameter: numAttr(tool, "d", 0),
  }));

  const operations = [];

  for (const node of Array.from(program.children)) {
    const tag = node.tagName;

    if (
      tag !== "bf" &&
      tag !== "bb" &&
      tag !== "bl" &&
      tag !== "br" &&
      tag !== "gr"
    ) {
      continue;
    }

    const operation = {
      type: tag,
      tool: strAttr(node, "name"),
      depth: numAttr(node, "dp", 0),
    };

    if (node.hasAttribute("x")) {
      operation.x = numAttr(node, "x");
    }

    if (node.hasAttribute("y")) {
      operation.y = numAttr(node, "y");
    }

    if (node.hasAttribute("z")) {
      operation.z = numAttr(node, "z");
    }

    if (node.hasAttribute("x1")) {
      operation.x1 = numAttr(node, "x1");
    }

    if (node.hasAttribute("y1")) {
      operation.y1 = numAttr(node, "y1");
    }

    if (node.hasAttribute("x2")) {
      operation.x2 = numAttr(node, "x2");
    }

    if (node.hasAttribute("y2")) {
      operation.y2 = numAttr(node, "y2");
    }

    if (node.hasAttribute("d")) {
      operation.diameter = numAttr(node, "d");
    }

    if (node.hasAttribute("comment")) {
      operation.comment = strAttr(node, "comment");
    }

    if (node.hasAttribute("c")) {
      operation.c = numAttr(node, "c");
    }

    if (node.hasAttribute("t")) {
      operation.t = numAttr(node, "t");
    }

    if (node.hasAttribute("m")) {
      operation.m = strAttr(node, "m") === "true";
    }

    operations.push(operation);
  }

  return {
    valid: true,

    dimensions: {
      length: numAttr(program, "dx"),
      width: numAttr(program, "dy"),
      thickness: numAttr(program, "dz"),
    },

    tools,
    operations,
  };
}

/* ---------------------------------------------------------
   Матеріали
--------------------------------------------------------- */

function parseMaterials(xmlDoc) {
  const materials = new Map();

  for (const good of Array.from(
    xmlDoc.querySelectorAll("good")
  )) {
    const type = strAttr(good, "typeId");
    const id = strAttr(good, "id");

    if (!id) continue;

    if (
      type === "sheet" ||
      type === "band"
    ) {
      materials.set(id, {
        id,
        type,
        name: strAttr(good, "name"),
        code: strAttr(good, "code"),

        thickness: numAttr(good, "t", 0),

        width: numAttr(good, "w", 0),
        length: numAttr(good, "l", 0),

        count: numAttr(good, "count", 0),

        raw: {
          ...good.attributes
            ? Object.fromEntries(
                Array.from(good.attributes).map((a) => [
                  a.name,
                  a.value,
                ])
              )
            : {},
        },
      });
    }
  }

  return materials;
}

/* ---------------------------------------------------------
   Операції розкрою / крайки / CNC
--------------------------------------------------------- */

function parseOperations(xmlDoc) {
  const operations = new Map();

  for (const op of Array.from(
    xmlDoc.querySelectorAll(":scope > operation")
  )) {
    const id = strAttr(op, "id");

    if (!id) continue;

    const type = strAttr(op, "typeId");

    const materialNode = op.querySelector(
      ":scope > material"
    );

    const materialId = materialNode
      ? strAttr(materialNode, "id")
      : "";

    const partIds = Array.from(
      op.querySelectorAll(":scope > part")
    ).map((part) =>
      strAttr(part, "id")
    );

    const result = {
      id,
      type,
      materialId,
      partIds,

      side: strAttr(op, "side"),
      code: strAttr(op, "code"),
      typeName: strAttr(op, "typeName"),

      tool1: strAttr(op, "tool1"),

      bySizeDetail:
        strAttr(op, "bySizeDetail") === "true",

      program: null,
    };

    if (type === "XNC") {
      result.program = parseCncProgram(
        strAttr(op, "program")
      );
    }

    operations.set(id, result);
  }

  return operations;
}

/* ---------------------------------------------------------
   Основний парсер
--------------------------------------------------------- */

export function convertProjectXmlToFurnitureJson(
  xmlText,
  fileBaseName = "Converted .project"
) {
  const parser = new DOMParser();

  const xmlDoc = parser.parseFromString(
    xmlText,
    "application/xml"
  );

  if (xmlDoc.querySelector("parsererror")) {
    throw new Error(
      "Не вдалося розпарсити XML .project."
    );
  }

  /* -------------------------------------------------------
     1. Знаходимо саме PRODUCT
     
     ВАЖЛИВО:
     більше НЕ використовуємо:
     
     xmlDoc.querySelectorAll("part")
     
     бо це знаходить усі технічні part.
  ------------------------------------------------------- */

  const product = xmlDoc.querySelector(
    'good[typeId="product"]'
  );

  if (!product) {
    throw new Error(
      "У .project не знайдено good[typeId=\"product\"]."
    );
  }

  /* -------------------------------------------------------
     2. Матеріали
  ------------------------------------------------------- */

  const materialsMap = parseMaterials(xmlDoc);

  /* -------------------------------------------------------
     3. Операції
  ------------------------------------------------------- */

  const operationsMap = parseOperations(xmlDoc);

  /* -------------------------------------------------------
     4. Тільки прямі part всередині PRODUCT
  ------------------------------------------------------- */

  const parts = Array.from(
    product.querySelectorAll(":scope > part")
  );

  if (!parts.length) {
    throw new Error(
      "У виробі не знайдено жодної деталі."
    );
  }

  /* -------------------------------------------------------
     5. Карти зв'язків
  ------------------------------------------------------- */

  const partMaterialMap = new Map();
  const partEdgeMap = new Map();
  const partCncMap = new Map();

  for (const operation of operationsMap.values()) {
    /* -------------------------------
       Матеріал / розкрій
    -------------------------------- */

    if (
      operation.type === "CS" &&
      operation.materialId
    ) {
      for (const partId of operation.partIds) {
        partMaterialMap.set(
          partId,
          operation.materialId
        );
      }
    }

    /* -------------------------------
       Крайка
    -------------------------------- */

    if (
      operation.type === "EL" &&
      operation.materialId
    ) {
      for (const partId of operation.partIds) {
        if (!partEdgeMap.has(partId)) {
          partEdgeMap.set(partId, []);
        }

        partEdgeMap.get(partId).push({
          operationId: operation.id,
          materialId: operation.materialId,
        });
      }
    }

    /* -------------------------------
       CNC
    -------------------------------- */

    if (
      operation.type === "XNC"
    ) {
      for (const partId of operation.partIds) {
        if (!partCncMap.has(partId)) {
          partCncMap.set(partId, []);
        }

        partCncMap.get(partId).push(operation);
      }
    }
  }

  /* -------------------------------------------------------
     6. project materials
  ------------------------------------------------------- */

  const projectMaterials = [];

  for (const material of materialsMap.values()) {
    if (
      material.type !== "sheet" &&
      material.type !== "band"
    ) {
      continue;
    }

    projectMaterials.push({
      id: uid(),

      sourceId: material.id,

      type: material.type,

      name: material.name,

      code: material.code,

      thicknessMm: material.thickness,

      sheetLengthMm: material.length,

      sheetWidthMm: material.width,

      pricePerM2: 0,

      pricePerMeter: 0,

      wasteFactor: 1,
    });
  }

  /* -------------------------------------------------------
     source material id -> project material id
  ------------------------------------------------------- */

  const projectMaterialBySourceId =
    new Map();

  for (const material of projectMaterials) {
    projectMaterialBySourceId.set(
      material.sourceId,
      material.id
    );
  }

  /* -------------------------------------------------------
     7. Деталі
  ------------------------------------------------------- */

  const items = [];
  const errors = [];

  for (let index = 0; index < parts.length; index++) {
    const part = parts[index];

    const sourceId = strAttr(
      part,
      "id",
      String(index + 1)
    );

    const dl = numAttr(
      part,
      "dl",
      NaN
    );

    const dw = numAttr(
      part,
      "dw",
      NaN
    );

    const qty = numAttr(
      part,
      "count",
      NaN
    );

    const name =
      strAttr(part, "code") ||
      strAttr(part, "part.position") ||
      strAttr(part, "name") ||
      `Деталь ${sourceId}`;

    const fullName =
      strAttr(part, "name") || name;

    const rowErrors = [];

    if (
      !Number.isFinite(dl) ||
      dl <= 0
    ) {
      rowErrors.push(
        "dl некоректне"
      );
    }

    if (
      !Number.isFinite(dw) ||
      dw <= 0
    ) {
      rowErrors.push(
        "dw некоректне"
      );
    }

    if (
      !Number.isFinite(qty) ||
      qty <= 0
    ) {
      rowErrors.push(
        "count некоректне"
      );
    }

    /* -------------------------------------------
       Матеріал
    ------------------------------------------- */

    const sourceMaterialId =
      partMaterialMap.get(sourceId) || "";

    const sourceMaterial =
      materialsMap.get(
        sourceMaterialId
      );

    const materialId =
      projectMaterialBySourceId.get(
        sourceMaterialId
      ) || "";

    /* -------------------------------------------
       Категорія
    ------------------------------------------- */

    const category =
      detectCategory(
        fullName,
        sourceMaterial
      );

    /* -------------------------------------------
       Крайка
    ------------------------------------------- */

    const edgeOperations =
      partEdgeMap.get(sourceId) || [];

    const edging = [];

    /* -------------------------------------------
       Визначаємо сторони прямо з part:
       
       elt = top
       elb = bottom
       ell = left
       elr = right
    ------------------------------------------- */

    const sides = [
      "elt",
      "elb",
      "ell",
      "elr",
    ];

    for (const side of sides) {
      const operationRef =
        strAttr(part, side);

      if (!operationRef) {
        continue;
      }

      const match =
        operationRef.match(
          /@operation#(.+)/
        );

      if (!match) {
        continue;
      }

      const operationId =
        match[1];

      const operation =
        operationsMap.get(
          operationId
        );

      if (!operation) {
        continue;
      }

      const band =
        materialsMap.get(
          operation.materialId
        );

      edging.push({
        side: getSideName(side),

        sourceSide: side,

        operationId,

        materialId:
          projectMaterialBySourceId.get(
            operation.materialId
          ) || "",

        materialName:
          band?.name || "",

        materialCode:
          band?.code || "",

        thicknessMm:
          band?.thickness || 0,

        widthMm:
          band?.width || 0,
      });
    }

    /* -------------------------------------------
       CNC
    ------------------------------------------- */

    const cncOperations =
      partCncMap.get(sourceId) || [];

    const cnc = cncOperations.map(
      (operation) => ({
        id: operation.id,

        code: operation.code,

        typeName:
          operation.typeName,

        side:
          operation.side,

        tools:
          operation.program?.tools || [],

        dimensions:
          operation.program?.dimensions || null,

        operations:
          operation.program?.operations || [],
      })
    );

    /* -------------------------------------------
       Статистика CNC
    ------------------------------------------- */

    const cncOperationList =
      cnc.flatMap(
        (operation) =>
          operation.operations || []
      );

    const cncSummary = {};

    for (const operation of cncOperationList) {
      const key =
        operation.tool ||
        operation.type;

      if (!cncSummary[key]) {
        cncSummary[key] = 0;
      }

      cncSummary[key]++;
    }

    /* -------------------------------------------
       Якщо помилки
    ------------------------------------------- */

    if (rowErrors.length) {
      errors.push({
        index: index + 1,

        sourceId,

        name: fullName,

        materialName:
          sourceMaterial?.name || "",

        w: dl,

        h: dw,

        qty,

        category,

        error:
          rowErrors.join(", "),
      });

      continue;
    }

    /* -------------------------------------------
       Площа
    ------------------------------------------- */

    const areaM2 =
      (dl * dw * qty) /
      1_000_000;

    /* -------------------------------------------
       Погонні метри крайки
    ------------------------------------------- */

    let edgeMeters = 0;

    for (const edge of edging) {
      if (
        edge.side === "top" ||
        edge.side === "bottom"
      ) {
        edgeMeters += dl / 1000;
      }

      if (
        edge.side === "left" ||
        edge.side === "right"
      ) {
        edgeMeters += dw / 1000;
      }
    }

    edgeMeters *= qty;

    /* -------------------------------------------
       Зберігаємо ВСЮ деталь
    ------------------------------------------- */

    items.push({
      id: uid(),

      sourceId,

      sourceCode:
        strAttr(part, "code"),

      sourcePosition:
        strAttr(
          part,
          "part.position"
        ),

      name: fullName,

      code:
        strAttr(part, "code"),

      category,

      dimensions: {
        lengthMm: Math.round(dl),

        widthMm: Math.round(dw),

        thicknessMm:
          sourceMaterial?.thickness || 0,
      },

      wMm: Math.round(dl),

      hMm: Math.round(dw),

      qty: Math.round(qty),

      areaM2,

      materialId,

      material: sourceMaterial
        ? {
            sourceId:
              sourceMaterial.id,

            name:
              sourceMaterial.name,

            code:
              sourceMaterial.code,

            type:
              sourceMaterial.type,

            thicknessMm:
              sourceMaterial.thickness,

            sheetLengthMm:
              sourceMaterial.length,

            sheetWidthMm:
              sourceMaterial.width,
          }
        : null,

      edging,

      edgeMeters,

      edgeType:
        edging
          .map(
            (e) =>
              e.materialName
          )
          .filter(Boolean)
          .join(", "),

      cnc,

      cncSummary,

      sourceAttributes:
        Object.fromEntries(
          Array.from(
            part.attributes
          ).map((attribute) => [
            attribute.name,
            attribute.value,
          ])
        ),

      areaMultiplier: 1,
    });
  }

  /* -------------------------------------------------------
     8. Meta
  ------------------------------------------------------- */

  const now =
    new Date().toISOString();

  const productName =
    strAttr(product, "name") ||
    fileBaseName;

  const project = {
    format:
      "furniture-calc-project",

    version: 1,

    meta: {
      name:
        `Converted: ${fileBaseName}`,

      productName,

      productSourceId:
        strAttr(product, "id"),

      productCount:
        numAttr(product, "count", 1),

      importBMV:
        strAttr(
          xmlDoc.documentElement,
          "importBMV"
        ),

      currency: "UAH",

      markupPercent: 0,

      createdAt: now,

      updatedAt: now,

      source:
        "project-xml",
    },

    materials:
      projectMaterials,

    items,
  };

  return {
    project,
    errors,
  };
}