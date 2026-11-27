import { DOCUMENT, inject, Injectable } from '@angular/core';
import { DemoStorage } from './demo-storage';

@Injectable({ providedIn: 'root' })
export class DemoReset {
  private readonly document = inject(DOCUMENT);
  private readonly storage = inject(DemoStorage);

  restart(): void {
    const window = this.document.defaultView;
    if (!window || this.storage.resetting()) return;
    this.storage.beginReset();
    // Une nouvelle page repart avec des services, des scénarios et des données en mémoire neufs.
    window.location.replace(this.document.baseURI);
  }
}
