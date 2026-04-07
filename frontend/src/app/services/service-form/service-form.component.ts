import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { PaymentServiceService } from '../../core/services/payment-service.service';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';

@Component({
  selector: 'app-service-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslocoPipe, NavbarComponent, ErrorMessageComponent],
  templateUrl: './service-form.component.html',
  styleUrls: ['./service-form.component.scss']
})
export class ServiceFormComponent implements OnInit {
  isEditMode = signal(false);
  serviceId = signal<number | null>(null);
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  name = signal('');
  icon = signal('bi-receipt');
  color = signal('#3B82F6');
  expectedAmount = signal<number | null>(null);

  availableIcons = [
    'bi-house', 'bi-lightbulb', 'bi-droplet', 'bi-fire', 'bi-wifi',
    'bi-phone', 'bi-bus-front', 'bi-receipt', 'bi-credit-card', 'bi-heart-pulse',
    'bi-mortarboard', 'bi-shield-check', 'bi-tv', 'bi-music-note', 'bi-cart',
    'bi-building', 'bi-car-front', 'bi-bicycle', 'bi-cup-hot', 'bi-basket'
  ];

  constructor(
    private paymentServiceService: PaymentServiceService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.serviceId.set(parseInt(id));
      this.loadService(parseInt(id));
    }
  }

  loadService(id: number): void {
    this.loading.set(true);
    this.paymentServiceService.getServiceById(id).subscribe({
      next: (data) => {
        this.name.set(data.service.name);
        this.icon.set(data.service.icon);
        this.color.set(data.service.color);
        this.expectedAmount.set(data.service.expected_amount);
        this.loading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(error.message || 'Error al cargar servicio');
        this.loading.set(false);
      }
    });
  }

  onSubmit(): void {
    if (!this.name() || this.name().trim().length < 2) {
      this.errorMessage.set('El nombre debe tener al menos 2 caracteres');
      return;
    }

    this.loading.set(true);
    const data: any = { name: this.name().trim(), icon: this.icon(), color: this.color() };
    if (this.expectedAmount() !== null && this.expectedAmount()! > 0) {
      data.expected_amount = this.expectedAmount();
    } else {
      data.expected_amount = null;
    }

    const request$ = this.isEditMode()
      ? this.paymentServiceService.updateService(this.serviceId()!, data)
      : this.paymentServiceService.createService(data);

    request$.subscribe({
      next: () => this.router.navigate(['/services']),
      error: (error) => {
        this.errorMessage.set(error.message || 'Error al guardar');
        this.loading.set(false);
      }
    });
  }
}
