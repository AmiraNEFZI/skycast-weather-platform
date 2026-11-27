import { Component, computed, inject, input, signal } from '@angular/core';
import { map, switchMap, takeUntil } from 'rxjs';
import { SESSION } from '../../core/session/session-provider';
import { CityDate } from '../../shared/data/local-time';
import { remoteContent } from '../../shared/data/remote-content';
import { ContentState } from '../../shared/ui/content-state';
import { FormAction, formValues } from '../../shared/ui/form-action';
import { Modal } from '../../shared/ui/modal';
import { City } from '../locations/location';
import { Review, ReviewSort, WEATHER } from './data/weather';
import { ReviewEdits } from './data/review-edits';

@Component({
  selector: 'app-weather-reviews',
  imports: [CityDate, ContentState, Modal],
  template: `
    <section class="card">
      <div class="heading-row">
        <h2>Avis sur {{ city().name }}</h2>
        <label>Trier les avis
          <select #order class="field" [value]="sort()" (change)="changeSort(order.value)">
            <option value="recent">Les plus récents</option>
            <option value="rating">Les mieux notés</option>
          </select>
        </label>
      </div>
      @if (session().role === 'user') {
        <button #publish type="button" class="button" [disabled]="write.busy()" (click)="open(editor, publish)">Donner mon avis</button>
      }
      @if (write.done()) { <p role="status">Avis mis à jour.</p> }
      @let state = reviews.state();
      <app-content-state [status]="state.status" emptyMessage="Aucun avis pour cette ville."
        errorMessage="Les avis sont indisponibles." (retry)="reviews.retry()">
        @if (state.value; as result) {
          <ul>
            @for (review of result.items; track review.id) {
              <li>
                <div class="heading-row">
                  <strong>{{ review.author }}</strong>
                  <span class="badge">{{ review.score }} / 5</span>
                </div>
                <time class="muted" [attr.datetime]="review.date">{{ review.date | cityDate:city().timezone }}</time>
                <p>{{ review.comment }}</p>
                @if (review.reply) {
                  <div class="reply"><strong>Réponse de l’administration</strong><p>{{ review.reply }}</p></div>
                }
                @if (canEdit(review)) {
                  <div class="form-buttons">
                    <button #edit type="button" class="button button-secondary" [disabled]="write.busy()" (click)="open(editor, edit, review)">Modifier</button>
                    <button type="button" class="button button-secondary" [disabled]="write.busy()"
                      (click)="remove(review.id)">Supprimer</button>
                  </div>
                }
              </li>
            }
          </ul>
          @if (result.total > pageSize) {
            <div class="heading-row" aria-label="Pagination des avis">
              <button type="button" class="button button-secondary" [disabled]="currentPage() === 0"
                (click)="goTo(currentPage() - 1)">Précédente</button>
              <span>Page {{ currentPage() + 1 }} / {{ pageCount(result.total) }}</span>
              <button type="button" class="button button-secondary" [disabled]="currentPage() + 1 >= pageCount(result.total)"
                (click)="goTo(currentPage() + 1)">Suivante</button>
            </div>
          }
        }
      </app-content-state>
      @if (write.error() && !editing()) { <p class="error-text" role="alert">{{ write.error() }}</p> }
      <app-modal #editor label="Avis météo" (closed)="editing.set(undefined)">
        @if (editing(); as draft) {
          <form class="profile-form" (submit)="save($event, editor, draft.review?.id)">
            <label>Note sur 5 <input class="field" name="score" type="number" min="1" max="5" required [value]="draft.review?.score ?? 5" /></label>
            <label>Commentaire <textarea class="field" name="comment" maxlength="500" required [value]="draft.review?.comment ?? ''"></textarea></label>
            @if (write.error()) { <p class="error-text" role="alert">{{ write.error() }}</p> }
            <button type="submit" class="button" [disabled]="write.busy()">Enregistrer l’avis</button>
          </form>
        }
      </app-modal>
    </section>
  `,
  styles: `
    label { display: flex; flex-wrap: wrap; align-items: center; gap: .4rem; font-size: .875rem; }
    ul { padding: 0; list-style: none; }
    li { border-block-end: 1px solid var(--line); padding-block: .65rem; }
    li p { margin-block: .25rem 0; }
    time { font-size: .875rem; }
    .reply { border-inline-start: 3px solid var(--accent); padding: .4rem .6rem; margin-block-start: .55rem; background: var(--background); font-size: .9rem; }
  `,
})
export class WeatherReviews {
  readonly city = input.required<City>();
  private readonly port = inject(WEATHER);
  private readonly changes = inject(ReviewEdits);
  private readonly identity = inject(SESSION);
  readonly session = this.identity.current;
  protected readonly write = new FormAction();
  protected readonly editing = signal<{ review?: Review } | undefined>(undefined);
  private readonly page = signal<{ cityId: string; index: number } | undefined>(undefined);
  protected readonly pageSize = 2;
  protected readonly sort = signal<ReviewSort>('recent');
  protected readonly currentPage = computed(() => {
    const page = this.page();
    return page?.cityId === this.city().id ? page.index : 0;
  });
  private readonly query = computed(() => ({
    cityId: this.city().id, page: this.currentPage(), sort: this.sort(), rows: this.changes.rows(),
  }));
  protected readonly reviews = remoteContent(this.query, ({ cityId, page, sort }) =>
    this.port.feedback(cityId, page, this.pageSize, sort).pipe(
      map((result) => result.items.length ? result : null),
    ),
  );

  protected changeSort(value: string): void {
    this.sort.set(value === 'rating' ? 'rating' : 'recent');
    this.goTo(0);
  }

  protected goTo(index: number): void {
    this.page.set({ cityId: this.city().id, index });
  }

  protected pageCount(total: number): number {
    return Math.ceil(total / this.pageSize);
  }

  protected canEdit(review: Review): boolean {
    const account = this.session();
    return account.role === 'user' && account.accountId === review.owner;
  }

  protected open(modal: Modal, trigger: HTMLElement, review?: Review): void {
    this.write.error.set('');
    this.editing.set({ review });
    modal.show(trigger);
  }

  protected save(event: SubmitEvent, editor: Modal, id?: string): void {
    const form = formValues(event);
    const city = this.city();
    this.write.run(this.port.current(city.id).pipe(switchMap((observation) =>
      this.changes.save(city, Number(form.get('score')), String(form.get('comment') ?? ''), observation?.observedAt ?? '', id)),
      takeUntil(this.identity.changes)),
    () => { this.goTo(0); this.editing.set(undefined); editor.close(); });
  }

  protected remove(id: string): void {
    if (window.confirm('Supprimer votre avis ?')) this.write.run(this.changes.remove(id), () => this.goTo(0));
  }
}
