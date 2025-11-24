import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Servicio para detectar el tipo de dispositivo y capacidades
 */
@Injectable({
  providedIn: 'root'
})
export class DeviceDetectionService {
  private platformId = inject(PLATFORM_ID);

  /**
   * Detecta si el dispositivo es mobile
   * Usa múltiples indicadores para mayor precisión
   */
  isMobileDevice(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }

    // Indicador 1: Touch capability
    const hasTouch = 'maxTouchPoints' in navigator && navigator.maxTouchPoints > 0;

    // Indicador 2: Media query pointer coarse (touch primary)
    const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;

    // Indicador 3: User Agent
    const isMobileUA = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    // Al menos 2 de 3 indicadores deben ser verdaderos
    const indicators = [hasTouch, isCoarsePointer, isMobileUA];
    return indicators.filter(Boolean).length >= 2;
  }

  /**
   * Retorna el timeout de inactividad apropiado según el dispositivo
   * Mobile: 10 minutos
   * Desktop: 1 hora
   */
  getInactivityTimeout(): number {
    if (this.isMobileDevice()) {
      return 10 * 60 * 1000; // 10 minutos en milisegundos
    }
    return 60 * 60 * 1000; // 1 hora en milisegundos
  }

  /**
   * Retorna un nombre descriptivo del timeout para mostrar al usuario
   */
  getInactivityTimeoutLabel(): string {
    return this.isMobileDevice() ? '10 minutos' : '1 hora';
  }
}
