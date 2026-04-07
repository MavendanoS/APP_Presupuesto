import { Component, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType, Plugin } from 'chart.js';

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
  @Input() showTotalLabels: boolean = false;
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  public chartType: 'bar' = 'bar';

  // Plugin inline para mostrar totales sobre cada barra apilada
  public totalLabelsPlugin: Plugin<'bar'> = {
    id: 'totalLabels',
    afterDatasetsDraw: (chart) => {
      if (!this.showTotalLabels || !this.stacked) return;

      const ctx = chart.ctx;
      const datasets = chart.data.datasets;
      const meta0 = chart.getDatasetMeta(0);
      if (!meta0 || meta0.data.length === 0) return;

      const numBars = meta0.data.length;

      for (let i = 0; i < numBars; i++) {
        let total = 0;
        let topY = Infinity;
        let barX = 0;

        for (let d = 0; d < datasets.length; d++) {
          const meta = chart.getDatasetMeta(d);
          if (meta.hidden) continue;
          const value = (datasets[d].data[i] as number) || 0;
          total += value;
          const bar = meta.data[i];
          if (bar) {
            barX = bar.x;
            topY = Math.min(topY, bar.y);
          }
        }

        if (total > 0) {
          ctx.save();
          ctx.fillStyle = '#333';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(this.formatCurrency(total), barX, topY - 4);
          ctx.restore();
        }
      }
    }
  };

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
