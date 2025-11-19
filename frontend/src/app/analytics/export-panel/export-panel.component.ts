import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnalyticsService } from '../../core/services/analytics.service';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';

@Component({
  selector: 'app-export-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, ErrorMessageComponent],
  templateUrl: './export-panel.component.html',
  styleUrl: './export-panel.component.scss'
})
export class ExportPanelComponent {
  exportType = signal<'all' | 'expenses' | 'income'>('all');
  startDate = signal(this.getMonthStart());
  endDate = signal(this.getMonthEnd());
  exporting = signal(false);
  error = signal<string | null>(null);

  constructor(private analyticsService: AnalyticsService) {}

  exportCSV(): void {
    this.exporting.set(true);
    this.error.set(null);

    this.analyticsService.exportCSV({
      start_date: this.startDate(),
      end_date: this.endDate(),
      type: this.exportType()
    }).subscribe({
      next: (blob) => {
        this.downloadFile(blob, `export_${this.exportType()}_${new Date().getTime()}.csv`);
        this.exporting.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Error al exportar a CSV');
        this.exporting.set(false);
      }
    });
  }

  exportExcel(): void {
    this.exporting.set(true);
    this.error.set(null);

    this.analyticsService.exportExcel({
      start_date: this.startDate(),
      end_date: this.endDate(),
      type: this.exportType()
    }).subscribe({
      next: (blob) => {
        this.downloadFile(blob, `export_${this.exportType()}_${new Date().getTime()}.xlsx`);
        this.exporting.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Error al exportar a Excel');
        this.exporting.set(false);
      }
    });
  }

  onStartDateChange(value: string): void {
    this.startDate.set(value);
  }

  onEndDateChange(value: string): void {
    this.endDate.set(value);
  }

  changeExportType(type: 'all' | 'expenses' | 'income'): void {
    this.exportType.set(type);
  }

  private downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  private getMonthStart(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  }

  private getMonthEnd(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const day = String(lastDay).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
