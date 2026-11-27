import { computed, inject, Injectable, InjectionToken, Signal, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { DemoStorage } from '../demo/demo-storage';
import { demoAccounts } from '../demo/demo-fixtures';

export type Session =
  | { readonly role: 'visitor' }
  | { readonly role: 'user' | 'admin'; readonly accountId: string; readonly name: string };

export type PrivateRole = 'user' | 'admin';

interface SessionProvider {
  readonly current: Signal<Session>;
  /** Emits synchronously after the active identity changes. */
  readonly changes: Observable<void>;
}

export const demoProfiles = [
  { key: 'visitor', label: 'Visiteur', session: { role: 'visitor' } },
  { key: 'amel', label: 'Utilisateur · Amel', session: { role: 'user', accountId: demoAccounts.amel, name: 'Amel' } },
  { key: 'karim', label: 'Utilisateur · Karim', session: { role: 'user', accountId: demoAccounts.karim, name: 'Karim' } },
  { key: 'admin', label: 'Administrateur · Lina', session: { role: 'admin', accountId: demoAccounts.lina, name: 'Lina' } },
] as const satisfies readonly { key: string; label: string; session: Session }[];

type DemoProfile = (typeof demoProfiles)[number];
const storageKey = 'profile';

@Injectable({ providedIn: 'root' })
export class MockSessionProvider implements SessionProvider {
  private readonly storage = inject(DemoStorage);
  private readonly active = signal(this.restore());
  private readonly transitions = new Subject<void>();
  readonly profile = this.active.asReadonly();
  readonly current = computed<Session>(() => this.profile().session);
  readonly changes = this.transitions.asObservable();

  select(key: string): void {
    const profile = demoProfiles.find((candidate) => candidate.key === key);
    if (!profile || profile === this.active() || this.storage.resetting()) return;

    this.active.set(profile);
    this.storage.set(storageKey, profile.session.role === 'visitor' ? null : profile.key);
    this.transitions.next();
  }

  private restore(): DemoProfile {
    const key = this.storage.get(storageKey);
    return demoProfiles.find((candidate) => candidate.key === key) ?? demoProfiles[0];
  }
}

export const SESSION = new InjectionToken<SessionProvider>('Session SkyCast', {
  providedIn: 'root',
  factory: () => inject(MockSessionProvider),
});
