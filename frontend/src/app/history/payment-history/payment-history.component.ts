import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { MonthlyPaymentService } from '../../core/services/monthly-payment.service';
import { PaymentServiceService } from '../../core/services/payment-service.service';
import { PaymentService, PaymentHistoryEntry, ServiceAverage } from '../../core/models';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';
import { ClpCurrencyPipe } from '../../shared/pipes/clp-currency.pipe';
import { BarChartComponent } from '../../shared/components/bar-chart/bar-chart.component';

@Component({
  selector: 'app-payment-history',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule, TranslocoPipe,
    NavbarComponent, LoadingComponent, ErrorMessageComponent,
    ClpCurrencyPipe, BarChartComponent
  ],
  templateUrl: './payment-history.component.html',
  styleUrls: ['./payment-history.component.scss']
})
export class PaymentHistoryComponent implements OnInit {
  services = signal<PaymentService[]>([]);
  selectedServiceIds = signal<number[]>([]);
  history = signal<PaymentHistoryEntry[]>([]);
  averages = signal<ServiceAverage[]>([]);
  loading = signal(true);
  errorMessage = signal<string | null>(null);

  startMonth = signal(this.getMonthsAgo(6));
  endMonth = signal(this.getCurrentYearMonth());
  avgMonths = signal(3);
  viewMode = signal<'chart' | 'table'>('chart');

  // Chart data computed
  chartLabels = computed(() => {
    const months = new Set<string>();
    this.history().forEach(h => months.add(h.year_month));
    return Array.from(months).sort();
  });

  chartDatasets = computed(() => {
    const labels = this.chartLabels();
    const selectedIds = this.selectedServiceIds();
    const historyData = this.history();

    // Group by service
    const serviceMap = new Map<number, { name: string; color: string; data: Map<string, number> }>();

    historyData.forEach(entry => {
      if (selectedIds.length > 0 && !selectedIds.includes(entry.service_id)) return;

      if (!serviceMap.has(entry.service_id)) {
        serviceMap.set(entry.service_id, {
          name: entry.service_name,
          color: entry.service_color,
          data: new Map()
        });
      }
      serviceMap.get(entry.service_id)!.data.set(entry.year_month, entry.amount);
    });

    return Array.from(serviceMap.values()).map(s => ({
      label: s.name,
      data: labels.map(m => s.data.get(m) || 0),
      backgroundColor: s.color + '80',
      borderColor: s.color,
      borderWidth: 2
    }));
  });

  // Filtered history for table
  filteredHistory = computed(() => {
    const ids = this.selectedServiceIds();
    if (ids.length === 0) return this.history();
    return this.history().filter(h => ids.includes(h.service_id));
  });

  constructor(
    private paymentService: MonthlyPaymentService,
    private paymentServiceService: PaymentServiceService
  ) {}

  ngOnInit(): void {
    this.loadServices();
    this.loadData();
  }

  loadServices(): void {
    this.paymentServiceService.getServices().subscribe({
      next: (data) => this.services.set(data.services),
      error: () => {}
    });
  }

  loadData(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const serviceIdsParam = this.selectedServiceIds().length > 0
      ? this.selectedServiceIds().join(',')
      : undefined;

    // Load history and averages
    this.paymentService.getHistory({
      start_month: this.startMonth(),
      end_month: this.endMonth(),
      service_ids: serviceIdsParam
    }).subscribe({
      next: (data) => {
        this.history.set(data.history);
        this.loading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(error.message || 'Error al cargar historial');
        this.loading.set(false);
      }
    });

    this.paymentService.getAverages(this.avgMonths(), serviceIdsParam).subscribe({
      next: (data) => this.averages.set(data.averages),
      error: () => {}
    });
  }

  toggleServiceFilter(serviceId: number): void {
    const current = this.selectedServiceIds();
    if (current.includes(serviceId)) {
      this.selectedServiceIds.set(current.filter(id => id !== serviceId));
    } else {
      this.selectedServiceIds.set([...current, serviceId]);
    }
    this.loadData();
  }

  selectAll(): void {
    this.selectedServiceIds.set([]);
    this.loadData();
  }

  onFilterChange(): void {
    this.loadData();
  }

  formatMonth(yearMonth: string): string {
    const [year, month] = yearMonth.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('es-CL', { month: 'short', year: 'numeric' });
  }

  private getCurrentYearMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  private getMonthsAgo(n: number): string {
    const d = new Date();
    d.setMonth(d.getMonth() - n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
}
