import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { DEMO_NOW } from '../config/demo-clock';
import { DEMO_CONFIG, LOCAL_DEMO_CONFIG } from '../config/demo-config';
import { MockSessionProvider } from '../session/session-provider';
import { UserMock } from '../session/user-mock';
import { demoRecords } from './demo-records';
import { DemoStorage } from './demo-storage';

describe('Remise à zéro de la démonstration', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [{ provide: DEMO_CONFIG, useValue: LOCAL_DEMO_CONFIG }] });
  });

  afterEach(() => sessionStorage.clear());

  it('efface uniquement les clés SkyCast de démo et empêche une écriture après le début du reset', () => {
    const store = TestBed.inject(DemoStorage);
    const records = TestBed.runInInjectionContext(() => demoRecords('example', ['Tunis']));
    records.set(['Paris']);
    store.set('theme', 'dark');
    TestBed.inject(MockSessionProvider).select('amel');
    sessionStorage.setItem('application-tierce', 'preserve');

    store.beginReset();
    records.set(['Sousse']);
    expect(records.rows()).toEqual(['Paris']);
    expect(store.get('example')).toBeNull();
    expect(store.get('theme')).toBeNull();
    expect(store.get('profile')).toBeNull();
    expect(sessionStorage.getItem('application-tierce')).toBe('preserve');
    expect(TestBed.runInInjectionContext(() => demoRecords('example', ['Tunis'])).rows()).toEqual(['Tunis']);
    expect(store.get('reset-notice')).toBe('1');
  });

  it('annule les requêtes privées en cours et empêche les suivantes avant le rechargement', async () => {
    const store = TestBed.inject(DemoStorage);
    const api = TestBed.inject(UserMock);
    TestBed.inject(MockSessionProvider).select('amel');
    const write = vi.fn(() => 'écrit');
    const pending = firstValueFrom(api.run(write), { defaultValue: 'annulé' });

    store.beginReset();

    expect(await pending).toBe('annulé');
    expect(await firstValueFrom(api.run(write), { defaultValue: 'annulé' })).toBe('annulé');
    expect(write).not.toHaveBeenCalled();
  });

  it('utilise une date de référence stable pour les simulations', () => {
    expect(TestBed.inject(DEMO_NOW).toISOString()).toBe('2026-11-27T14:30:00.000Z');
  });
});
