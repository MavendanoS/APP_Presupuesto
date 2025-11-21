import { Component, Input, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

export interface WaterfallDataPoint {
  label: string;
  value: number;
  color?: string;
  isSubtotal?: boolean;
  categories?: Array<{ name: string; total: number }>;
}

@Component({
  selector: 'app-waterfall-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chart-container" [style.height.px]="height">
      <canvas #chartCanvas></canvas>
    </div>
  `,
  styles: [`
    .chart-container {
      position: relative;
      width: 100%;
    }
  `]
})
export class WaterfallChartComponent implements AfterViewInit, OnChanges {
  @Input() data: WaterfallDataPoint[] = [];
  @Input() height: number = 400;
  @Input() title?: string;

  @ViewChild('chartCanvas', { static: false }) chartCanvas?: ElementRef<HTMLCanvasElement>;

  private chart?: Chart;

  ngAfterViewInit(): void {
    this.createChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && this.chart) {
      this.updateChart();
    }
  }

  private createChart(): void {
    if (!this.chartCanvas) return;

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    // Calcular valores acumulados y floating bars
    const processedData = this.processWaterfallData();

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: processedData.labels,
        datasets: [
          {
            label: 'Invisible (base)',
            data: processedData.bases,
            backgroundColor: 'transparent',
            borderColor: 'transparent',
            borderWidth: 0
          },
          {
            label: 'Valores',
            data: processedData.values,
            backgroundColor: processedData.colors,
            borderColor: processedData.borderColors,
            borderWidth: 2,
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: !!this.title,
            text: this.title || ''
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                if (context.datasetIndex === 1) {
                  const dataPoint = this.data[context.dataIndex];
                  const absValue = Math.abs(dataPoint.value);
                  const lines: string[] = [];

                  // Línea principal con el total
                  lines.push(`${context.label}: $${absValue.toLocaleString('es-CL', { maximumFractionDigits: 0 })}`);

                  // Si tiene categorías, mostrar el desglose
                  if (dataPoint.categories && dataPoint.categories.length > 0) {
                    lines.push(''); // Línea en blanco
                    lines.push('Desglose:');
                    dataPoint.categories.forEach(cat => {
                      lines.push(`  • ${cat.name}: $${cat.total.toLocaleString('es-CL', { maximumFractionDigits: 0 })}`);
                    });
                  }

                  return lines;
                }
                return '';
              }
            }
          }
        },
        scales: {
          x: {
            stacked: true,
            grid: {
              display: false
            }
          },
          y: {
            stacked: true,
            beginAtZero: true,
            ticks: {
              callback: (value) => {
                return '$' + (value as number).toLocaleString('es-CL', { maximumFractionDigits: 0 });
              }
            }
          }
        }
      }
    };

    this.chart = new Chart(ctx, config);
  }

  private processWaterfallData() {
    const labels: string[] = [];
    const bases: number[] = [];
    const values: number[] = [];
    const colors: string[] = [];
    const borderColors: string[] = [];

    let runningTotal = 0;

    this.data.forEach((point, index) => {
      labels.push(point.label);

      if (index === 0) {
        // Primer valor (normalmente ingresos) - empieza desde 0
        bases.push(0);
        values.push(point.value);
        colors.push(point.color || '#10B981'); // Verde para ingresos
        borderColors.push(point.color || '#059669');
        runningTotal = point.value;
      } else if (point.isSubtotal) {
        // Subtotal - muestra el total acumulado
        bases.push(0);
        values.push(runningTotal);
        colors.push('#6B7280'); // Gris para subtotales
        borderColors.push('#4B5563');
      } else {
        // Valores negativos (gastos) - flotan desde el total anterior
        const absValue = Math.abs(point.value);
        bases.push(runningTotal - absValue);
        values.push(absValue);
        colors.push(point.color || '#EF4444'); // Rojo para gastos
        borderColors.push(point.color ? this.darkenColor(point.color) : '#DC2626');
        runningTotal -= absValue;
      }
    });

    return { labels, bases, values, colors, borderColors };
  }

  private darkenColor(hex: string): string {
    // Oscurecer un color hex en un 20%
    const rgb = parseInt(hex.slice(1), 16);
    const r = Math.max(0, ((rgb >> 16) & 0xff) * 0.8);
    const g = Math.max(0, ((rgb >> 8) & 0xff) * 0.8);
    const b = Math.max(0, (rgb & 0xff) * 0.8);
    return '#' + ((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b)).toString(16).slice(1);
  }

  private updateChart(): void {
    if (!this.chart) return;

    const processedData = this.processWaterfallData();

    this.chart.data.labels = processedData.labels;
    this.chart.data.datasets[0].data = processedData.bases;
    this.chart.data.datasets[1].data = processedData.values;
    (this.chart.data.datasets[1] as any).backgroundColor = processedData.colors;
    (this.chart.data.datasets[1] as any).borderColor = processedData.borderColors;

    this.chart.update();
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
    }
  }
}
