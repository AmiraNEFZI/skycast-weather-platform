import { inject, Injectable } from '@angular/core';
import { map, timer } from 'rxjs';
import { DEMO_CONFIG } from '../config/demo-config';
import { PrivateAccess, SessionAccessError } from './private-access';

export class DemoConflict extends Error {
  constructor(readonly status: 409 | 422 | 429 | 503, message: string) { super(message); }
}

export function owned<T extends { id: string; owner: string }>(rows: readonly T[], id: string, owner: string): T {
  const row = rows.find((entry) => entry.id === id);
  if (!row) throw new SessionAccessError(404);
  if (row.owner !== owner) throw new SessionAccessError(403);
  return row;
}

@Injectable({ providedIn: 'root' })
export class UserMock {
  private readonly access = inject(PrivateAccess);
  private readonly delay = inject(DEMO_CONFIG).responseDelayMs;

  run<T>(operation: (owner: string) => T) {
    return this.access.run('user', (owner) => timer(this.delay / 2).pipe(map(() => operation(owner))));
  }
}

