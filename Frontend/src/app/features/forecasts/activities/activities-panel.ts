import { Component, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { CityDate } from '../../../shared/data/local-time';
import { remoteContent } from '../../../shared/data/remote-content';
import { ContentState } from '../../../shared/ui/content-state';
import { FormAction, formValues } from '../../../shared/ui/form-action';
import { Modal } from '../../../shared/ui/modal';
import { CITY_CATALOG } from '../../locations/data/city-catalog';
import { Activity, ActivitiesData, activityTypes } from './activities';

@Component({
  selector: 'app-activities-panel',
  imports: [CityDate, ContentState, Modal],
  template: `
    <aside class="card section-stack">
      <h2>Mes activités</h2>
      <button #add class="button" type="button" [disabled]="write.busy()" (click)="open(editor, add)">Planifier une activité</button>
      @if (write.done()) { <p role="status">Activités mises à jour.</p> }
      @let view = activities.state();
      <app-content-state [status]="view.status" emptyMessage="Vous n’avez aucune activité." (retry)="activities.retry()">
        @for (item of view.value; track item.id) {
          <div class="account-row">
            <strong>{{ item.title }}</strong>
            <span>{{ item.cityName }} · {{ item.date | cityDate:item.timezone:'day' }} · {{ item.type }}</span>
            @if (item.comment) { <span>{{ item.comment }}</span> }
            <span class="badge" [class.verdict-good]="item.verdict === 'Favorable'"
              [class.verdict-caution]="item.verdict === 'À surveiller'"
              [class.verdict-bad]="item.verdict === 'Défavorable'">{{ item.verdict }}</span>
            <div class="form-buttons">
              <button #edit class="button button-secondary" type="button" [disabled]="write.busy()" (click)="open(editor, edit, item)">Modifier</button>
              <button class="button button-secondary" type="button" [disabled]="write.busy()" (click)="remove(item)">Supprimer</button>
            </div>
          </div>
        }
      </app-content-state>
      @if (!editing() && write.error()) { <p class="error-text" role="alert">{{ write.error() }}</p> }
    </aside>
    <app-modal #editor label="Activité" (closed)="editing.set(undefined)">
      @if (editing(); as draft) {
        <form class="profile-form" (submit)="save($event, editor, draft.item?.id)">
          <label>Ville <select name="city" class="field" required>
            @for (city of cities(); track city.id) {
              <option [value]="city.id" [selected]="city.id === (draft.item?.cityId ?? cityId())">{{ city.name }}</option>
            }
          </select></label>
          <label>Date <input name="date" class="field" type="date" required [value]="draft.item?.date ?? ''" /></label>
          <label>Type <select name="type" class="field">
            @for (type of types; track type) { <option [value]="type" [selected]="type === draft.item?.type">{{ type }}</option> }
          </select></label>
          <label>Titre <input name="title" class="field" required maxlength="80" [value]="draft.item?.title ?? ''" /></label>
          <label>Commentaire <textarea name="comment" class="field" maxlength="500" [value]="draft.item?.comment ?? ''"></textarea></label>
          @if (write.error()) { <p class="error-text" role="alert">{{ write.error() }}</p> }
          <button type="submit" class="button" [disabled]="write.busy() || !cities().length">Enregistrer l’activité</button>
        </form>
      }
    </app-modal>
  `,
  styles: `
    .badge { justify-self: start; }
    .verdict-good { background: light-dark(#d9f3e5, #193e33); color: light-dark(#155437, #a6efc7); }
    .verdict-caution { background: light-dark(#fff0cc, #463514); color: light-dark(#704600, #ffe1a3); }
    .verdict-bad { background: light-dark(#fde3e6, #4c2634); color: var(--danger); }
  `,
})
export class ActivitiesPanel {
  readonly cityId = input.required<string>();
  private readonly data = inject(ActivitiesData);
  protected readonly cities = toSignal(inject(CITY_CATALOG).search(''), { initialValue: [] });
  protected readonly write = new FormAction();
  protected readonly editing = signal<{ item?: Activity } | undefined>(undefined);
  protected readonly types = activityTypes;
  protected readonly activities = remoteContent(this.data.rows, () => this.data.list().pipe(map((items) => items.length ? items : null)));

  protected open(modal: Modal, trigger: HTMLElement, item?: Activity): void {
    this.write.error.set('');
    this.editing.set({ item });
    modal.show(trigger);
  }

  protected save(event: SubmitEvent, modal: Modal, id?: string): void {
    const form = formValues(event);
    const city = this.cities().find((item) => item.id === form.get('city'));
    if (!city) return;
    this.write.run(this.data.save(city, String(form.get('date')), String(form.get('type')),
      String(form.get('title')), String(form.get('comment')), id), () => { this.editing.set(undefined); modal.close(); });
  }

  protected remove(item: Activity): void {
    if (window.confirm(`Supprimer l’activité « ${item.title} » ?`)) {
      this.editing.set(undefined);
      this.write.run(this.data.remove(item.id));
    }
  }
}
