import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { PaymentServiceService } from '../../core/services/payment-service.service';
import { PaymentService } from '../../core/models';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';

@Component({
  selector: 'app-service-list',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslocoPipe, NavbarComponent, LoadingComponent, ErrorMessageComponent],
  templateUrl: './service-list.component.html',
  styleUrls: ['./service-list.component.scss']
})
export class ServiceListComponent implements OnInit {
  services = signal<PaymentService[]>([]);
  loading = signal(true);
  errorMessage = signal<string | null>(null);
  deleteConfirmId = signal<number | null>(null);

  constructor(private paymentServiceService: PaymentServiceService) {}

  ngOnInit(): void {
    this.loadServices();
  }

  loadServices(): void {
    this.loading.set(true);
    this.paymentServiceService.getServices().subscribe({
      next: (data) => {
        this.services.set(data.services);
        this.loading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(error.message || 'Error al cargar servicios');
        this.loading.set(false);
      }
    });
  }

  toggleActive(service: PaymentService): void {
    const newActive = service.is_active === 1 ? 0 : 1;
    this.paymentServiceService.updateService(service.id, { is_active: newActive }).subscribe({
      next: () => this.loadServices(),
      error: (error) => this.errorMessage.set(error.message)
    });
  }

  moveUp(index: number): void {
    if (index === 0) return;
    const ids = this.services().map(s => s.id);
    [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
    this.paymentServiceService.reorderServices(ids).subscribe({
      next: () => this.loadServices(),
      error: (error) => this.errorMessage.set(error.message)
    });
  }

  moveDown(index: number): void {
    const list = this.services();
    if (index >= list.length - 1) return;
    const ids = list.map(s => s.id);
    [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
    this.paymentServiceService.reorderServices(ids).subscribe({
      next: () => this.loadServices(),
      error: (error) => this.errorMessage.set(error.message)
    });
  }

  confirmDelete(id: number): void {
    this.deleteConfirmId.set(id);
  }

  cancelDelete(): void {
    this.deleteConfirmId.set(null);
  }

  deleteService(id: number): void {
    this.paymentServiceService.deleteService(id).subscribe({
      next: () => {
        this.deleteConfirmId.set(null);
        this.loadServices();
      },
      error: (error) => this.errorMessage.set(error.message)
    });
  }
}
