import { Component, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, Plugin } from 'chart.js';

/**
 * Punto del waterfall.
 * - type 'total': barra solida desde 0 (ej: ingresos iniciales, saldo final)
 * - type 'positive': sube respecto al cumulativo anterior
 * - type 'negative': baja respecto al cumulativo anterior
 */
export interface WaterfallStep {
  label: string;
  value: number;          // siempre en valor absoluto positivo
  type: 'total' | 'positive' | 'negative';
  color?: string;         // color personalizado (sobreescribe el default)
}

@Component({
  selector: 'app-waterfall-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './waterfall-chart.component.html',
  styleUrls: ['./waterfall-chart.component.scss']
})
export class WaterfallChartComponent implements OnChanges {
  @Input() steps: WaterfallStep[] = [];
  @Input() title?: string;
  @Input() height: number = 320;
  @Input() showValues: boolean = true;
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  public chartType: 'bar' = 'bar';

  // Plugin para dibujar etiquetas con el monto sobre cada barra
  public valueLabelsPlugin: Plugin<'bar'> = {
    id: 'waterfallValueLabels',
    afterDatasetsDraw: (chart) => {
      if (!this.showValues) return;

      const ctx = chart.ctx;
      const meta = chart.getDatasetMeta(0);
      if (!meta || meta.data.length === 0) return;

      ctx.save();
      ctx.fillStyle = '#212529';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';

      meta.data.forEach((bar, i) => {
        const step = this.steps[i];
        if (!step) return;

        const sign = step.type === 'negative' ? '-' : '';
        const text = `${sign}${this.formatCurrency(step.value)}`;

        const anyBar = bar as any;
        const topY = Math.min(anyBar.y, anyBar.base);
        ctx.fillText(text, anyBar.x, topY - 4);
      });

      ctx.restore();
    }
  };

  // Plugin para dibujar lineas conectoras entre barras (look clasico de waterfall)
  public connectorLinesPlugin: Plugin<'bar'> = {
    id: 'waterfallConnectors',
    afterDatasetsDraw: (chart) => {
      const ctx = chart.ctx;
      const meta = chart.getDatasetMeta(0);
      if (!meta || meta.data.length < 2) return;

      ctx.save();
      ctx.strokeStyle = '#9ca3af';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;

      for (let i = 0; i < meta.data.length - 1; i++) {
        const current = meta.data[i] as any;
        const next = meta.data[i + 1] as any;
        if (!current || !next) continue;

        const currentTop = Math.min(current.y, current.base);
        const currentRight = current.x + (current.width || 0) / 2;
        const nextLeft = next.x - (next.width || 0) / 2;

        // La conexion sale del extremo superior (o el lado donde "termina" la barra)
        const stepCurrent = this.steps[i];
        const yCurrent = stepCurrent?.type === 'negative' ? current.base : current.y;

        ctx.beginPath();
        ctx.moveTo(currentRight, yCurrent);
        ctx.lineTo(nextLeft, yCurrent);
        ctx.stroke();
      }

      ctx.restore();
    }
  };

  public chartData: ChartData<'bar'> = {
    labels: [],
    datasets: []
  };

  public chartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: { top: 24 }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => {
            const step = this.steps[context.dataIndex];
            if (!step) return '';
            const sign = step.type === 'negative' ? '-' : '';
            return `${step.label}: ${sign}${this.formatCurrency(step.value)}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 11 } }
      },
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => this.formatCurrency(Number(value))
        }
      }
    }
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['steps']) {
      this.updateChartData();
    }
  }

  private updateChartData(): void {
    const labels = this.steps.map(s => s.label);

    const data: [number, number][] = [];
    const backgroundColors: string[] = [];

    let cumulative = 0;
    let cumulativeInitialized = false;

    for (const step of this.steps) {
      let bar: [number, number];
      let color: string;

      if (step.type === 'total') {
        bar = [0, step.value];
        cumulative = step.value;
        cumulativeInitialized = true;
        color = step.color || (step.value >= 0 ? '#0d6efd' : '#dc3545');
      } else if (step.type === 'positive') {
        const start = cumulativeInitialized ? cumulative : 0;
        const end = start + step.value;
        bar = [start, end];
        cumulative = end;
        cumulativeInitialized = true;
        color = step.color || '#198754';
      } else {
        const start = cumulativeInitialized ? cumulative : 0;
        const end = start - step.value;
        bar = [end, start];
        cumulative = end;
        cumulativeInitialized = true;
        color = step.color || '#dc3545';
      }

      data.push(bar);
      backgroundColors.push(color);
    }

    this.chartData = {
      labels,
      datasets: [
        {
          label: this.title || 'Waterfall',
          data: data as any,
          backgroundColor: backgroundColors,
          borderColor: backgroundColors,
          borderWidth: 0,
          borderRadius: 4,
          borderSkipped: false
        }
      ]
    };

    this.chart?.update();
  }

  private formatCurrency(value: number): string {
    const rounded = Math.round(Math.abs(value));
    const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `$${formatted}`;
  }
}
