import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { privateAreas, readPrivateArea } from '../core/guards/private-route';
import { SESSION } from '../core/session/session-provider';
import { AccountMenu } from './account-menu';

@Component({
  imports: [AccountMenu, RouterLink],
  template: `
    <section class="card">
      <h1>{{ needsSession ? 'Connexion requise' : 'Accès refusé' }}</h1>
      @if (destination(); as area) {
        @if (canContinue()) {
          <p>Le profil actif autorise l’accès à {{ areas[area].title }}.</p>
        } @else if (areas[area].role === 'admin') {
          <p>Choisissez le profil administrateur pour ouvrir l’espace Administration.</p>
        } @else {
          <p>Choisissez un profil utilisateur pour ouvrir la page {{ areas[area].title }}.</p>
        }
      } @else {
        <p>Choisissez un profil autorisé pour consulter les espaces privés.</p>
      }
      <div class="actions">
        @if (destination(); as area) {
          @if (canContinue()) {
            <a class="button" [routerLink]="['/', area]" [queryParams]="cityParams()">Continuer vers {{ areas[area].title }}</a>
          }
        }
        <app-account-menu buttonLabel="Choisir un profil" />
        <a class="button button-secondary" routerLink="/" [queryParams]="cityParams()">Retour au tableau de bord</a>
      </div>
    </section>
  `,
  styles: `.actions { display: flex; flex-wrap: wrap; gap: .65rem; }`,
})
export class AccessNotice {
  private readonly route = inject(ActivatedRoute);
  private readonly session = inject(SESSION);
  private readonly params = toSignal(this.route.queryParamMap, { requireSync: true });
  protected readonly needsSession = this.route.snapshot.data['reason'] === 'session';
  protected readonly areas = privateAreas;
  protected readonly destination = computed(() => readPrivateArea(this.params().get('destination')));
  protected readonly cityParams = computed(() => ({ ville: this.params().get('ville') }));
  protected readonly canContinue = computed(() => {
    const area = this.destination();
    return area !== undefined && this.session.current().role === this.areas[area].role;
  });
}
