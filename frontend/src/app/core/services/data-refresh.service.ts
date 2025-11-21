import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * Servicio centralizado para notificar actualizaciones de datos
 * Permite que los componentes se suscriban a cambios en diferentes entidades
 */
@Injectable({
  providedIn: 'root'
})
export class DataRefreshService {
  // Subjects para cada tipo de entidad
  private expenseChanged = new Subject<void>();
  private incomeChanged = new Subject<void>();
  private categoryChanged = new Subject<void>();
  private savingsChanged = new Subject<void>();

  // Observables públicos
  expenseChanged$ = this.expenseChanged.asObservable();
  incomeChanged$ = this.incomeChanged.asObservable();
  categoryChanged$ = this.categoryChanged.asObservable();
  savingsChanged$ = this.savingsChanged.asObservable();

  /**
   * Notificar que un gasto fue creado, actualizado o eliminado
   */
  notifyExpenseChange(): void {
    this.expenseChanged.next();
  }

  /**
   * Notificar que un ingreso fue creado, actualizado o eliminado
   */
  notifyIncomeChange(): void {
    this.incomeChanged.next();
  }

  /**
   * Notificar que una categoría fue creada, actualizada o eliminada
   */
  notifyCategoryChange(): void {
    this.categoryChanged.next();
  }

  /**
   * Notificar que una meta de ahorro fue creada, actualizada o eliminada
   */
  notifyDataChange(type: 'savings' | 'expense' | 'income' | 'category'): void {
    switch (type) {
      case 'savings':
        this.savingsChanged.next();
        break;
      case 'expense':
        this.expenseChanged.next();
        break;
      case 'income':
        this.incomeChanged.next();
        break;
      case 'category':
        this.categoryChanged.next();
        break;
    }
  }
}
