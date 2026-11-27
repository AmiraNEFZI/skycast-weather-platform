import { inject, Injectable } from '@angular/core';
import { map, timer } from 'rxjs';
import { DEMO_CONFIG } from '../config/demo-config';
import { PrivateAccess, SessionAccessError } from './private-access';
import { demoProfiles } from './session-provider';

export type PersonalArea = 'favorites' | 'alerts';

interface DemoItem {
  readonly id: string;
  readonly owner: string;
  readonly area: PersonalArea;
  readonly title: string;
}

const personalItems: readonly DemoItem[] = [
  { id: 'favorite-tunis', owner: 'demo-amel', area: 'favorites', title: 'Tunis' },
  { id: 'favorite-sousse', owner: 'demo-karim', area: 'favorites', title: 'Sousse' },
  { id: 'alert-wind', owner: 'demo-amel', area: 'alerts', title: 'Vent fort à Tunis' },
  { id: 'alert-rain', owner: 'demo-karim', area: 'alerts', title: 'Pluie à Sousse' },
];

@Injectable({ providedIn: 'root' })
export class DemoPrivateData {
  private readonly access = inject(PrivateAccess);
  private readonly delay = inject(DEMO_CONFIG).responseDelayMs;

  list(area: PersonalArea) {
    return this.access.run('user', (owner) => timer(this.delay).pipe(map(() =>
      personalItems.filter((item) => item.owner === owner && item.area === area)
        .map(({ id, title }) => ({ id, title })),
    )));
  }

  read(id: string) {
    return this.access.run('user', (owner) => timer(this.delay).pipe(map(() => {
      const item = personalItems.find((candidate) => candidate.id === id);
      if (!item) throw new SessionAccessError(404);
      if (item.owner !== owner) throw new SessionAccessError(403);
      return { id: item.id, title: item.title };
    })));
  }

  listAccounts() {
    return this.access.run('admin', () => timer(this.delay).pipe(map(() =>
      demoProfiles.flatMap(({ session }) => session.role === 'user'
        ? [{ id: session.accountId, name: session.name }]
        : []),
    )));
  }
}
