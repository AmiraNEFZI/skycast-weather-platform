import { Injectable } from '@angular/core';
import { demoRecords } from '../../../core/demo/demo-records';
import { demoCities } from '../../../core/demo/demo-fixtures';

@Injectable({ providedIn: 'root' })
export class WeatherManaged {
  readonly showcase = demoRecords<string>('showcase', [demoCities.tunis, demoCities.sousse, demoCities.paris, demoCities.monastir]);
  readonly replies = demoRecords<{ id: string; text: string | null }>('review-replies', []);
}
