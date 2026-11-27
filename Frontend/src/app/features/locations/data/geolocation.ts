import { DOCUMENT, inject, InjectionToken } from '@angular/core';
import { Observable, timer, map } from 'rxjs';
import { Coordinates } from '../location';

export type PositionResult = Coordinates | 'denied' | 'timeout' | 'unavailable';
export type PositionScenario = 'browser' | 'accepted' | 'denied' | 'timeout' | 'outside';

export const GEOLOCATION = new InjectionToken<(scenario: PositionScenario) => Observable<PositionResult>>(
  'Géolocalisation', {
    providedIn: 'root',
    factory: () => {
      const document = inject(DOCUMENT);
      return (scenario) => {
        if (scenario !== 'browser') {
          const results = {
            accepted: { latitude: 36.880, longitude: 10.324 },
            denied: 'denied',
            timeout: 'timeout',
            outside: { latitude: 0, longitude: 0 },
          } as const;
          return timer(1_200).pipe(map(() => results[scenario]));
        }
        return new Observable((subscriber) => {
          const geolocation = document.defaultView?.navigator.geolocation;
          if (!geolocation) {
            subscriber.next('unavailable');
            subscriber.complete();
            return;
          }
          const finish = (result: PositionResult) => {
            subscriber.next(result);
            subscriber.complete();
          };
          // Le délai du navigateur peut exclure le temps passé dans la demande d’autorisation.
          const timeout = setTimeout(() => finish('timeout'), 10_000);
          geolocation.getCurrentPosition(
            ({ coords }) => finish(coords),
            (error) => finish(error.code === 1 ? 'denied' : error.code === 3 ? 'timeout' : 'unavailable'),
            { timeout: 10_000, maximumAge: 0 },
          );
          return () => clearTimeout(timeout);
        });
      };
    },
  },
);
