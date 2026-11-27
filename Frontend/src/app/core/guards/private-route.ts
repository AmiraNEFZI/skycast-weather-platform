import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, CanActivateFn, NavigationEnd, ParamMap, Router } from '@angular/router';
import { filter, merge } from 'rxjs';
import { PrivateRole, SESSION, Session } from '../session/session-provider';

export const privateAreas = {
  favoris: { title: 'Favoris', role: 'user' },
  alertes: { title: 'Alertes', role: 'user' },
  administration: { title: 'Administration', role: 'admin' },
} as const satisfies Record<string, { title: string; role: PrivateRole }>;

export type PrivateArea = keyof typeof privateAreas;

export function readPrivateArea(value: unknown): PrivateArea | undefined {
  return value === 'favoris' || value === 'alertes' || value === 'administration' ? value : undefined;
}

function redirect(router: Router, area: PrivateArea, session: Session, params: ParamMap) {
  return router.createUrlTree([session.role === 'visitor' ? '/connexion' : '/acces-refuse'], {
    queryParams: { destination: area, ville: params.get('ville') },
  });
}

export const requireProfile: CanActivateFn = (route) => {
  const area = readPrivateArea(route.data['privateArea']);
  if (!area) return false;
  const session = inject(SESSION).current();
  return session.role === privateAreas[area].role || redirect(inject(Router), area, session, route.queryParamMap);
};

@Injectable({ providedIn: 'root' })
export class PrivateRouteMonitor {
  private readonly router = inject(Router);
  private readonly session = inject(SESSION);

  constructor() {
    merge(
      this.session.changes,
      this.router.events.pipe(filter((event) => event instanceof NavigationEnd)),
    ).pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe(() => this.recheck());
  }

  private recheck(): void {
    const root = this.router.routerState.snapshot.root;
    let route: ActivatedRouteSnapshot | null = root;
    while (route) {
      const area = readPrivateArea(route.data['privateArea']);
      if (area) {
        const session = this.session.current();
        if (session.role !== privateAreas[area].role) {
          void this.router.navigateByUrl(redirect(this.router, area, session, root.queryParamMap), { replaceUrl: true });
        }
        return;
      }
      route = route.firstChild;
    }
  }
}
