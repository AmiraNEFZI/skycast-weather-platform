import { inject, Injectable } from '@angular/core';
import { map, switchMap } from 'rxjs';
import { AdminMock } from '../../../core/session/admin-mock';
import { SessionAccessError } from '../../../core/session/private-access';
import { DemoConflict } from '../../../core/session/user-mock';
import { CatalogStore } from '../../locations/data/city-catalog';
import { WEATHER } from './weather';
import { WeatherManaged } from './weather-managed';

@Injectable({ providedIn: 'root' })
export class WeatherAdmin {
  private readonly admin = inject(AdminMock);
  private readonly managed = inject(WeatherManaged);
  private readonly catalog = inject(CatalogStore);
  private readonly weather = inject(WEATHER);

  reviews(cityId: string) {
    return this.admin.request(() => this.weather.feedback(cityId, 0, Number.MAX_SAFE_INTEGER, 'recent').pipe(map((page) => page.items)));
  }

  respond(cityId: string, id: string, text: string | null) {
    return this.admin.request(() => this.reviews(cityId).pipe(switchMap((rows) => this.admin.write(() => {
      if (!rows.some((row) => row.id === id)) throw new SessionAccessError(404);
      if (text !== null && (!text.trim() || text.length > 500)) throw new DemoConflict(422, 'Saisissez une réponse de 1 à 500 caractères.');
      this.managed.replies.set([...this.managed.replies.rows().filter((row) => row.id !== id), { id, text: text?.trim() ?? null }]);
    }))));
  }

  showcase() { return this.admin.read(() => this.managed.showcase.rows()); }

  add(id: string) {
    return this.admin.write(() => {
      const rows = this.managed.showcase.rows();
      if (!this.catalog.publicCities().some((city) => city.id === id)) throw new SessionAccessError(404);
      if (rows.includes(id)) throw new DemoConflict(409, 'Cette ville est déjà dans la vitrine.');
      if (rows.length >= 6) throw new DemoConflict(409, 'La vitrine accepte six villes au maximum.');
      this.managed.showcase.set([...rows, id]);
    });
  }

  move(id: string, distance: -1 | 1) {
    return this.admin.write(() => {
      const rows = [...this.managed.showcase.rows()];
      const from = rows.indexOf(id);
      const to = from + distance;
      if (from < 0 || to < 0 || to >= rows.length) return;
      [rows[from], rows[to]] = [rows[to], rows[from]];
      this.managed.showcase.set(rows);
    });
  }

  remove(id: string) { return this.admin.write(() => this.managed.showcase.set(this.managed.showcase.rows().filter((row) => row !== id))); }
}
