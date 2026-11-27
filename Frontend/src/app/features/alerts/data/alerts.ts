import { inject, Injectable, signal } from '@angular/core';
import { DEMO_NOW } from '../../../core/config/demo-clock';
import { demoRecords } from '../../../core/demo/demo-records';
import { demoAccounts, demoCities } from '../../../core/demo/demo-fixtures';
import { DemoConflict, owned, UserMock } from '../../../core/session/user-mock';
import { City } from '../../locations/location';

export const measures = {
  TEMPERATURE: 'Température',
  PLUIE: 'Probabilité de pluie',
  VENT: 'Vitesse du vent',
} as const;
export const operators = { GT: 'Supérieur à', GTE: 'Supérieur ou égal à', LT: 'Inférieur à', LTE: 'Inférieur ou égal à' } as const;
export const channels = { APPLICATION: 'Application', COURRIEL: 'Courriel' } as const;
export type Channel = keyof typeof channels;
export interface RuleDraft {
  cityId: string; cityName: string; measure: string; operator: string; threshold: number; source: string;
}
export interface AlertRule extends RuleDraft { id: string; owner: string; active: boolean }
interface Subscription { id: string; owner: string; ruleId: string; channel: Channel }
export interface Notification {
  id: string; owner: string; cityId: string; cityName: string; timezone: string; channel: Channel;
  title: string; date: string; read: boolean; status: 'ENVOYEE' | 'ECHEC';
}

@Injectable({ providedIn: 'root' })
export class AlertsData {
  private readonly mock = inject(UserMock);
  private readonly now = inject(DEMO_NOW);
  private readonly rules = demoRecords<AlertRule>('rules', [
    { id: 'rule-heat', owner: demoAccounts.amel, cityId: demoCities.tunis, cityName: 'Tunis', measure: 'TEMPERATURE',
      operator: 'GT', threshold: 38, source: 'OBSERVATION', active: true },
    { id: 'rule-rain', owner: demoAccounts.karim, cityId: demoCities.sousse, cityName: 'Sousse', measure: 'PLUIE',
      operator: 'GTE', threshold: 60, source: 'PREVISION', active: false },
  ]);
  private readonly subscriptions = demoRecords<Subscription>('subscriptions', [
    { id: 'sub-heat', owner: demoAccounts.amel, ruleId: 'rule-heat', channel: 'APPLICATION' },
  ]);
  private readonly notifications = demoRecords<Notification>('notifications', [
    { id: 'notice-heat', owner: demoAccounts.amel, cityId: demoCities.tunis, cityName: 'Tunis', timezone: 'Africa/Tunis',
      channel: 'APPLICATION', title: 'Seuil de chaleur atteint à Tunis', date: this.now.toISOString(), read: false, status: 'ENVOYEE' },
    { id: 'notice-wind', owner: demoAccounts.amel, cityId: demoCities.tunis, cityName: 'Tunis', timezone: 'Africa/Tunis',
      channel: 'COURRIEL', title: 'Vent fort à Tunis', date: new Date(this.now.getTime() - 3600000).toISOString(), read: false, status: 'ECHEC' },
    { id: 'notice-rain', owner: demoAccounts.karim, cityId: demoCities.sousse, cityName: 'Sousse', timezone: 'Africa/Tunis',
      channel: 'APPLICATION', title: 'Pluie à Sousse', date: this.now.toISOString(), read: true, status: 'ENVOYEE' },
  ]);
  private readonly emailAttempts = new Set<string>();
  readonly revision = signal(0);

  hasCity(id: string): boolean {
    return this.rules.rows().some((row) => row.cityId === id) || this.notifications.rows().some((row) => row.cityId === id);
  }

  ruleList() { return this.mock.run((owner) => this.rules.rows().filter((row) => row.owner === owner)); }
  subscriptionList() {
    return this.mock.run((owner) => this.subscriptions.rows().filter((row) => row.owner === owner).map((row) => ({
      ...row, rule: owned(this.rules.rows(), row.ruleId, owner),
    })));
  }
  notificationList() {
    return this.mock.run((owner) => {
      const items = this.notifications.rows().filter((row) => row.owner === owner).sort((a, b) => b.date.localeCompare(a.date));
      return { items, totalNonLues: items.filter((row) => row.channel === 'APPLICATION' && !row.read).length };
    });
  }

  save(city: City, draft: Omit<RuleDraft, 'cityId' | 'cityName'>, id?: string) {
    return this.mock.run((owner) => {
      const rows = this.rules.rows();
      const existing = id ? owned(rows, id, owner) : undefined;
      if (!Object.hasOwn(measures, draft.measure) || !Object.hasOwn(operators, draft.operator)
        || !['OBSERVATION', 'PREVISION'].includes(draft.source) || !Number.isFinite(draft.threshold)
        || (draft.measure === 'PLUIE' && (draft.threshold < 0 || draft.threshold > 100))) {
        throw new DemoConflict(422, 'Vérifiez la mesure, la source et la valeur du seuil.');
      }
      const rule: AlertRule = {
        ...draft, id: id ?? crypto.randomUUID(), owner, cityId: city.id, cityName: city.name, active: existing?.active ?? true,
      };
      this.rules.set(existing ? rows.map((row) => row === existing ? rule : row) : [...rows, rule]);
      this.refresh();
      return rule;
    });
  }

  toggle(id: string) {
    return this.mock.run((owner) => {
      const rows = this.rules.rows();
      const rule = owned(rows, id, owner);
      this.rules.set(rows.map((row) => row === rule ? { ...row, active: !row.active } : row));
      this.refresh();
    });
  }

  subscribe(ruleId: string, channel: Channel) {
    return this.mock.run((owner) => {
      owned(this.rules.rows(), ruleId, owner);
      const rows = this.subscriptions.rows();
      if (rows.some((row) => row.ruleId === ruleId && row.channel === channel)) {
        throw new DemoConflict(409, 'Ce canal est déjà abonné.');
      }
      if (channel === 'COURRIEL' && !this.emailAttempts.has(ruleId)) {
        this.emailAttempts.add(ruleId);
        throw new DemoConflict(503, 'Panne simulée du courriel. Réessayez ce canal.');
      }
      this.subscriptions.set([...rows, { id: crypto.randomUUID(), owner, ruleId, channel }]);
      this.refresh();
    });
  }

  unsubscribe(id: string) {
    return this.mock.run((owner) => {
      const rows = this.subscriptions.rows();
      const subscription = owned(rows, id, owner);
      this.subscriptions.set(rows.filter((row) => row !== subscription));
      this.refresh();
    });
  }

  markRead(id: string) {
    return this.mock.run((owner) => {
      const rows = this.notifications.rows();
      const item = owned(rows, id, owner);
      if (item.channel !== 'APPLICATION') throw new DemoConflict(422, 'Seules les notifications application peuvent être marquées comme lues.');
      this.notifications.set(rows.map((row) => row === item ? { ...row, read: true } : row));
      this.refresh();
    });
  }

  private refresh(): void { this.revision.update((value) => value + 1); }
}
