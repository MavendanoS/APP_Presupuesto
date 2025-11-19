import { Component, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';

export interface BarChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
}

@Component({
  selector: 'app-bar-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './bar-chart.component.html',
  styleUrls: ['./bar-chart.component.scss']
})
export class BarChartComponent implements OnChanges {
  @Input() datasets: BarChartDataset[] = [];
  @Input() labels: string[] = [];
  @Input() title?: string;
  @Input() height: number = 300;
  @Input() orientation: 'vertical' | 'horizontal' = 'vertical';
  @Input() stacked: boolean = false;
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  public chartType: 'bar' = 'bar';

  public chartData: ChartData<'bar'> = {
    labels: [],
    datasets: []
  };

  public chartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'x',
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
            const value = (context.parsed['y'] || context.parsed['x']) as number;
            const formatted = this.formatCurrency(value);
            return `${label}: ${formatted}`;
          }
        }
      }
    },
    scales: {
      x: {
        stacked: false,
        grid: {
          display: false
        }
      },
      y: {
        stacked: false,
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
    if ((changes['datasets'] || changes['labels'] || changes['orientation'] || changes['stacked']) && this.labels.length > 0) {
      this.updateChartData();
    }
  }

  private updateChartData(): void {
    const defaultColors = [
      '#3B82F6', // Blue
      '#EF4444', // Red
      '#10B981', // Green
      '#F59E0B', // Orange
      '#8B5CF6', // Purple
      '#EC4899', // Pink
      '#14B8A6', // Teal
      '#F97316'  // Orange-red
    ];

    // Update orientation
    if (this.chartOptions && this.chartOptions.indexAxis) {
      this.chartOptions.indexAxis = this.orientation === 'horizontal' ? 'y' : 'x';
    }

    // Update stacked mode
    if (this.chartOptions && this.chartOptions.scales) {
      this.chartOptions.scales['x'] = {
        ...this.chartOptions.scales['x'],
        stacked: this.stacked
      };
      this.chartOptions.scales['y'] = {
        ...this.chartOptions.scales['y'],
        stacked: this.stacked
      };
    }

    this.chartData = {
      labels: this.labels,
      datasets: this.datasets.map((dataset, index) => ({
        label: dataset.label,
        data: dataset.data,
        backgroundColor: dataset.backgroundColor || defaultColors[index % defaultColors.length],
        borderColor: dataset.borderColor || defaultColors[index % defaultColors.length],
        borderWidth: 0,
        borderRadius: 4
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
