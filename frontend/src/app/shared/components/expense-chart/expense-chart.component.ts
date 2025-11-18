import { Component, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { CategoryExpense } from '../../../core/models';

@Component({
  selector: 'app-expense-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './expense-chart.component.html',
  styleUrls: ['./expense-chart.component.scss']
})
export class ExpenseChartComponent implements OnChanges {
  @Input() categories: CategoryExpense[] = [];
  @Input() chartType: 'pie' | 'doughnut' | 'bar' = 'doughnut';
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  public chartData: ChartData = {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: [
        '#EF4444', // Red
        '#10B981', // Green
        '#F59E0B', // Orange
        '#3B82F6', // Blue
        '#8B5CF6', // Purple
        '#EC4899', // Pink
        '#14B8A6', // Teal
        '#F97316', // Orange-red
        '#6366F1', // Indigo
        '#84CC16', // Lime
      ] as any,
      borderWidth: 2,
      borderColor: '#fff'
    }] as any
  };

  public chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          padding: 15,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const formatted = this.formatCurrency(typeof value === 'number' ? value : (value as any).y || 0);
            const total = (context.dataset.data as number[]).reduce((a, b) => a + b, 0);
            const percentage = ((typeof value === 'number' ? value : (value as any).y || 0) / total * 100).toFixed(1);
            return `${label}: ${formatted} (${percentage}%)`;
          }
        }
      }
    }
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['categories'] && this.categories.length > 0) {
      this.updateChartData();
    }
  }

  private updateChartData(): void {
    const sortedCategories = [...this.categories].sort((a, b) => b.total - a.total);

    this.chartData = {
      labels: sortedCategories.map(c => c.category_name),
      datasets: [{
        data: sortedCategories.map(c => c.total),
        backgroundColor: this.chartData.datasets[0].backgroundColor as any,
        borderWidth: 2,
        borderColor: '#fff'
      }] as any
    };

    this.chart?.update();
  }

  private formatCurrency(value: number): string {
    const rounded = Math.round(value);
    const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `$${formatted}`;
  }
}
