import { Injectable, signal, effect, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

export type Language = 'es' | 'en';
export type Currency = 'CLP' | 'USD';

export interface UpdatePreferencesRequest {
  language?: Language;
  currency?: Currency;
}

export interface UpdatePreferencesResponse {
  success: boolean;
  data: {
    user: {
      id: number;
      email: string;
      name: string;
      language: Language;
      currency: Currency;
      created_at: string;
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class UserPreferencesService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  // Señales para idioma y moneda actuales
  currentLanguage = signal<Language>('es');
  currentCurrency = signal<Currency>('CLP');

  constructor() {
    // Observar cambios en el usuario autenticado
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        this.currentLanguage.set(user.language || 'es');
        this.currentCurrency.set(user.currency || 'CLP');
      } else {
        // Si no hay usuario, volver a valores por defecto
        this.currentLanguage.set('es');
        this.currentCurrency.set('CLP');
      }
    });
  }

  /**
   * Actualizar preferencias de idioma y/o moneda
   */
  async updatePreferences(preferences: UpdatePreferencesRequest): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.put<UpdatePreferencesResponse>(
          `${environment.apiUrl}/auth/preferences`,
          preferences,
          { withCredentials: true }
        )
      );

      if (response.success && response.data.user) {
        // Actualizar el usuario en AuthService
        this.authService.currentUser.set(response.data.user);

        // Las señales se actualizarán automáticamente por el effect
      }
    } catch (error) {
      console.error('Error al actualizar preferencias:', error);
      throw error;
    }
  }

  /**
   * Cambiar idioma
   */
  async setLanguage(language: Language): Promise<void> {
    await this.updatePreferences({ language });
  }

  /**
   * Cambiar moneda
   */
  async setCurrency(currency: Currency): Promise<void> {
    await this.updatePreferences({ currency });
  }

  /**
   * Obtener idioma actual
   */
  getLanguage(): Language {
    return this.currentLanguage();
  }

  /**
   * Obtener moneda actual
   */
  getCurrency(): Currency {
    return this.currentCurrency();
  }
}
