/** Prevents duplicate reorder handling when several list monitors fire for one move. */
let lastReorderKey: string | null = null;

export function tryConsumeRolePoolReorder(key: string): boolean {
  if (lastReorderKey === key) return false;
  lastReorderKey = key;
  queueMicrotask(() => {
    if (lastReorderKey === key) lastReorderKey = null;
  });
  return true;
}

export function clearRolePoolReorderLock(): void {
  lastReorderKey = null;
}
