import { DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';

export class FormAction {
  private readonly destroy = inject(DestroyRef);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly done = signal(false);

  run<T>(request: Observable<T>, success: (value: T) => void = () => {}): void {
    if (this.busy()) return;
    this.error.set('');
    this.done.set(false);
    this.busy.set(true);
    request.pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: (value) => { this.done.set(true); success(value); },
      error: (error: unknown) => {
        this.busy.set(false);
        this.error.set(error instanceof Error ? error.message : 'L’action a échoué.');
      },
      complete: () => this.busy.set(false),
    });
  }
}

export function formValues(event: SubmitEvent): FormData {
  event.preventDefault();
  return new FormData(event.currentTarget as HTMLFormElement);
}
