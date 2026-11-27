import { Component, computed, inject, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { map, Observable } from 'rxjs';
import { AdminMock } from '../../core/session/admin-mock';
import { remoteContent } from '../../shared/data/remote-content';
import { ContentState } from '../../shared/ui/content-state';
import { FormAction } from '../../shared/ui/form-action';
import { Modal } from '../../shared/ui/modal';

export type Cell = string | number | boolean | null | undefined;
export interface AdminRow { id: string; cells: Record<string, Cell>; label?: string }
export interface AdminField {
  key: string; label: string; type?: 'text' | 'number' | 'date' | 'datetime-local' | 'textarea';
  choices?: readonly { value: string; label: string }[];
  initial?: Cell; optional?: boolean; step?: string; readonlyOnEdit?: boolean;
}
export interface AdminAction {
  label: string; run(row: AdminRow): Observable<unknown>;
  confirmation?: (row: AdminRow) => string;
  enabled?: (row: AdminRow) => boolean;
}
export interface AdminTableConfig {
  title: string; columns: readonly { key: string; label: string }[];
  load: () => Observable<readonly AdminRow[]>;
  fields?: readonly AdminField[];
  save?: (values: Record<string, string>, row?: AdminRow) => Observable<unknown>;
  createLabel?: string;
  editLabel?: string;
  actions?: readonly AdminAction[];
}

@Component({
  selector: 'app-admin-table',
  imports: [ContentState, Modal, ReactiveFormsModule],
  template: `
    <section class="card section-stack">
      <div class="heading-row">
        <h2>{{ config().title }}</h2>
        @if (config().createLabel; as label) {
          <button #add type="button" class="button" [disabled]="write.busy()" (click)="open(editor, add)">{{ label }}</button>
        }
      </div>
      @if (write.error() && !draft()) { <p role="alert" class="error-text">{{ write.error() }}</p> }
      @if (write.done()) { <p role="status">Modification enregistrée.</p> }
      @let result = rows.state();
      <app-content-state [status]="result.status" emptyMessage="Aucun élément pour ces filtres." (retry)="rows.retry()">
        @if (result.value; as items) {
          <p class="scroll-hint muted">Faites défiler le tableau pour voir toutes les données.</p>
          <div class="admin-scroll" role="region" [attr.aria-label]="config().title" tabindex="0">
            <table>
              <thead><tr>
                @for (column of config().columns; track column.key) { <th scope="col">{{ column.label }}</th> }
                @if (config().editLabel || config().actions?.length) { <th class="action-column" scope="col">Actions</th> }
              </tr></thead>
              <tbody>
                @for (row of items; track row.id) {
                  <tr>
                    @for (column of config().columns; track column.key) {
                      @let value = row.cells[column.key];
                      <td>
                        @if ((column.key === 'status' || column.key === 'source' || column.key === 'enabled') && value != null) {
                          <span class="badge" [class.badge-error]="value === 'Échec'"
                            [class.badge-success]="value === 'Réussie' || value === true">{{ display(value) }}</span>
                        } @else { {{ display(value) }} }
                      </td>
                    }
                    @if (config().editLabel || config().actions?.length) {
                      <td class="action-column"><div class="form-buttons">
                        @if (config().editLabel; as label) {
                          <button #edit type="button" class="button button-secondary" [disabled]="write.busy()" (click)="open(editor, edit, row)">{{ label }}</button>
                        }
                        @for (action of config().actions; track action.label) {
                          <button #actionButton type="button" class="button button-secondary" [class.destructive]="!!action.confirmation"
                            [disabled]="write.busy() || action.enabled?.(row) === false"
                            (click)="apply(action, row, confirmation, actionButton)">{{ action.label }}</button>
                        }
                      </div></td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </app-content-state>
    </section>
    <app-modal #editor [label]="draft()?.row ? config().editLabel ?? config().title : config().createLabel ?? config().title"
      (closed)="draft.set(undefined)">
      @if (draft(); as editing) {
        <form class="profile-form" [formGroup]="editing.form" (ngSubmit)="save(editor, editing.row)">
          @for (field of config().fields; track field.key) {
            <label>{{ field.label }}
              @if (field.choices) {
                <select class="field" [formControlName]="field.key">
                  <option value="">Choisir…</option>
                  @for (choice of field.choices; track choice.value) { <option [value]="choice.value">{{ choice.label }}</option> }
                </select>
              } @else if (field.type === 'textarea') {
                <textarea class="field" [formControlName]="field.key" maxlength="500"></textarea>
              } @else {
                <input class="field" [formControlName]="field.key" [type]="field.type ?? 'text'" [attr.step]="field.step ?? null" />
              }
            </label>
          }
          @if (write.error()) { <p role="alert" class="error-text">{{ write.error() }}</p> }
          <button type="submit" class="button" [disabled]="editing.form.invalid || write.busy()">Enregistrer</button>
        </form>
      }
    </app-modal>
    <app-modal #confirmation label="Confirmer l’action" closeLabel="Annuler" (closed)="pending.set(undefined)">
      @if (pending(); as request) {
        <p>{{ request.message }}</p>
        <button class="button" type="button" [disabled]="write.busy()"
          (click)="confirmation.close(); write.run(request.action.run(request.row))">Confirmer</button>
      }
    </app-modal>
  `,
  styles: `
    :host { display: block; min-width: 0; }
    app-content-state { display: block; min-width: 0; }
    .admin-scroll { overflow: auto; width: 100%; max-height: 32rem; }
    table { width: 100%; border-collapse: collapse; text-align: left; font-size: .9rem; }
    th, td { padding: .6rem .45rem; border-bottom: 1px solid var(--line); vertical-align: top; }
    td.action-column { min-width: 9rem; }
    td .button { white-space: nowrap; padding: .35rem .55rem; }
    th { background: var(--surface); position: sticky; top: 0; z-index: 1; }
    .badge-error, .destructive:not(:disabled) { color: var(--danger); }
    .badge-success { color: var(--text); background: color-mix(in srgb, #4faa7b 24%, var(--surface)); }
    .scroll-hint { display: none; }
    @media (max-width: 48rem) {
      .scroll-hint { display: block; margin: 0 0 .5rem; font-size: .85rem; }
      .action-column { position: sticky; right: 0; background: var(--surface); border-inline-start: 1px solid var(--line); }
      th.action-column { z-index: 2; }
      .action-column .button { white-space: normal; text-align: start; }
    }
  `,
})
export class AdminTable {
  readonly config = input.required<AdminTableConfig>();
  private readonly admin = inject(AdminMock);
  protected readonly write = new FormAction();
  protected readonly pending = signal<{ action: AdminAction; row: AdminRow; message: string } | undefined>(undefined);
  protected readonly draft = signal<{ row?: AdminRow; form: FormGroup<Record<string, FormControl<string>>> } | undefined>(undefined);
  protected readonly rows = remoteContent(computed(() => [this.config(), this.admin.revision()] as const),
    ([config]) => config.load().pipe(map((rows) => rows.length ? rows : null)));

  protected open(modal: Modal, button: HTMLElement, row?: AdminRow): void {
    const fields = this.config().fields ?? [];
    const form = new FormGroup(Object.fromEntries(fields.map((field) => [
      field.key, new FormControl({
        value: String((row ? row.cells[field.key] : field.initial) ?? ''),
        disabled: !!row && !!field.readonlyOnEdit,
      }, { nonNullable: true, validators: field.optional ? [] : [Validators.required] }),
    ])));
    this.write.error.set('');
    this.draft.set({ row, form });
    modal.show(button);
  }

  protected save(modal: Modal, row?: AdminRow): void {
    const form = this.draft()?.form;
    const save = this.config().save;
    if (!form || form.invalid || !save) return;
    this.write.run(save(form.getRawValue(), row), () => modal.close());
  }

  protected apply(action: AdminAction, row: AdminRow, modal: Modal, trigger: HTMLElement): void {
    if (!action.confirmation) {
      this.write.run(action.run(row));
      return;
    }
    this.pending.set({ action, row, message: action.confirmation(row) });
    modal.show(trigger);
  }

  protected display(value: Cell): string {
    if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
    return value === '' || value == null ? '—' : String(value);
  }
}

export const yesNo = [{ value: 'true', label: 'Oui' }, { value: 'false', label: 'Non' }] as const;

export function columns(...pairs: readonly [string, string][]) {
  return pairs.map(([key, label]) => ({ key, label }));
}

export function removeAction(subject: string, run: (row: AdminRow) => Observable<unknown>): AdminAction {
  return { label: 'Supprimer', confirmation: (row) => `Supprimer ${subject} « ${row.label ?? row.id} » ?`, run };
}
