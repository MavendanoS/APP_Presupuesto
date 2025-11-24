import { Pipe, PipeTransform, inject } from '@angular/core';
import { CurrencyConversionService } from '../../core/services/currency-conversion.service';

/**
 * Pipe para formatear montos según la moneda preferida del usuario
 * Reemplaza a ClpCurrencyPipe con soporte multi-moneda
 *
 * Uso: {{ amount | multiCurrency }}
 *
 * IMPORTANTE: pure: false para que se actualice cuando cambie la preferencia de moneda
 */
@Pipe({
  name: 'multiCurrency',
  standalone: true,
  pure: false // Necesario para reaccionar a cambios en las preferencias
})
export class MultiCurrencyPipe implements PipeTransform {
  private currencyService = inject(CurrencyConversionService);

  transform(value: number | null | undefined): string {
    if (value === null || value === undefined || isNaN(value)) {
      return this.currencyService.format(0);
    }

    return this.currencyService.format(value);
  }
}
