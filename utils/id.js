export function uid() {
  return crypto?.randomUUID?.() ?? String(Date.now() + Math.random());
}
