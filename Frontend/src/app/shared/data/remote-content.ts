import { computed, Signal, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, Observable, of, startWith, switchMap } from 'rxjs';

type RemoteState<T> =
  | { status: 'loading' | 'empty' | 'error'; value?: undefined }
  | { status: 'success'; value: T };

export function remoteContent<K, T>(key: Signal<K>, load: (key: K) => Observable<T | null>) {
  const version = signal(0);
  const request = computed(() => ({ key: key(), version: version() }));
  const loading: RemoteState<T> = { status: 'loading' };
  const response = toSignal(toObservable(request).pipe(
    switchMap((query) => load(query.key).pipe(
      map((value): RemoteState<T> => value === null ? { status: 'empty' } : { status: 'success', value }),
      catchError(() => of<RemoteState<T>>({ status: 'error' })),
      startWith(loading),
      map((state) => ({ query, state })),
    )),
  ));

  return {
    state: computed(() => {
      const current = response();
      return current?.query === request() ? current.state : loading;
    }),
    retry: () => version.update((current) => current + 1),
  };
}
