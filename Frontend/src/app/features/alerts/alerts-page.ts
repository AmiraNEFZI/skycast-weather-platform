import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { SESSION } from '../../core/session/session-provider';
import { CityDate } from '../../shared/data/local-time';
import { remoteContent } from '../../shared/data/remote-content';
import { ContentState } from '../../shared/ui/content-state';
import { FormAction, formValues } from '../../shared/ui/form-action';
import { Modal } from '../../shared/ui/modal';
import { CITY_CATALOG } from '../locations/data/city-catalog';
import { AlertRule, AlertsData, Channel, channels, measures, operators } from './data/alerts';

@Component({
  selector: 'app-alerts-panel',
  imports: [CityDate, ContentState, Modal, NgTemplateOutlet],
  templateUrl: './alerts-panel.html',
  styles: `
    .filters { display: flex; flex-wrap: wrap; gap: .7rem; align-items: end; }
    .filters label { display: grid; gap: .25rem; }
    .account-row p { margin: 0; }
    [aria-pressed=true] { background: var(--accent-soft); }
    .alerts-nav { align-items: center; }
    .alerts-nav button { gap: .45rem; }
    .rules-view { display: grid; gap: 1rem; }
    .rule-card, .notice-preview { border: 1px solid var(--line); border-radius: .75rem; padding: .85rem 1rem; }
    .rule-card + .rule-card { margin-top: .65rem; }
    .rule-heading { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) auto; gap: .55rem 1rem; align-items: center; }
    .rule-description { margin: .25rem 0 0; }
    .rule-actions { margin-top: .7rem; }
    .rule-actions button { padding: .4rem .65rem; }
    .rule-inactive { color: var(--muted); background: var(--background); }
    .notice-preview .account-row { padding: 0; border: 0; }
    .notice-preview h2 { margin-bottom: .8rem; }
    @media (max-width: 40rem) {
      .rule-heading { grid-template-columns: minmax(0, 1fr) auto; }
      .rule-channels { grid-row: 2; grid-column: 1 / -1; }
    }
  `,
})
export class AlertsPanel {
  protected readonly data = inject(AlertsData);
  protected readonly cities = toSignal(inject(CITY_CATALOG).search(''), { initialValue: [] });
  private readonly route = inject(ActivatedRoute);
  protected readonly tab = signal<'rules' | 'subscriptions' | 'notifications'>(
    this.route.snapshot.queryParamMap.get('onglet') === 'notifications' ? 'notifications' : 'rules',
  );
  protected readonly rules = remoteContent(this.data.revision, () => this.data.ruleList());
  protected readonly subscriptions = remoteContent(this.data.revision, () => this.data.subscriptionList());
  protected readonly notifications = remoteContent(this.data.revision, () => this.data.notificationList());
  protected readonly ruleChannels = computed(() => {
    const channelsByRule = new Map<string, string[]>();
    for (const subscription of this.subscriptions.state().value ?? []) {
      const labels = channelsByRule.get(subscription.ruleId) ?? [];
      labels.push(channels[subscription.channel]);
      channelsByRule.set(subscription.ruleId, labels);
    }
    return channelsByRule;
  });
  protected readonly latestNotice = computed(() => this.notifications.state().value?.items[0]);
  protected readonly measures = measures;
  protected readonly operators = operators;
  protected readonly channels = channels;
  protected readonly measureKeys = Object.keys(measures) as (keyof typeof measures)[];
  protected readonly operatorKeys = Object.keys(operators) as (keyof typeof operators)[];
  protected readonly channelKeys = Object.keys(channels) as Channel[];
  protected readonly write = new FormAction();
  protected readonly channelWrite = new FormAction();
  protected readonly editing = signal<{ rule?: AlertRule } | undefined>(undefined);
  protected readonly selectedRule = signal('');
  protected readonly ruleCity = signal('');
  protected readonly ruleState = signal('');
  protected readonly noticeCity = signal('');
  protected readonly noticeRead = signal('');
  protected readonly noticeChannel = signal('');
  protected readonly noticeStatus = signal('');
  protected readonly filteredRules = computed(() => (this.rules.state().value ?? []).filter((rule) =>
    (!this.ruleCity() || rule.cityId === this.ruleCity()) &&
    (!this.ruleState() || String(rule.active) === this.ruleState()),
  ));
  protected readonly filteredNotices = computed(() => (this.notifications.state().value?.items ?? []).filter((notice) =>
    (!this.noticeCity() || notice.cityId === this.noticeCity()) &&
    (!this.noticeRead() || String(notice.read) === this.noticeRead()) &&
    (!this.noticeChannel() || notice.channel === this.noticeChannel()) &&
    (!this.noticeStatus() || notice.status === this.noticeStatus()),
  ));

  protected open(modal: Modal, trigger: HTMLElement, rule?: AlertRule): void {
    this.write.error.set('');
    this.editing.set({ rule });
    modal.show(trigger);
  }

  protected save(event: SubmitEvent, modal: Modal, id?: string): void {
    const form = formValues(event);
    const city = this.cities().find((item) => item.id === form.get('city'));
    if (!city) return;
    this.write.run(this.data.save(city, {
      measure: String(form.get('measure')), operator: String(form.get('operator')),
      threshold: Number(form.get('threshold')), source: String(form.get('source')),
    }, id), (rule) => {
      this.editing.set(undefined);
      modal.close();
      if (!id) this.manage(rule.id);
    });
  }

  protected manage(id: string): void {
    this.selectedRule.set(id);
    this.channelWrite.error.set('');
    this.channelWrite.done.set(false);
    this.tab.set('subscriptions');
  }

  protected subscribe(channel: Channel): void {
    const id = this.selectedRule();
    if (id) this.channelWrite.run(this.data.subscribe(id, channel));
  }

  protected unsubscribe(id: string): void {
    if (window.confirm('Retirer cet abonnement ?')) this.channelWrite.run(this.data.unsubscribe(id));
  }

  protected description(rule: AlertRule): string {
    const unit = rule.measure === 'TEMPERATURE' ? '°C' : rule.measure === 'PLUIE' ? '%' : 'km/h';
    return `${measures[rule.measure as keyof typeof measures]} · ${operators[rule.operator as keyof typeof operators]} ${rule.threshold} ${unit}`;
  }

  protected channelLabel(channel: Channel): string {
    return channels[channel];
  }
}

@Component({
  imports: [AlertsPanel],
  template: `@if (session().role === 'user') {
    @for (account of [session()]; track account) { <app-alerts-panel /> }
  }`,
})
export class AlertsPage {
  protected readonly session = inject(SESSION).current;
}
