import { Injectable, ApplicationRef } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { concat, interval } from 'rxjs';
import { first, filter } from 'rxjs/operators';

/**
 * Servicio para gestionar actualizaciones automáticas de la PWA
 * Verifica cada 30 segundos si hay una nueva versión disponible
 */
@Injectable({
  providedIn: 'root'
})
export class PwaUpdateService {
  constructor(
    private swUpdate: SwUpdate,
    private appRef: ApplicationRef
  ) {}

  /**
   * Inicializa el servicio de actualizaciones
   * Verifica actualizaciones periódicamente y al detectar cambios
   */
  init(): void {
    if (!this.swUpdate.isEnabled) {
      console.log('⚠️ Service Worker no está habilitado');
      return;
    }

    // Verificar actualizaciones INMEDIATAMENTE al iniciar
    console.log('🔍 Verificando actualizaciones al iniciar...');
    this.swUpdate.checkForUpdate().then(updateAvailable => {
      if (updateAvailable) {
        console.log('✅ Actualización encontrada al iniciar');
      } else {
        console.log('✅ App actualizada (sin nuevas versiones)');
      }
    }).catch(err => {
      console.error('❌ Error al verificar actualizaciones iniciales:', err);
    });

    // Verificar actualizaciones cada 30 segundos una vez que la app esté estable
    const appIsStable$ = this.appRef.isStable.pipe(
      first(isStable => isStable === true)
    );

    const every30Seconds$ = interval(30 * 1000); // 30 segundos

    const every30SecondsOnceAppIsStable$ = concat(appIsStable$, every30Seconds$);

    // Verificar actualizaciones periódicamente
    every30SecondsOnceAppIsStable$.subscribe(async () => {
      try {
        const updateAvailable = await this.swUpdate.checkForUpdate();
        if (updateAvailable) {
          console.log('✅ Nueva versión disponible');
        }
      } catch (err) {
        console.error('❌ Error al verificar actualizaciones:', err);
      }
    });

    // Escuchar cuando hay una nueva versión lista
    this.swUpdate.versionUpdates
      .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
      .subscribe(evt => {
        console.log('🚀 Nueva versión detectada:', evt.latestVersion.hash);
        console.log('📦 Versión actual:', evt.currentVersion.hash);

        // Mostrar notificación al usuario
        this.promptUserToUpdate();
      });

    // Escuchar errores de actualización
    this.swUpdate.unrecoverable.subscribe(event => {
      console.error('❌ Error irrecuperable en Service Worker:', event.reason);
      // Recargar la página para recuperarse del error
      this.reloadPage();
    });

    console.log('✅ Servicio de actualizaciones PWA inicializado');
  }

  /**
   * Muestra un mensaje al usuario y actualiza automáticamente
   */
  private promptUserToUpdate(): void {
    console.log('🎉 ¡Nueva versión disponible! Actualizando inmediatamente...');

    // Mostrar notificación nativa si está disponible
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('APP Presupuesto v3.2.2', {
        body: 'Nueva versión disponible. Actualizando...',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png'
      });
    }

    // Actualizar INMEDIATAMENTE (sin espera de 3 segundos)
    this.activateUpdate();
  }

  /**
   * Activa la actualización y recarga la página
   */
  private async activateUpdate(): Promise<void> {
    try {
      await this.swUpdate.activateUpdate();
      console.log('✅ Actualización activada, recargando página...');
      this.reloadPage();
    } catch (err) {
      console.error('❌ Error al activar actualización:', err);
      this.reloadPage();
    }
  }

  /**
   * Recarga la página
   */
  private reloadPage(): void {
    document.location.reload();
  }

  /**
   * Fuerza la verificación de actualizaciones manualmente
   */
  async checkForUpdates(): Promise<boolean> {
    if (!this.swUpdate.isEnabled) {
      return false;
    }

    try {
      return await this.swUpdate.checkForUpdate();
    } catch (err) {
      console.error('❌ Error al verificar actualizaciones:', err);
      return false;
    }
  }
}
