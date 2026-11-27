import { inject, Injectable, signal } from '@angular/core';
import { map, Observable, timer } from 'rxjs';
import { DEMO_CONFIG } from '../config/demo-config';
import { PrivateAccess } from './private-access';

@Injectable({ providedIn: 'root' })
export class AdminMock {
  private readonly access = inject(PrivateAccess);
  private readonly delay = inject(DEMO_CONFIG).responseDelayMs;
  private readonly version = signal(0);
  readonly revision = this.version.asReadonly();

  read<T>(operation: () => T) {
    return this.access.run('admin', () => timer(this.delay / 3).pipe(map(operation)));
  }

  request<T>(operation: () => Observable<T>) {
    return this.access.run('admin', operation);
  }

  write<T>(operation: () => T) {
    return this.read(() => {
      const result = operation();
      this.version.update((value) => value + 1);
      return result;
    });
  }
}
