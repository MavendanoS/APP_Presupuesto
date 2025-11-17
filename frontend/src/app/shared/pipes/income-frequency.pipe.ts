import { Pipe, PipeTransform } from '@angular/core';
import { IncomeFrequency } from '../../core/models';

/**
 * Pipe para convertir frecuencias de ingresos a texto legible en español
 */
@Pipe({
  name: 'incomeFrequency',
  standalone: true
})
export class IncomeFrequencyPipe implements PipeTransform {
  private readonly frequencyLabels: Record<IncomeFrequency, string> = {
    monthly: 'Mensual',
    weekly: 'Semanal',
    biweekly: 'Quincenal',
    annual: 'Anual',
    once: 'Único'
  };

  transform(value: IncomeFrequency): string {
    return this.frequencyLabels[value] || value;
  }
}
