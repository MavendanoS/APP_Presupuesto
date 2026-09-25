import { Injectable, ApplicationRef, inject } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { TranslocoService } from '@jsverse/transloco';
import { concat, interval } from 'rxjs';
import { first, filter } from 'rxjs/operators';

/**
 * Servicio para gestionar actualizaciones de la PWA.
 * Verifica periódicamente si hay una nueva versión y, cuando está lista,
 * pregunta al usuario antes de recargar (nunca recarga en silencio).
 */
@Injectable({
  providedIn: 'root'
})
export class PwaUpdateService {
  private swUpdate = inject(SwUpdate);
  private appRef = inject(ApplicationRef);
  private transloco = inject(TranslocoService);

  private promptShown = false;

  /**
   * Inicializa el servicio de actualizaciones
   */
  init(): void {
    if (!this.swUpdate.isEnabled) {
      return;
    }

    // Verificar actualizaciones al iniciar y luego cada 30 segundos una vez que la app esté estable
    const appIsStable$ = this.appRef.isStable.pipe(first(isStable => isStable === true));
    const every30Seconds$ = interval(30 * 1000);

    concat(appIsStable$, every30Seconds$).subscribe(async () => {
      try {
        await this.swUpdate.checkForUpdate();
      } catch (err) {
        console.error('Error al verificar actualizaciones:', err);
      }
    });

    // Cuando hay una nueva versión lista, preguntar al usuario
    this.swUpdate.versionUpdates
      .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
      .subscribe(() => this.promptUserToUpdate());

    // Estado irrecuperable del Service Worker: la única salida es recargar
    this.swUpdate.unrecoverable.subscribe(event => {
      console.error('Error irrecuperable en Service Worker:', event.reason);
      this.reloadPage();
    });
  }

  /**
   * Pregunta (sin bloquear el uso de la app hasta que se muestre) si se desea actualizar ahora.
   * Si el usuario rechaza, la nueva versión se aplicará en la próxima carga de la app.
   */
  private promptUserToUpdate(): void {
    if (this.promptShown) return;
    this.promptShown = true;

    // Diferir para no interrumpir el ciclo actual de la app
    setTimeout(() => {
      const accepted = window.confirm(this.transloco.translate('pwa.updateAvailable'));
      if (accepted) {
        this.activateUpdate();
      } else {
        this.promptShown = false;
      }
    }, 0);
  }

  /**
   * Activa la actualización y recarga la página
   */
  private async activateUpdate(): Promise<void> {
    try {
      await this.swUpdate.activateUpdate();
    } catch (err) {
      console.error('Error al activar actualización:', err);
    }
    this.reloadPage();
  }

  /**
   * Recarga la página
   */
  private reloadPage(): void {
    document.location.reload();
  }
}
