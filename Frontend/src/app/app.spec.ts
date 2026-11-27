import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { DEMO_CONFIG, LOCAL_DEMO_CONFIG } from './core/config/demo-config';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
        { provide: DEMO_CONFIG, useValue: LOCAL_DEMO_CONFIG },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('ouvre le tableau de bord et permet de revenir depuis une adresse inconnue', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/');
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toBe('Tableau de bord');

    await router.navigateByUrl('/inconnue');
    await fixture.whenStable();
    expect(compiled.querySelector('h1')?.textContent).toBe('Page introuvable');

    compiled.querySelector<HTMLAnchorElement>('main a')?.click();
    await fixture.whenStable();
    expect(router.url).toBe('/');
    expect(compiled.querySelector('h1')?.textContent).toBe('Tableau de bord');
  });
});
