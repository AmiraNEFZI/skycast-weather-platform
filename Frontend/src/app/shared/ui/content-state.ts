import { Component, input, output } from '@angular/core';

export type ContentStatus = 'loading' | 'empty' | 'error' | 'success';

@Component({
  selector: 'app-content-state',
  template: `
    @switch (status()) {
      @case ('loading') {
        <p class="state muted" role="status">{{ loadingMessage() }}</p>
      }
      @case ('empty') {
        <p class="state muted" role="status">{{ emptyMessage() }}</p>
      }
      @case ('error') {
        <div class="state">
          <p class="error-text" role="alert">{{ errorMessage() }}</p>
          <button class="button button-secondary" type="button" (click)="retry.emit()">
            Réessayer
          </button>
        </div>
      }
      @case ('success') {
        <ng-content />
      }
    }
  `,
})
export class ContentState {
  readonly status = input.required<ContentStatus>();
  readonly loadingMessage = input('Chargement…');
  readonly emptyMessage = input('Aucune donnée disponible.');
  readonly errorMessage = input('Le chargement a échoué.');
  readonly retry = output<void>();
}
