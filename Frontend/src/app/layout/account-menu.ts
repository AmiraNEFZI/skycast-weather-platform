import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DemoReset } from '../core/demo/demo-reset';
import { demoProfiles, MockSessionProvider } from '../core/session/session-provider';
import { Modal } from '../shared/ui/modal';

@Component({
  selector: 'app-account-menu',
  imports: [Modal, RouterLink],
  template: `
    <button #trigger class="button button-secondary" type="button" aria-haspopup="dialog"
      [attr.aria-label]="buttonLabel() + ' · ' + demo.profile().label"
      (click)="picker.value = demo.profile().key; dialog.show(trigger)">
      {{ buttonLabel() }}
    </button>
    <app-modal #dialog label="Compte de démonstration">
      <p class="muted">Profil actif · <strong>{{ demo.profile().label }}</strong></p>
      <form (submit)="$event.preventDefault(); demo.select(picker.value); dialog.close()">
        <label>
          <span>Profil à utiliser</span>
          <select #picker class="field">
            @for (profile of profiles; track profile.key) {
              <option [value]="profile.key">{{ profile.label }}</option>
            }
          </select>
        </label>
        <button class="button" type="submit">Appliquer le profil</button>
      </form>
      <div class="form-buttons demo-actions">
        <a class="button button-secondary" routerLink="/demonstration" (click)="dialog.close()">Scénarios de démonstration</a>
        <button #resetButton class="button button-secondary" type="button" (click)="confirmation.show(resetButton)">
          Réinitialiser la démo
        </button>
      </div>
    </app-modal>
    <app-modal #confirmation label="Réinitialiser la démo" closeLabel="Annuler">
      <p>Les modifications de démonstration de cet onglet seront effacées. SkyCast rouvrira sur Tunis en profil Visiteur.</p>
      <div class="form-buttons demo-actions">
        <button class="button" type="button" (click)="reset.restart()">Confirmer la remise à zéro</button>
      </div>
    </app-modal>
  `,
  styles: `
    form { display: grid; gap: .85rem; margin-block: 1rem; }
    label { display: grid; gap: .35rem; }
    form button { justify-self: start; }
    .demo-actions { margin-bottom: .85rem; }
  `,
})
export class AccountMenu {
  readonly buttonLabel = input('Compte');
  protected readonly demo = inject(MockSessionProvider);
  protected readonly profiles = demoProfiles;
  protected readonly reset = inject(DemoReset);
}
