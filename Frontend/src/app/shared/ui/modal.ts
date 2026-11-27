import { Component, ElementRef, input, output, viewChild } from '@angular/core';

@Component({
  selector: 'app-modal',
  template: `
    <dialog #dialog [attr.aria-label]="label()" (close)="restoreFocus()">
      <h2>{{ label() }}</h2>
      <ng-content />
      <form method="dialog" class="dialog-actions">
        <button class="button button-secondary" autofocus>{{ closeLabel() }}</button>
      </form>
    </dialog>
  `,
})
export class Modal {
  readonly label = input.required<string>();
  readonly closeLabel = input('Fermer');
  readonly closed = output<void>();
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private trigger?: HTMLElement;

  show(trigger: HTMLElement): void {
    const dialog = this.dialog().nativeElement;
    if (dialog.open) return;
    this.trigger = trigger;
    dialog.showModal();
  }

  close(): void {
    this.dialog().nativeElement.close();
  }

  protected restoreFocus(): void {
    if (this.dialog().nativeElement.open) return;
    this.trigger?.focus();
    this.trigger = undefined;
    this.closed.emit();
  }
}
