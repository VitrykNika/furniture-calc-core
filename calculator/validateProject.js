export function validateProjectJson(project) {
  if (!project || typeof project !== "object") throw new Error("Некоректний JSON");
  if (project.format !== "furniture-calc-project") throw new Error("Це не furniture-calc-project файл");
  if (project.version !== 1) throw new Error("Непідтримувана версія project");
  if (!Array.isArray(project.materials) || !Array.isArray(project.items)) throw new Error("Немає materials/items");
}

export async function importProjectJsonFile(file) {
  const text = await file.text();
  const project = JSON.parse(text);
  validateProjectJson(project);
  return project;
}
