import { inject, signal } from '@angular/core';
import { DemoStorage } from './demo-storage';

export function demoRecords<T>(name: string, initial: readonly T[]) {
  const storage = inject(DemoStorage);
  let seed = initial;
  try {
    const saved: unknown = JSON.parse(storage.get(name) ?? 'null');
    if (Array.isArray(saved)) seed = saved as T[];
  } catch { /* Le jeu initial reste utilisable. */ }

  const rows = signal(seed);
  return {
    rows: rows.asReadonly(),
    set(value: readonly T[]) {
      if (storage.resetting()) return;
      storage.set(name, JSON.stringify(value));
      rows.set(value);
    },
  };
}
