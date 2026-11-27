import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  imports: [RouterLink],
  template: `
    <section class="card">
      <h1>Page introuvable</h1>
      <p class="muted">Cette adresse ne correspond à aucune page SkyCast.</p>
      <a class="button" routerLink="/">Retour au tableau de bord</a>
    </section>
  `,
})
export class NotFound {}
