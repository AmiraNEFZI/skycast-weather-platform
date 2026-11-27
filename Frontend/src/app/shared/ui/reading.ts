import { inject, Pipe, PipeTransform } from '@angular/core';
import { PreferencesData } from '../../features/favorites/data/preferences';

type ReadingUnit = '°C' | '°F' | 'km/h' | '%' | 'µg/m³' | '';
const decimal = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });

@Pipe({ name: 'reading', pure: false })
export class Reading implements PipeTransform {
  private readonly preferences = inject(PreferencesData);
  transform(value: number | null, unit: ReadingUnit = ''): string {
    if (value === null) return 'Indisponible';
    const prefs = this.preferences.current();
    if (unit === '°C' && prefs?.temperature === 'F') return decimal.format(toFahrenheit(value)) + '\u00a0°F';
    if (unit === 'km/h' && prefs?.wind === 'ms') return decimal.format(value / 3.6) + '\u00a0m/s';
    if (unit === 'km/h' && prefs?.wind === 'mph') return decimal.format(value / 1.609344) + '\u00a0mph';
    return unit ? decimal.format(value) + '\u00a0' + unit : decimal.format(value);
  }
}

export function toFahrenheit(value: number): number { return value * 1.8 + 32; }
