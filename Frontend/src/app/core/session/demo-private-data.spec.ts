import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { DEMO_CONFIG, LOCAL_DEMO_CONFIG } from '../config/demo-config';
import { DemoPrivateData } from './demo-private-data';
import { MockSessionProvider } from './session-provider';

describe('Accès aux données privées simulées', () => {
  let profiles: MockSessionProvider;
  let data: DemoPrivateData;

  beforeEach(() => {
    sessionStorage.removeItem('skycast.demo.profile');
    TestBed.configureTestingModule({
      providers: [{ provide: DEMO_CONFIG, useValue: { ...LOCAL_DEMO_CONFIG, responseDelayMs: 5 } }],
    });
    profiles = TestBed.inject(MockSessionProvider);
    data = TestBed.inject(DemoPrivateData);
  });

  afterEach(() => sessionStorage.removeItem('skycast.demo.profile'));

  it('renvoie 401 à un visiteur sur les opérations personnelles et administratives', async () => {
    await expect(firstValueFrom(data.list('alerts'))).rejects.toMatchObject({ status: 401 });
    await expect(firstValueFrom(data.listAccounts())).rejects.toMatchObject({ status: 401 });
  });

  it('isole les deux comptes utilisateur et refuse la lecture d’un objet appartenant à l’autre', async () => {
    profiles.select('amel');
    await expect(firstValueFrom(data.list('alerts'))).resolves.toEqual([{ id: 'alert-wind', title: 'Vent fort à Tunis' }]);
    await expect(firstValueFrom(data.read('alert-rain'))).rejects.toMatchObject({ status: 403 });
    await expect(firstValueFrom(data.listAccounts())).rejects.toMatchObject({ status: 403 });

    profiles.select('karim');
    await expect(firstValueFrom(data.read('alert-rain'))).resolves.toEqual({ id: 'alert-rain', title: 'Pluie à Sousse' });
    await expect(firstValueFrom(data.read('alert-wind'))).rejects.toMatchObject({ status: 403 });
  });

  it('réserve la liste des comptes à l’administrateur et les alertes au profil utilisateur', async () => {
    profiles.select('admin');
    await expect(firstValueFrom(data.listAccounts())).resolves.toHaveLength(2);
    await expect(firstValueFrom(data.list('alerts'))).rejects.toMatchObject({ status: 403 });
    await expect(firstValueFrom(data.read('alert-wind'))).rejects.toMatchObject({ status: 403 });
  });

  it('annule une lecture en cours lors du changement de compte', async () => {
    profiles.select('amel');
    const pending = firstValueFrom(data.list('favorites'), { defaultValue: null });
    profiles.select('karim');

    await expect(pending).resolves.toBeNull();
    await expect(firstValueFrom(data.list('favorites'))).resolves.toEqual([{ id: 'favorite-sousse', title: 'Sousse' }]);
  });
});
