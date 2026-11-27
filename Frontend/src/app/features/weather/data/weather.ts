import { inject, InjectionToken } from '@angular/core';
import { forkJoin, map, Observable, of, timer } from 'rxjs';
import { DEMO_NOW } from '../../../core/config/demo-clock';
import { DEMO_CONFIG } from '../../../core/config/demo-config';
import { CITY_CATALOG } from '../../locations/data/city-catalog';
import { CityId } from '../../locations/location';
import { ReviewEdits } from './review-edits';
import { WeatherManaged } from './weather-managed';

const conditions = {
  ENSOLEILLE: { label: 'Ensoleillé', icon: '☀' },
  NUAGEUX: { label: 'Nuageux', icon: '☁' },
  PLUIE: { label: 'Pluie', icon: '☂' },
};
export type Condition = keyof typeof conditions;
export { conditions };

interface ObservationDto {
  locationId: string;
  temperature: number;
  humidity: number | null;
  windSpeed: number | null;
  condition: Condition;
  observedAt: string;
  stale: boolean;
}

export interface Observation {
  cityId: CityId;
  temperatureC: number;
  humidityPercent: number | null;
  windKmh: number | null;
  condition: Condition;
  observedAt: string;
  stale: boolean;
}

interface FeedbackDto {
  id: string;
  auteur: string;
  note: number;
  commentaire: string;
  date: string;
  reponse?: string;
}

export interface Review {
  id: string;
  author: string;
  score: number;
  comment: string;
  date: string;
  reply?: string;
  owner?: string;
}

export type ReviewSort = 'recent' | 'rating';
export interface ReviewPage {
  readonly items: readonly Review[];
  readonly total: number;
}
interface ShowcaseCity {
  readonly id: CityId;
  readonly label: string;
  readonly temperatureC: number | null;
  readonly condition: Condition | undefined;
}

interface WeatherPort {
  current(id: CityId): Observable<Observation | null>;
  showcase(): Observable<readonly ShowcaseCity[]>;
  feedback(id: CityId, page: number, size: number, sort: ReviewSort): Observable<ReviewPage>;
}

const currentWeather: Partial<Record<CityId, Pick<ObservationDto, 'temperature' | 'humidity' | 'windSpeed' | 'condition'>>> = {
  '1': { temperature: 22, humidity: 62, windSpeed: 14, condition: 'ENSOLEILLE' },
  '2': { temperature: 24, humidity: 69, windSpeed: null, condition: 'NUAGEUX' },
  '4': { temperature: 26, humidity: 55, windSpeed: 11, condition: 'ENSOLEILLE' },
  '5': { temperature: 23, humidity: 66, windSpeed: 18, condition: 'NUAGEUX' },
  '6': { temperature: 21, humidity: 64, windSpeed: 19, condition: 'ENSOLEILLE' },
  '8': { temperature: 22, humidity: 60, windSpeed: 12, condition: 'ENSOLEILLE' },
  '9': { temperature: 12, humidity: 82, windSpeed: 21, condition: 'PLUIE' },
};

const tunisReviews = [
  { auteur: 'Amel', note: 4, commentaire: 'Le vent s’est levé en fin de matinée.' },
  { auteur: 'Karim', note: 5, commentaire: 'Les éclaircies sont arrivées à temps pour ma sortie.', reponse: 'Merci pour ce retour depuis Tunis.' },
  { auteur: 'Nour', note: 3, commentaire: 'Un peu plus frais près du lac en matinée.' },
  { auteur: 'Sami', note: 4, commentaire: 'Le ciel était dégagé dans le centre.' },
  { auteur: 'Inès', note: 5, commentaire: 'Les températures correspondaient à mon relevé.' },
];

export const WEATHER = new InjectionToken<WeatherPort>('Données météo et avis', {
  providedIn: 'root',
  factory: () => {
    const delay = inject(DEMO_CONFIG).responseDelayMs;
    const now = inject(DEMO_NOW).getTime();
    const catalogue = inject(CITY_CATALOG);
    const edits = inject(ReviewEdits);
    const managed = inject(WeatherManaged);
    const lastObservation = (id: CityId): ObservationDto | null => {
      const data = currentWeather[id];
      if (!data) return null;
      const stale = id === '2';
      return { ...data, locationId: id, observedAt: new Date(now - (stale ? 6 : 0.25) * 3_600_000).toISOString(), stale };
    };
    return {
      current: (id) => timer(id === '1' ? delay : delay / 2).pipe(map(() => {
        const dto = lastObservation(id);
        return dto && {
          cityId: dto.locationId, temperatureC: dto.temperature, humidityPercent: dto.humidity,
          windKmh: dto.windSpeed, condition: dto.condition, observedAt: dto.observedAt, stale: dto.stale,
        };
      })),
      showcase: () => {
        const entries = managed.showcase.rows();
        if (!entries.length) return of([]);
        return forkJoin(entries.map((id) => catalogue.find(id).pipe(map((city) => {
          const observation = lastObservation(id);
          return city && {
            id, label: city.name, temperatureC: observation?.temperature ?? null, condition: observation?.condition,
          };
        })))).pipe(map((items) => items.filter((city) => city !== undefined)));
      },
      feedback: (id, page, size, sort) => timer(delay / 2).pipe(map(() => {
        const seed = id === '1' ? tunisReviews : id === '9'
          ? [{ auteur: 'Camille', note: 4, commentaire: 'Les averses ont commencé en début d’après-midi.' }]
          : [];
        const rows: FeedbackDto[] = seed.map((entry, index) => ({
          ...entry, id: `${id}-${index + 1}`, date: new Date(now - (index + 1) * 3_600_000).toISOString(),
        }));
        const reviews: Review[] = rows.map((entry) => ({
          id: entry.id, author: entry.auteur, score: entry.note, comment: entry.commentaire,
          date: entry.date, reply: entry.reponse,
        }));
        reviews.push(...edits.rows().filter((row) => row.cityId === id));
        const overrides = managed.replies.rows();
        for (const [index, review] of reviews.entries()) {
          const reply = overrides.find((item) => item.id === review.id);
          if (reply) reviews[index] = { ...review, reply: reply.text ?? undefined };
        }
        reviews.sort((a, b) => (sort === 'rating' ? b.score - a.score : 0) || b.date.localeCompare(a.date));
        return {
          items: reviews.slice(page * size, (page + 1) * size),
          total: reviews.length,
        };
      })),
    };
  },
});
