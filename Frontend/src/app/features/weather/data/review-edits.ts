import { inject, Injectable } from '@angular/core';
import { DEMO_NOW, localCalendarTime } from '../../../core/config/demo-clock';
import { SESSION } from '../../../core/session/session-provider';
import { demoRecords } from '../../../core/demo/demo-records';
import { DemoConflict, owned, UserMock } from '../../../core/session/user-mock';
import { City } from '../../locations/location';
import type { Review } from './weather';

interface SavedReview extends Review { owner: string; cityId: string; observationAt: string }

@Injectable({ providedIn: 'root' })
export class ReviewEdits {
  private readonly mock = inject(UserMock);
  private readonly clock = inject(DEMO_NOW);
  private readonly session = inject(SESSION);
  private readonly store = demoRecords<SavedReview>('reviews', []);
  readonly rows = this.store.rows;

  save(city: City, score: number, comment: string, observationAt: string, id?: string) {
    return this.mock.run((owner) => {
      const text = comment.trim();
      if (!Number.isInteger(score) || score < 1 || score > 5 || !text || text.length > 500) {
        throw new DemoConflict(422, 'Saisissez une note de 1 à 5 et un commentaire de 1 à 500 caractères.');
      }
      const rows = this.rows();
      if (id) {
        const existing = owned(rows, id, owner);
        if (existing.cityId !== city.id) throw new DemoConflict(422, 'Cet avis concerne une autre ville.');
        this.store.set(rows.map((row) => row === existing ? { ...row, score, comment: text } : row));
        return;
      }
      const date = this.clock.toISOString();
      const day = (instant: string) => localCalendarTime(new Date(instant), city.timezone).slice(0, 10);
      if (rows.some((row) => row.owner === owner && row.cityId === city.id && day(row.date) === day(date))) {
        throw new DemoConflict(409, 'Vous avez déjà publié un avis pour cette ville aujourd’hui.');
      }
      const session = this.session.current();
      this.store.set([...rows, {
        id: crypto.randomUUID(), owner, cityId: city.id, author: session.role === 'user' ? session.name : '',
        score, comment: text, date, observationAt,
      }]);
    });
  }

  remove(id: string) {
    return this.mock.run((owner) => {
      const rows = this.rows();
      const existing = owned(rows, id, owner);
      this.store.set(rows.filter((row) => row !== existing));
    });
  }
}
