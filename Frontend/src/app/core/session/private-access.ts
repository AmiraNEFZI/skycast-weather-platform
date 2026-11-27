import { inject, Injectable } from '@angular/core';
import { defer, merge, Observable, takeUntil } from 'rxjs';
import { DemoStorage } from '../demo/demo-storage';
import { PrivateRole, SESSION } from './session-provider';

export class SessionAccessError extends Error {
  constructor(readonly status: 401 | 403 | 404) {
    super({
      401: 'Une session est requise.',
      403: 'L’accès à cette ressource est refusé.',
      404: 'Ressource introuvable.',
    }[status]);
  }
}

@Injectable({ providedIn: 'root' })
export class PrivateAccess {
  private readonly session = inject(SESSION);
  private readonly demo = inject(DemoStorage);

  run<T>(requiredRole: PrivateRole, operation: (accountId: string) => Observable<T>): Observable<T> {
    return defer(() => {
      const session = this.session.current();
      if (session.role === 'visitor') throw new SessionAccessError(401);
      if (session.role !== requiredRole) throw new SessionAccessError(403);
      return operation(session.accountId);
    }).pipe(takeUntil(merge(this.session.changes, this.demo.resetStarted)));
  }
}
