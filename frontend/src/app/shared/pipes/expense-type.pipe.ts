import { Pipe, PipeTransform } from '@angular/core';
import { ExpenseType } from '../../core/models';

/**
 * Pipe para convertir tipos de gastos a texto legible en español
 */
@Pipe({
  name: 'expenseType',
  standalone: true
})
export class ExpenseTypePipe implements PipeTransform {
  private readonly typeLabels: Record<ExpenseType, string> = {
    payment: 'Pago',
    purchase: 'Compra',
    small_expense: 'Gasto Hormiga'
  };

  transform(value: ExpenseType): string {
    return this.typeLabels[value] || value;
  }
}
