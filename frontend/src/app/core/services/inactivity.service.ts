import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subject } from 'rxjs';
import { DeviceDetectionService } from './device-detection.service';

/**
 * Servicio para detectar inactividad del usuario
 * Timeout: 10 minutos (mobile) o 1 hora (desktop)
 */
@Injectable({
  providedIn: 'root'
})
export class InactivityService {
  private platformId = inject(PLATFORM_ID);
  private deviceDetection = inject(DeviceDetectionService);

  private lastActivityTime: number = Date.now();
  private checkIntervalId?: number;
  private isMonitoring = false;

  // Eventos que indican actividad del usuario
  private readonly ACTIVITY_EVENTS = [
    'mousedown',
    'mousemove',
    'keypress',
    'scroll',
    'touchstart',
    'touchmove',
    'click'
  ];

  // Observable para notificar cuando se detecta inactividad
  inactivityDetected$ = new Subject<void>();

  constructor() {
    // Restaurar último tiempo de actividad desde localStorage
    if (isPlatformBrowser(this.platformId)) {
      const stored = localStorage.getItem('lastActivityTime');
      if (stored) {
        this.lastActivityTime = parseInt(stored, 10);
      }
    }
  }

  /**
   * Iniciar monitoreo de inactividad
   */
  startMonitoring(): void {
    if (!isPlatformBrowser(this.platformId) || this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.resetTimer();

    // Agregar listeners de eventos de actividad
    this.ACTIVITY_EVENTS.forEach(event => {
      document.addEventListener(event, this.handleActivity, { passive: true });
    });

    // Verificar inactividad cada minuto
    this.checkIntervalId = window.setInterval(() => {
      this.checkInactivity();
    }, 60000); // 60 segundos

    // Manejar cuando la app vuelve a estar visible (cambio de tab o volver del background)
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    // Persistir último tiempo de actividad antes de cerrar
    window.addEventListener('beforeunload', this.persistLastActivity);

    console.log('✅ Monitoreo de inactividad iniciado');
  }

  /**
   * Detener monitoreo de inactividad
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    // Remover listeners de eventos
    this.ACTIVITY_EVENTS.forEach(event => {
      document.removeEventListener(event, this.handleActivity);
    });

    // Limpiar interval
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = undefined;
    }

    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('beforeunload', this.persistLastActivity);

    console.log('⏸️ Monitoreo de inactividad detenido');
  }

  /**
   * Restablecer el timer de inactividad (usuario está activo)
   */
  resetTimer(): void {
    this.lastActivityTime = Date.now();

    // Guardar en localStorage para persistencia
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('lastActivityTime', this.lastActivityTime.toString());
    }
  }

  /**
   * Obtener tiempo transcurrido desde última actividad (en milisegundos)
   */
  getInactiveTime(): number {
    return Date.now() - this.lastActivityTime;
  }

  /**
   * Verificar si el usuario ha estado inactivo por demasiado tiempo
   */
  private checkInactivity = (): void => {
    const inactiveTime = this.getInactiveTime();
    const timeout = this.deviceDetection.getInactivityTimeout();

    if (inactiveTime >= timeout) {
      console.warn(`⏱️ Inactividad detectada: ${Math.floor(inactiveTime / 60000)} minutos`);
      this.handleInactivityDetected();
    }
  };

  /**
   * Manejar cuando se detecta inactividad
   */
  private handleInactivityDetected(): void {
    // Detener monitoreo temporalmente
    this.stopMonitoring();

    // Emitir evento de inactividad
    this.inactivityDetected$.next();
  }

  /**
   * Manejar actividad del usuario
   */
  private handleActivity = (): void => {
    this.resetTimer();
  };

  /**
   * Manejar cambio de visibilidad (tab switching, volver del background)
   */
  private handleVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') {
      // La app volvió a estar visible, verificar si pasó demasiado tiempo
      this.checkInactivity();
    }
  };

  /**
   * Persistir último tiempo de actividad antes de cerrar
   */
  private persistLastActivity = (): void => {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('lastActivityTime', this.lastActivityTime.toString());
    }
  };
}
