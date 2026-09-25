import { Component, OnInit, OnDestroy, inject, ViewChild, effect } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PwaUpdateService } from './core/services/pwa-update.service';
import { InactivityService } from './core/services/inactivity.service';
import { AuthService } from './core/services/auth.service';
import { ReAuthModalComponent } from './shared/components/re-auth-modal/re-auth-modal.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ReAuthModalComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  private pwaUpdateService = inject(PwaUpdateService);
  private inactivityService = inject(InactivityService);
  private authService = inject(AuthService);

  @ViewChild(ReAuthModalComponent) reAuthModal?: ReAuthModalComponent;

  constructor() {
    // Suscripción única al evento de inactividad (se mantiene durante toda la vida de la app)
    this.inactivityService.inactivityDetected$
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.handleInactivityDetected());

    // Iniciar/detener monitoreo según el estado de autenticación
    effect(() => {
      if (this.authService.isAuthenticated()) {
        this.inactivityService.startMonitoring();
      } else {
        this.inactivityService.stopMonitoring();
        this.reAuthModal?.close();
      }
    });
  }

  ngOnInit(): void {
    // Inicializar servicio de actualizaciones de la PWA
    this.pwaUpdateService.init();
  }

  ngOnDestroy(): void {
    this.inactivityService.stopMonitoring();
  }

  /**
   * Re-autenticación exitosa: reiniciar el contador y retomar el monitoreo
   */
  onReauthenticated(): void {
    this.inactivityService.resetTimer();
    this.inactivityService.startMonitoring();
  }

  /**
   * Manejar cuando se detecta inactividad: mostrar modal de re-autenticación
   */
  private handleInactivityDetected(): void {
    this.reAuthModal?.open();
  }
}
