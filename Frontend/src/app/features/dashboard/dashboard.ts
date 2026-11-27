import { Component, computed, inject, viewChild } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, of } from 'rxjs';
import { DemoStorage } from '../../core/demo/demo-storage';
import { SESSION } from '../../core/session/session-provider';
import { ContentState } from '../../shared/ui/content-state';
import { remoteContent } from '../../shared/data/remote-content';
import { AirSummary } from '../air-quality/air-summary';
import { AlertsData } from '../alerts/data/alerts';
import { PreferencesData } from '../favorites/data/preferences';
import { SevenDays } from '../forecasts/seven-days';
import { ActiveCityStore } from '../locations/data/active-city-store';
import { PositionAction } from '../locations/position-action';
import { WeatherCard } from '../weather/weather-card';
import { WeatherReviews } from '../weather/weather-reviews';
import { WeatherShowcase } from '../weather/weather-showcase';

@Component({
  imports: [AirSummary, ContentState, PositionAction, RouterLink, SevenDays, WeatherCard, WeatherReviews, WeatherShowcase],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  protected readonly airSummary = viewChild(AirSummary);
  protected readonly resetNotice = inject(DemoStorage).takeResetNotice();
  protected readonly showAirFailure = toSignal(
    inject(ActivatedRoute).queryParamMap.pipe(map((params) => params.get('scenario') === 'panne-air-uv')),
    { initialValue: false },
  );
  protected readonly activeCity = inject(ActiveCityStore);
  protected readonly session = inject(SESSION).current;
  private readonly preferences = inject(PreferencesData);
  private readonly alerts = inject(AlertsData);
  protected readonly favorites = remoteContent(computed(() => ({ account: this.session(), revision: this.preferences.revision() })),
    ({ account }) => account.role === 'user' ? this.preferences.list() : of(null));
  protected readonly notices = remoteContent(computed(() => ({ account: this.session(), revision: this.alerts.revision() })),
    ({ account }) => account.role === 'user' ? this.alerts.notificationList() : of(null));
}
