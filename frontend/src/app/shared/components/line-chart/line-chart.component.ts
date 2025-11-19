import { Component, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';

export interface LineChartDataset {
  label: string;
  data: number[];
  borderColor?: string;
  backgroundColor?: string;
}

@Component({
  selector: 'app-line-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './line-chart.component.html',
  styleUrls: ['./line-chart.component.scss']
})
export class LineChartComponent implements OnChanges {
  @Input() datasets: LineChartDataset[] = [];
  @Input() labels: string[] = [];
  @Input() title?: string;
  @Input() height: number = 300;
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  public chartType: 'line' = 'line';

  public chartData: ChartData<'line'> = {
    labels: [],
    datasets: []
  };

  public chartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          padding: 15,
          font: {
            size: 12
          },
          usePointStyle: true
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            const value = context.parsed['y'] as number;
            const formatted = this.formatCurrency(value);
            return `${label}: ${formatted}`;
          }
        }
      },
      title: {
        display: false
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => {
            return this.formatCurrency(Number(value));
          }
        }
      }
    }
  };

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['datasets'] || changes['labels']) && this.labels.length > 0) {
      this.updateChartData();
    }
  }

  private updateChartData(): void {
    const defaultColors = [
      { border: '#10B981', background: 'rgba(16, 185, 129, 0.1)' }, // Green
      { border: '#EF4444', background: 'rgba(239, 68, 68, 0.1)' },   // Red
      { border: '#3B82F6', background: 'rgba(59, 130, 246, 0.1)' },  // Blue
      { border: '#F59E0B', background: 'rgba(245, 158, 11, 0.1)' },  // Orange
      { border: '#8B5CF6', background: 'rgba(139, 92, 246, 0.1)' },  // Purple
    ];

    this.chartData = {
      labels: this.labels,
      datasets: this.datasets.map((dataset, index) => ({
        label: dataset.label,
        data: dataset.data,
        borderColor: dataset.borderColor || defaultColors[index % defaultColors.length].border,
        backgroundColor: dataset.backgroundColor || defaultColors[index % defaultColors.length].background,
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6
      }))
    };

    this.chart?.update();
  }

  private formatCurrency(value: number): string {
    const rounded = Math.round(value);
    const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `$${formatted}`;
  }
}
