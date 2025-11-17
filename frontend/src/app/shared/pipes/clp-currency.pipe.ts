import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe para formatear montos en pesos chilenos
 * Formato: $1.234.567 (sin decimales, separador de miles con punto)
 */
@Pipe({
  name: 'clpCurrency',
  standalone: true
})
export class ClpCurrencyPipe implements PipeTransform {
  transform(value: number | string | null | undefined, showSymbol: boolean = true): string {
    if (value === null || value === undefined || value === '') {
      return showSymbol ? '$0' : '0';
    }

    // Convertir a número
    const numValue = typeof value === 'string' ? parseFloat(value) : value;

    if (isNaN(numValue)) {
      return showSymbol ? '$0' : '0';
    }

    // Redondear a entero (sin decimales)
    const rounded = Math.round(numValue);

    // Formatear con separador de miles
    const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    // Agregar símbolo $ si se solicita
    return showSymbol ? `$${formatted}` : formatted;
  }
}
