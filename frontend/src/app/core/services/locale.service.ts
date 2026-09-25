import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { map } from 'rxjs';

/**
 * Expone el idioma activo como signal y helpers de locale/traducción reactivos.
 * `state` emite cada vez que cambia el idioma Y su traducción terminó de cargar,
 * por lo que los computed que llamen a `t()` se recalculan con los textos correctos.
 */
@Injectable({
  providedIn: 'root'
})
export class LocaleService {
  private transloco = inject(TranslocoService);

  private readonly state = toSignal(
    this.transloco.selectTranslation().pipe(
      map(() => ({ lang: this.transloco.getActiveLang() }))
    ),
    { initialValue: { lang: this.transloco.getActiveLang() } }
  );

  /** Idioma activo ('es' | 'en') */
  readonly lang = computed(() => this.state().lang);

  /** Locale para Intl/toLocaleDateString */
  readonly locale = computed(() => (this.lang() === 'en' ? 'en-US' : 'es-CL'));

  /**
   * Traducción reactiva: al usarse dentro de un computed/template,
   * se re-evalúa cuando cambia el idioma o termina de cargar la traducción.
   */
  t(key: string, params?: Record<string, unknown>): string {
    this.state();
    return this.transloco.translate(key, params);
  }
}
