import { Component, inject } from '@angular/core';
import { Params, RouterLink } from '@angular/router';
import { DEMO_NOW } from '../../core/config/demo-clock';
import { demoCities } from '../../core/demo/demo-fixtures';
import { CityDate } from '../../shared/data/local-time';

interface Scenario {
  title: string;
  description: string;
  path: string;
  params?: Params;
  action: string;
}

const scenarios: readonly Scenario[] = [
  {
    title: 'Parcours public standard', description: 'Voir les relevés de Tunis et un indice UV égal à zéro.',
    path: '/', params: { ville: demoCities.tunis }, action: 'Ouvrir Tunis',
  },
  {
    title: 'Réponse de recherche retardée',
    description: 'Dans la recherche, saisir « tu », attendre une demi-seconde puis saisir « par ». Seul le résultat le plus récent doit s’afficher.',
    path: '/', params: { ville: demoCities.tunis }, action: 'Ouvrir le tableau de bord',
  },
  {
    title: 'Historique vide', description: 'Ariana n’a ni relevé ni historique air et UV dans le jeu initial.',
    path: '/air-et-uv', params: { ville: demoCities.ariana }, action: 'Voir Ariana',
  },
  {
    title: 'Mesures partielles et relevé ancien',
    description: 'À Sousse, les mesures PM10 et UV sont indisponibles. La météo marque le relevé comme ancien.',
    path: '/', params: { ville: demoCities.sousse }, action: 'Voir Sousse',
  },
  {
    title: 'Géolocalisation refusée',
    description: 'Dans Cartes, ouvrir « Simuler la géolocalisation » et choisir « Autorisation refusée ». Tunis reste sélectionnée.',
    path: '/cartes', params: { ville: demoCities.tunis }, action: 'Ouvrir Cartes',
  },
  {
    title: 'Panne air et UV',
    description: 'La météo et les prévisions restent visibles. « Réessayer » restaure le relevé air et UV.',
    path: '/', params: { ville: demoCities.tunis, scenario: 'panne-air-uv' }, action: 'Déclencher la panne',
  },
  {
    title: 'Conflit sur un avis',
    description: 'En profil utilisateur, déposer deux avis pour Tunis. Le second doit être refusé et sa saisie conservée.',
    path: '/', params: { ville: demoCities.tunis }, action: 'Ouvrir les avis de Tunis',
  },
  {
    title: 'Échec partiel des abonnements',
    description: 'En profil utilisateur, créer une règle. Abonner Application puis Courriel. Le réessai du Courriel conserve la règle et le premier abonnement.',
    path: '/alertes', params: { ville: demoCities.tunis }, action: 'Ouvrir les alertes',
  },
];

@Component({
  imports: [CityDate, RouterLink],
  template: `
    <h1 class="page-title">Scénarios de démonstration</h1>
    <p class="muted">Données fictives · Horloge de référence au {{ reference | cityDate:'UTC' }} UTC.</p>
    <div class="chart-grid">
      @for (scenario of scenarios; track scenario.title) {
        <section class="card scenario">
          <h2>{{ scenario.title }}</h2>
          <p>{{ scenario.description }}</p>
          <a class="button button-secondary" [routerLink]="scenario.path" [queryParams]="scenario.params">{{ scenario.action }}</a>
        </section>
      }
    </div>
  `,
  styles: '.scenario { display: flex; flex-direction: column; align-items: start; } .scenario a { margin-top: auto; }',
})
export class DemoScenarios {
  protected readonly reference = inject(DEMO_NOW).toISOString();
  protected readonly scenarios = scenarios;
}
