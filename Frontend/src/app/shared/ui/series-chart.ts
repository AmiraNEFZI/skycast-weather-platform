import { Component, effect, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { ThemeService } from '../../core/theme/theme-service';
import { Reading } from './reading';

export interface ChartPoint {
  readonly label: string;
  readonly value: number | null;
  readonly rain?: number | null;
}

@Component({
  selector: 'app-series-chart',
  imports: [Reading],
  template: `
    <section class="card">
      <h2>{{ heading() }}</h2>
      @if (hasValues()) {
        <canvas #plot [class.comparison]="compareRain()" aria-hidden="true"></canvas>
        <details #values (toggle)="expanded.set(values.open)">
          <summary>Voir les valeurs · {{ heading() }}</summary>
          @if (expanded()) {
            <div class="table-scroll">
              <table>
                <caption class="visually-hidden">{{ heading() }}</caption>
                <thead><tr><th scope="col">Heure locale</th><th scope="col">{{ heading() }}</th>
                  @if (compareRain()) { <th scope="col">Pluie (%)</th> }
                </tr></thead>
                <tbody>
                  @for (point of points(); track $index) {
                    <tr><td>{{ point.label }}</td><td>{{ point.value | reading:unit() }}</td>
                      @if (compareRain()) { <td>{{ (point.rain ?? null) | reading:'%' }}</td> }
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </details>
      } @else {
        <p class="muted">Aucune mesure disponible sur cette période.</p>
      }
    </section>
  `,
  styles: `
    :host { display: block; min-width: 0; }
    canvas { display: block; width: 100%; height: 10rem; margin-block: .65rem .35rem; }
    canvas.comparison { height: 17rem; }
    summary { cursor: pointer; color: var(--accent-text); font-size: .875rem; }
    .table-scroll { max-height: 18rem; overflow: auto; }
    table { width: 100%; border-collapse: collapse; margin-top: .55rem; }
    th, td { text-align: start; padding: .45rem .25rem; border-bottom: 1px solid var(--line); }
  `,
})
export class SeriesChart {
  readonly heading = input.required<string>();
  readonly points = input.required<readonly ChartPoint[]>();
  readonly unit = input<Parameters<Reading['transform']>[1]>('');
  readonly variant = input<'line' | 'bars'>('line');
  readonly compareRain = input(false);
  protected readonly expanded = signal(false);
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('plot');
  private readonly theme = inject(ThemeService).theme;

  constructor() {
    effect((cleanup) => {
      const canvas = this.canvas()?.nativeElement;
      const points = this.points();
      const style = this.variant();
      const compare = this.compareRain();
      this.theme();
      if (!canvas) return;

      const paint = () => drawChart(canvas, points, style, compare);
      paint();
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(paint);
      observer.observe(canvas);
      cleanup(() => observer.disconnect());
    });
  }

  protected hasValues(): boolean {
    return this.points().some(({ value, rain }) => value !== null || (this.compareRain() && rain != null));
  }
}

function drawChart(canvas: HTMLCanvasElement, points: readonly ChartPoint[], style: 'line' | 'bars', compare: boolean): void {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (width < 90 || height === 0) return;

  const pixelRatio = canvas.ownerDocument.defaultView?.devicePixelRatio ?? 1;
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.scale(pixelRatio, pixelRatio);
  const colors = getComputedStyle(canvas);
  const values = points.map((point) => point.value).filter((value) => value !== null);
  const min = style === 'bars' ? 0 : Math.floor(Math.min(...values)) - 1;
  const max = style === 'bars' ? 100 : Math.ceil(Math.max(...values)) + 1;
  const left = compare ? 36 : 30;
  const bottom = compare ? Math.round(height * .54) : height - 28;
  const plotWidth = width - left - 10;
  const step = plotWidth / Math.max(1, points.length);
  const x = (index: number) => left + step * (index + 0.5);
  const y = (value: number) => bottom - (bottom - 12) * (value - min) / (max - min);

  ctx.font = '11px system-ui';
  ctx.fillStyle = colors.getPropertyValue('--muted');
  ctx.strokeStyle = colors.getPropertyValue('--line');
  for (const value of values.length ? [min, Math.round((min + max) / 2), max] : []) {
    ctx.fillText(String(value), 0, y(value) + 4);
    ctx.beginPath();
    ctx.moveTo(left, y(value));
    ctx.lineTo(width - 5, y(value));
    ctx.stroke();
  }
  ctx.fillText(points[0].label, left, height - 7);
  if (points.length > 1) {
    const last = points[points.length - 1].label;
    const lastX = width - ctx.measureText(last).width - 6;
    if (lastX > left + ctx.measureText(points[0].label).width + 8) ctx.fillText(last, lastX, height - 7);
  }
  if (compare) {
    const base = height - 27;
    const top = bottom + 34;
    const rainY = (value: number) => base - (base - top) * value / 100;
    ctx.fillText('Probabilité de pluie', left, bottom + 19);
    for (const value of [0, 50, 100]) {
      ctx.fillText(value + ' %', 0, rainY(value) + 4);
      ctx.beginPath();
      ctx.moveTo(left, rainY(value));
      ctx.lineTo(width - 5, rainY(value));
      ctx.stroke();
    }
    ctx.fillStyle = colors.getPropertyValue('--chart-fill');
    for (const [index, point] of points.entries()) {
      if (point.rain != null) ctx.fillRect(x(index) - step * .32, rainY(point.rain), step * .64, base - rainY(point.rain));
    }
  }

  ctx.fillStyle = colors.getPropertyValue('--chart-line');
  ctx.strokeStyle = ctx.fillStyle;
  ctx.lineWidth = 2;
  if (style === 'bars') {
    for (const [index, { value }] of points.entries()) {
      if (value !== null) ctx.fillRect(x(index) - step * 0.32, y(value), step * 0.64, bottom - y(value));
    }
    return;
  }

  ctx.beginPath();
  let connected = false;
  for (const [index, { value }] of points.entries()) {
    if (value === null) {
      connected = false;
      continue;
    }
    if (connected) ctx.lineTo(x(index), y(value));
    else ctx.moveTo(x(index), y(value));
    connected = true;
  }
  ctx.stroke();
  for (const [index, { value }] of points.entries()) {
    if (value !== null && (points.length <= 24 || (points[index - 1]?.value == null && points[index + 1]?.value == null))) {
      ctx.beginPath();
      ctx.arc(x(index), y(value), 2, 0, 2 * Math.PI);
      ctx.fill();
    }
  }
}
