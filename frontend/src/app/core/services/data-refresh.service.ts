import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DataRefreshService {
  private serviceChanged = new Subject<void>();
  private paymentChanged = new Subject<void>();
  private incomeChanged = new Subject<void>();

  serviceChanged$ = this.serviceChanged.asObservable();
  paymentChanged$ = this.paymentChanged.asObservable();
  incomeChanged$ = this.incomeChanged.asObservable();

  notifyDataChange(type: 'service' | 'payment' | 'income'): void {
    switch (type) {
      case 'service':
        this.serviceChanged.next();
        break;
      case 'payment':
        this.paymentChanged.next();
        break;
      case 'income':
        this.incomeChanged.next();
        break;
    }
  }
}
