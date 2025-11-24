import { Component, signal, OnInit, OnDestroy, inject, ViewChild, effect } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PwaUpdateService } from './core/services/pwa-update.service';
import { InactivityService } from './core/services/inactivity.service';
import { AuthService } from './core/services/auth.service';
import { ReAuthModalComponent } from './shared/components/re-auth-modal/re-auth-modal.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ReAuthModalComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('frontend');
  private pwaUpdateService = inject(PwaUpdateService);
  private inactivityService = inject(InactivityService);
  private authService = inject(AuthService);

  @ViewChild(ReAuthModalComponent) reAuthModal?: ReAuthModalComponent;

  private inactivitySubscription?: Subscription;

  constructor() {
    // Escuchar cambios en autenticación con effect
    effect(() => {
      const isAuth = this.authService.isAuthenticated();
      if (isAuth) {
        this.startInactivityMonitoring();
      } else {
        this.stopInactivityMonitoring();
      }
    });
  }

  ngOnInit(): void {
    // Inicializar servicio de actualizaciones automáticas
    this.pwaUpdateService.init();

    // Inicializar monitoreo de inactividad si el usuario está autenticado
    if (this.authService.isAuthenticated()) {
      this.startInactivityMonitoring();
    }
  }

  ngOnDestroy(): void {
    this.stopInactivityMonitoring();
  }

  /**
   * Iniciar monitoreo de inactividad
   */
  private startInactivityMonitoring(): void {
    this.inactivityService.startMonitoring();

    // Escuchar evento de inactividad detectada
    this.inactivitySubscription = this.inactivityService.inactivityDetected$.subscribe(() => {
      this.handleInactivityDetected();
    });
  }

  /**
   * Detener monitoreo de inactividad
   */
  private stopInactivityMonitoring(): void {
    this.inactivityService.stopMonitoring();

    if (this.inactivitySubscription) {
      this.inactivitySubscription.unsubscribe();
      this.inactivitySubscription = undefined;
    }
  }

  /**
   * Manejar cuando se detecta inactividad
   */
  private handleInactivityDetected(): void {
    console.log('⏱️ Inactividad detectada, solicitando re-autenticación');

    // Mostrar modal de re-autenticación
    if (this.reAuthModal) {
      this.reAuthModal.open();
    }
  }
}
