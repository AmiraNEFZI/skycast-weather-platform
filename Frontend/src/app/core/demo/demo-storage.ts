import { DOCUMENT, inject, Injectable, signal } from '@angular/core';
import { ReplaySubject } from 'rxjs';

const prefix = 'skycast.demo.';
const resetNotice = 'reset-notice';

@Injectable({ providedIn: 'root' })
export class DemoStorage {
  private readonly window = inject(DOCUMENT).defaultView;
  private readonly resetState = signal(false);
  private readonly reset = new ReplaySubject<void>(1);
  readonly resetting = this.resetState.asReadonly();
  readonly resetStarted = this.reset.asObservable();

  get(name: string): string | null {
    try { return this.window?.sessionStorage.getItem(prefix + name) ?? null; }
    catch { return null; }
  }

  set(name: string, value: string | null): void {
    if (!this.resetting()) this.write(name, value);
  }

  takeResetNotice(): boolean {
    const present = this.get(resetNotice) === '1';
    if (present) this.set(resetNotice, null);
    return present;
  }

  beginReset(): void {
    if (this.resetting()) return;
    this.resetState.set(true);
    this.reset.next();
    try {
      const storage = this.window?.sessionStorage;
      if (!storage) return;
      for (let index = storage.length - 1; index >= 0; index--) {
        const key = storage.key(index);
        if (key?.startsWith(prefix)) storage.removeItem(key);
      }
      this.write(resetNotice, '1');
    } catch { /* Un rechargement réinitialise aussi les données uniquement en mémoire. */ }
  }

  private write(name: string, value: string | null): void {
    try {
      const storage = this.window?.sessionStorage;
      if (value === null) storage?.removeItem(prefix + name);
      else storage?.setItem(prefix + name, value);
    } catch { /* Le stockage peut être désactivé. */ }
  }
}
