import { Injectable, inject, computed } from '@angular/core';
import { IndicatorsService } from './indicators.service';
import { UserPreferencesService, Currency } from './user-preferences.service';

@Injectable({
  providedIn: 'root'
})
export class CurrencyConversionService {
  private indicatorsService = inject(IndicatorsService);
  private userPreferencesService = inject(UserPreferencesService);

  /**
   * Tasa de conversión USD actual (computed desde IndicatorsService)
   */
  usdRate = computed(() => this.indicatorsService.dolar() || 900);

  /**
   * Moneda preferida del usuario
   */
  preferredCurrency = computed(() => this.userPreferencesService.currentCurrency());

  /**
   * Convertir un monto de CLP a la moneda preferida del usuario
   * @param amountInCLP Monto en CLP (todos los montos se guardan en CLP)
   * @returns Monto en la moneda preferida del usuario
   */
  convertFromCLP(amountInCLP: number): number {
    const currency = this.preferredCurrency();

    if (currency === 'USD') {
      const rate = this.usdRate();
      return amountInCLP / rate;
    }

    // Si es CLP, retornar el monto sin conversión
    return amountInCLP;
  }

  /**
   * Convertir un monto de la moneda preferida a CLP
   * (útil para cuando el usuario ingrese datos en USD)
   * @param amount Monto en la moneda del usuario
   * @returns Monto en CLP
   */
  convertToCLP(amount: number): number {
    const currency = this.preferredCurrency();

    if (currency === 'USD') {
      const rate = this.usdRate();
      return amount * rate;
    }

    // Si ya es CLP, retornar sin conversión
    return amount;
  }

  /**
   * Obtener el símbolo de la moneda actual
   */
  getCurrencySymbol(currency?: Currency): string {
    const currencyToUse = currency || this.preferredCurrency();
    return currencyToUse === 'USD' ? '$' : '$';
  }

  /**
   * Obtener el código de la moneda actual
   */
  getCurrencyCode(currency?: Currency): string {
    const currencyToUse = currency || this.preferredCurrency();
    return currencyToUse;
  }

  /**
   * Formatear un monto en la moneda preferida
   * @param amountInCLP Monto en CLP
   * @returns String formateado con símbolo y separadores
   */
  format(amountInCLP: number): string {
    const convertedAmount = this.convertFromCLP(amountInCLP);
    const currency = this.preferredCurrency();
    const symbol = this.getCurrencySymbol(currency);

    if (currency === 'USD') {
      // Formato USD: $1,234.56
      return `${symbol}${convertedAmount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`;
    } else {
      // Formato CLP: $1.234
      return `${symbol}${Math.round(convertedAmount).toLocaleString('es-CL')}`;
    }
  }
}
