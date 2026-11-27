import { inject, Injectable } from '@angular/core';
import { DEMO_NOW, localCalendarTime } from '../../../core/config/demo-clock';
import { demoRecords } from '../../../core/demo/demo-records';
import { demoAccounts, demoCities } from '../../../core/demo/demo-fixtures';
import { DemoConflict, owned, UserMock } from '../../../core/session/user-mock';
import { City } from '../../locations/location';

export const activityTypes = ['Randonnée', 'Course', 'Vélo', 'Pique-nique'] as const;
export interface Activity {
  id: string; owner: string; cityId: string; cityName: string; date: string; timezone: string;
  type: string; title: string; comment: string; verdict: string;
}

@Injectable({ providedIn: 'root' })
export class ActivitiesData {
  private readonly mock = inject(UserMock);
  private readonly now = inject(DEMO_NOW);
  private readonly store = demoRecords<Activity>('activities', [
    { id: 'activity-demo', owner: demoAccounts.amel, cityId: demoCities.tunis, cityName: 'Tunis', date: '2025-01-01', timezone: 'Africa/Tunis',
      type: 'Course', title: 'Sortie du matin', comment: '', verdict: 'Favorable' },
    { id: 'activity-paris', owner: demoAccounts.amel, cityId: demoCities.paris, cityName: 'Paris',
      date: localCalendarTime(new Date(this.now.getTime() + 2 * 86_400_000), 'Europe/Paris').slice(0, 10),
      timezone: 'Europe/Paris', type: 'Vélo', title: 'Balade au parc', comment: '', verdict: 'Défavorable' },
  ]);
  readonly rows = this.store.rows;

  list() { return this.mock.run((owner) => this.rows().filter((row) => row.owner === owner)); }

  save(city: City, date: string, type: string, title: string, comment: string, id?: string) {
    return this.mock.run((owner) => {
      const rows = this.rows();
      if (id) owned(rows, id, owner);
      const text = title.trim();
      if (!text || text.length > 80 || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !activityTypes.some((item) => item === type)) {
        throw new DemoConflict(422, 'Saisissez un titre, une date et un type d’activité valides.');
      }
      const future = (day: string, zone: string) => day >= localCalendarTime(this.now, zone).slice(0, 10);
      if (future(date, city.timezone) && rows.filter((row) =>
        row.owner === owner && row.id !== id && future(row.date, row.timezone)).length >= 10) {
        throw new DemoConflict(429, 'Vous avez atteint la limite de dix activités à venir.');
      }
      const activity: Activity = {
        id: id ?? crypto.randomUUID(), owner, cityId: city.id, cityName: city.name,
        date, timezone: city.timezone, title: text, type, comment: comment.trim(),
        verdict: city.id === '9' ? 'Défavorable' : Number(date.slice(-2)) % 3 === 0 ? 'À surveiller' : 'Favorable',
      };
      this.store.set(id ? rows.map((row) => row.id === id ? activity : row) : [...rows, activity]);
    });
  }

  remove(id: string) {
    return this.mock.run((owner) => {
      const rows = this.rows();
      const item = owned(rows, id, owner);
      this.store.set(rows.filter((row) => row !== item));
    });
  }
}
