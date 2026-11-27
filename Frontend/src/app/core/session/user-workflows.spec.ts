import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { AlertsData } from '../../features/alerts/data/alerts';
import { PreferencesData } from '../../features/favorites/data/preferences';
import { ActivitiesData } from '../../features/forecasts/activities/activities';
import { City } from '../../features/locations/location';
import { ReviewEdits } from '../../features/weather/data/review-edits';
import { DEMO_NOW } from '../config/demo-clock';
import { DEMO_CONFIG, LOCAL_DEMO_CONFIG } from '../config/demo-config';
import { MockSessionProvider } from './session-provider';

const tunis: City = { id: '1', name: 'Tunis', country: 'Tunisie', latitude: 36.8, longitude: 10.18, timezone: 'Africa/Tunis' };
const now = new Date('2026-11-27T00:00:00Z');
const storageKeys = ['profile', 'favorites', 'preferences', 'activities', 'rules', 'subscriptions', 'notifications', 'reviews'];

function clearDemoStorage(): void {
  for (const key of storageKeys) sessionStorage.removeItem('skycast.demo.' + key);
}

describe('Parcours utilisateur simulés', () => {
  beforeEach(() => {
    clearDemoStorage();
    TestBed.configureTestingModule({ providers: [
      { provide: DEMO_CONFIG, useValue: { ...LOCAL_DEMO_CONFIG, responseDelayMs: 2 } },
      { provide: DEMO_NOW, useValue: now },
    ] });
    TestBed.inject(MockSessionProvider).select('amel');
  });

  afterEach(clearDemoStorage);

  it('conserve un favori par défaut unique, gère l’ordre et isole les comptes', async () => {
    const data = TestBed.inject(PreferencesData);
    await firstValueFrom(data.add('9', 'Paris', 'Voyage'));
    const paris = (await firstValueFrom(data.list()))[1];
    await firstValueFrom(data.move(paris.id, -1));
    await firstValueFrom(data.setDefault(paris.id));
    expect((await firstValueFrom(data.list())).map((row) => [row.cityId, row.isDefault])).toEqual([['9', true], ['1', false]]);
    TestBed.inject(MockSessionProvider).select('karim');
    await expect(firstValueFrom(data.remove(paris.id))).rejects.toMatchObject({ status: 403 });
    expect(data.defaultCity()).toBe('2');
  });

  it('refuse le doublon quotidien et interdit à un autre compte la modification d’un avis', async () => {
    const edits = TestBed.inject(ReviewEdits);
    await firstValueFrom(edits.save(tunis, 4, 'Beau temps', now.toISOString()));
    await expect(firstValueFrom(edits.save(tunis, 5, 'Doublon', now.toISOString()))).rejects.toMatchObject({ status: 409 });
    const id = edits.rows()[0].id;
    await firstValueFrom(edits.save(tunis, 3, 'Avis corrigé', now.toISOString(), id));
    TestBed.inject(MockSessionProvider).select('karim');
    await expect(firstValueFrom(edits.remove(id))).rejects.toMatchObject({ status: 403 });
    expect(edits.rows()[0].comment).toBe('Avis corrigé');
  });

  it('limite à dix les activités à venir et permet de supprimer une activité passée', async () => {
    const data = TestBed.inject(ActivitiesData);
    await firstValueFrom(data.remove('activity-demo'));
    for (let index = 0; index < 9; index++) {
      await firstValueFrom(data.save(tunis, '2026-11-30', 'Course', 'Sortie ' + index, ''));
    }
    await expect(firstValueFrom(data.save(tunis, '2026-11-30', 'Course', 'Onzième', ''))).rejects.toMatchObject({ status: 429 });
    expect(await firstValueFrom(data.list())).toHaveLength(10);
  });

  it('conserve le premier canal en cas d’échec du second et met à jour totalNonLues', async () => {
    const data = TestBed.inject(AlertsData);
    const rule = await firstValueFrom(data.save(tunis, { measure: 'VENT', operator: 'GT', threshold: 40, source: 'PREVISION' }));
    await firstValueFrom(data.subscribe(rule.id, 'APPLICATION'));
    await expect(firstValueFrom(data.subscribe(rule.id, 'COURRIEL'))).rejects.toMatchObject({ status: 503 });
    await firstValueFrom(data.subscribe(rule.id, 'COURRIEL'));
    expect((await firstValueFrom(data.ruleList())).filter((row) => row.id === rule.id)).toHaveLength(1);
    expect((await firstValueFrom(data.subscriptionList())).filter((row) => row.ruleId === rule.id).map((row) => row.channel))
      .toEqual(['APPLICATION', 'COURRIEL']);
    expect((await firstValueFrom(data.notificationList())).totalNonLues).toBe(1);
    await firstValueFrom(data.markRead('notice-heat'));
    expect((await firstValueFrom(data.notificationList())).totalNonLues).toBe(0);
  });
});
