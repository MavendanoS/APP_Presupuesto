import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe para formatear montos en CLP
 * Uso: {{ amount | multiCurrency }}
 */
@Pipe({
  name: 'multiCurrency',
  standalone: true,
  pure: true
})
export class MultiCurrencyPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value === null || value === undefined || isNaN(value)) {
      return '$0';
    }
    const rounded = Math.round(value);
    const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `$${formatted}`;
  }
}
