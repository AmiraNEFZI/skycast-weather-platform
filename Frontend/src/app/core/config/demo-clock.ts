import { InjectionToken } from '@angular/core';

const reference = '2026-11-27T14:30:00Z';

export const DEMO_NOW = new InjectionToken<Date>('Heure de référence de la démo', {
  providedIn: 'root',
  factory: () => new Date(reference),
});

export function localCalendarTime(instant: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}
