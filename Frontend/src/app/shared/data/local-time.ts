import { Pipe, PipeTransform } from '@angular/core';

type DateLabel = 'day' | 'hour' | 'short' | 'full';

const formats: Record<DateLabel, Intl.DateTimeFormatOptions> = {
  day: { weekday: 'short', day: 'numeric', month: 'short' },
  hour: { hour: '2-digit', minute: '2-digit' },
  short: { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' },
  full: { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' },
};
const localDate = /^\d{4}-\d{2}-\d{2}$/;
const localDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/;

export function dateLabel(value: string, zone: string, format: DateLabel): string {
  // A local forecast is already expressed in the city's civil time. Format its calendar fields as given.
  const wallTime = localDate.test(value) || localDateTime.test(value);
  const instant = new Date(localDateTime.test(value) ? value + 'Z' : value);
  return new Intl.DateTimeFormat('fr-FR', {
    ...formats[format], timeZone: wallTime ? 'UTC' : zone,
  }).format(instant);
}

@Pipe({ name: 'cityDate' })
export class CityDate implements PipeTransform {
  transform(value: string, zone: string, format: DateLabel = 'full'): string {
    return dateLabel(value, zone, format);
  }
}
