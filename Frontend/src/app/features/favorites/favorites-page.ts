import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { SESSION } from '../../core/session/session-provider';
import { remoteContent } from '../../shared/data/remote-content';
import { ContentState } from '../../shared/ui/content-state';
import { FormAction, formValues } from '../../shared/ui/form-action';
import { Modal } from '../../shared/ui/modal';
import { ActiveCityStore } from '../locations/data/active-city-store';
import { CITY_CATALOG } from '../locations/data/city-catalog';
import { defaults, Favorite, Preferences, PreferencesData } from './data/preferences';

@Component({
  selector: 'app-favorites-panel',
  imports: [ContentState, Modal],
  template: `
    <h1 class="page-title">Favoris et préférences</h1>
    <div class="chart-grid account-layout">
      <section class="card section-stack">
        <div class="heading-row">
          <h2>Mes favoris</h2>
          <button #addButton type="button" class="button" [disabled]="write.busy() || !cities().length"
            (click)="open(editor, addButton)">Ajouter un favori</button>
        </div>
        @let result = favorites.state();
        <app-content-state [status]="result.status" emptyMessage="Vous n’avez aucun favori." (retry)="favorites.retry()">
          @for (item of result.value; track item.id; let index = $index; let last = $last) {
            <article class="favorite-row">
              <div class="favorite-name">
                <button type="button" class="city-link" (click)="active.select(item.cityId)">{{ item.cityName }}</button>
                @if (item.isDefault) { <span class="badge">Par défaut</span> }
                @if (item.alias) { <span class="alias muted">{{ item.alias }}</span> }
              </div>
              <div class="form-buttons favorite-actions">
                @if (!item.isDefault) {
                  <button type="button" class="button button-secondary" [disabled]="write.busy()"
                    (click)="write.run(data.setDefault(item.id))">Définir par défaut</button>
                }
                <button #editButton type="button" class="button button-secondary" [disabled]="write.busy()"
                  (click)="open(editor, editButton, item)">Modifier l’alias</button>
                <button type="button" class="button button-secondary" [disabled]="write.busy() || index === 0"
                  [attr.aria-label]="'Monter ' + item.cityName" title="Monter"
                  (click)="write.run(data.move(item.id, -1))">↑</button>
                <button type="button" class="button button-secondary" [disabled]="write.busy() || last"
                  [attr.aria-label]="'Descendre ' + item.cityName" title="Descendre"
                  (click)="write.run(data.move(item.id, 1))">↓</button>
                <button type="button" class="button button-secondary remove" [disabled]="write.busy()"
                  (click)="remove(item.id, item.cityName)">Supprimer</button>
              </div>
            </article>
          }
        </app-content-state>
        @if (write.error()) { <p class="error-text" role="alert">{{ write.error() }}</p> }
        @if (write.done()) { <p role="status">Favoris mis à jour.</p> }
      </section>
      <section class="card section-stack">
        <h2>Préférences</h2>
        @for (prefs of [current()]; track prefs) {
          <form class="profile-form" (submit)="save($event)">
            <fieldset class="unit-field">
              <legend>Température</legend>
              <div class="segments">
                <label><input class="visually-hidden" type="radio" name="temperature" value="C" [attr.checked]="prefs.temperature === 'C' ? '' : null" /><span>Celsius (°C)</span></label>
                <label><input class="visually-hidden" type="radio" name="temperature" value="F" [attr.checked]="prefs.temperature === 'F' ? '' : null" /><span>Fahrenheit (°F)</span></label>
              </div>
            </fieldset>
            <fieldset class="unit-field">
              <legend>Vent</legend>
              <div class="segments">
                <label><input class="visually-hidden" type="radio" name="wind" value="kmh" [attr.checked]="prefs.wind === 'kmh' ? '' : null" /><span>km/h</span></label>
                <label><input class="visually-hidden" type="radio" name="wind" value="ms" [attr.checked]="prefs.wind === 'ms' ? '' : null" /><span>m/s</span></label>
                <label><input class="visually-hidden" type="radio" name="wind" value="mph" [attr.checked]="prefs.wind === 'mph' ? '' : null" /><span>mph</span></label>
              </div>
            </fieldset>
            <label>Langue <select name="language" class="field"><option value="fr">Français</option></select></label>
            <label>Thème <select name="theme" class="field" [value]="prefs.theme">
              <option value="light">Ciel Clair</option><option value="dark">Horizon</option>
            </select></label>
            <div class="form-buttons">
              <button type="submit" class="button" [disabled]="settings.busy()">Enregistrer les préférences</button>
              <button type="button" class="button button-secondary" [disabled]="settings.busy()"
                (click)="reset($event)">Réinitialiser</button>
            </div>
          </form>
        }
        @if (settings.error()) { <p class="error-text" role="alert">{{ settings.error() }}</p> }
        @if (settings.done()) { <p role="status">Préférences mises à jour.</p> }
      </section>
    </div>
    <app-modal #editor [label]="draft()?.favorite ? 'Modifier l’alias' : 'Ajouter un favori'" closeLabel="Annuler"
      (closed)="draft.set(undefined)">
      @if (draft(); as state) {
        <form class="profile-form" (submit)="saveFavorite($event, editor, state.favorite?.id)">
          @if (state.favorite; as favorite) {
            <p>{{ favorite.cityName }}</p>
          } @else {
            <label>Ville <select name="city" class="field" required>
              @for (city of cities(); track city.id) { <option [value]="city.id">{{ city.name }}</option> }
            </select></label>
          }
          <label>Alias <input name="alias" class="field" maxlength="40" [value]="state.favorite?.alias ?? ''" /></label>
          @if (write.error()) { <p class="error-text" role="alert">{{ write.error() }}</p> }
          <button type="submit" class="button" [disabled]="write.busy()">Enregistrer</button>
        </form>
      }
    </app-modal>
  `,
  styles: `
    .account-layout { grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); }
    .favorite-row { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .7rem; padding: .7rem; background: var(--background); border: 1px solid var(--line); border-radius: .7rem; }
    .favorite-row + .favorite-row { margin-top: .55rem; }
    .favorite-name { display: flex; flex-wrap: wrap; align-items: center; gap: .25rem .55rem; min-width: 0; }
    .city-link { border: 0; padding: 0; background: transparent; color: var(--accent-text); font-weight: 750; text-decoration: underline; cursor: pointer; text-align: start; }
    .alias { flex-basis: 100%; overflow-wrap: anywhere; font-size: .875rem; }
    .favorite-actions .button { padding: .4rem .55rem; font-size: .875rem; }
    .favorite-actions .remove:not(:disabled) { color: var(--danger); }
    .unit-field { min-width: 0; padding: 0; margin: 0; border: 0; }
    .unit-field legend { margin-bottom: .25rem; }
    .segments { display: flex; border: 1px solid var(--line); border-radius: .6rem; }
    .segments label { flex: 1; position: relative; cursor: pointer; text-align: center; }
    .segments label + label { border-inline-start: 1px solid var(--line); }
    .segments span { padding: .5rem .3rem; font-size: .875rem; }
    .segments input:checked + span { background: var(--accent); color: var(--on-accent); font-weight: 650; }
    .segments input:focus-visible + span { outline: 3px solid var(--focus); outline-offset: -3px; }
    @media (max-width: 52rem) { .account-layout { grid-template-columns: 1fr; } }
  `,
})
export class FavoritesPanel {
  protected readonly data = inject(PreferencesData);
  protected readonly active = inject(ActiveCityStore);
  private readonly session = inject(SESSION);
  protected readonly cities = toSignal(inject(CITY_CATALOG).search(''), { initialValue: [] });
  protected readonly current = computed(() => this.data.current() ?? defaults);
  protected readonly write = new FormAction();
  protected readonly draft = signal<{ favorite?: Favorite } | undefined>(undefined);
  protected readonly settings = new FormAction();
  protected readonly favorites = remoteContent(computed(() => [this.session.current(), this.data.revision()]),
    () => this.data.list().pipe(map((rows) => rows.length ? rows : null)));

  protected open(modal: Modal, trigger: HTMLElement, favorite?: Favorite): void {
    this.write.error.set('');
    this.draft.set({ favorite });
    modal.show(trigger);
  }

  protected saveFavorite(event: SubmitEvent, modal: Modal, id?: string): void {
    const form = formValues(event);
    const alias = String(form.get('alias') ?? '');
    if (id) {
      this.write.run(this.data.rename(id, alias), () => modal.close());
      return;
    }
    const city = this.cities().find((item) => item.id === form.get('city'));
    if (city) this.write.run(this.data.add(city.id, city.name, alias), () => modal.close());
  }

  protected remove(id: string, name: string): void {
    if (window.confirm(`Retirer ${name} de vos favoris ?`)) this.write.run(this.data.remove(id));
  }

  protected save(event: SubmitEvent): void {
    const form = formValues(event);
    const wind = form.get('wind');
    const value: Preferences = {
      temperature: form.get('temperature') === 'F' ? 'F' : 'C',
      wind: wind === 'ms' || wind === 'mph' ? wind : 'kmh',
      language: 'fr', theme: form.get('theme') === 'dark' ? 'dark' : 'light',
    };
    this.settings.run(this.data.save(value));
  }

  protected reset(event: Event): void {
    const form = (event.target as HTMLElement).closest('form');
    this.settings.run(this.data.save(null), () => form?.reset());
  }
}

@Component({
  imports: [FavoritesPanel],
  template: `@if (session().role === 'user') {
    @for (account of [session()]; track account) { <app-favorites-panel /> }
  }`,
})
export class FavoritesPage {
  protected readonly session = inject(SESSION).current;
}
