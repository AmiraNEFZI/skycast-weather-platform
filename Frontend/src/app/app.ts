import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DemoStorage } from './core/demo/demo-storage';
import { AppShell } from './layout/app-shell';

@Component({
  imports: [AppShell, RouterOutlet],
  selector: 'app-root',
  template: `
    @if (resetting()) {
      <main><p role="status">Réinitialisation de la démonstration…</p></main>
    } @else {
      <app-shell><router-outlet /></app-shell>
    }
  `,
})
export class App {
  protected readonly resetting = inject(DemoStorage).resetting;
}
