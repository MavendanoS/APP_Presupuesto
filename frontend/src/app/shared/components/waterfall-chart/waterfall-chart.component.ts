import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { TranslocoPipe } from '@jsverse/transloco';
import { ChartConfiguration, ChartData, Plugin } from 'chart.js';

/**
 * Punto del waterfall.
 * - type 'total': barra solida desde 0 (ej: ingresos iniciales, saldo final)
 * - type 'positive': sube respecto al cumulativo anterior
 * - type 'negative': baja respecto al cumulativo anterior
 */
export interface WaterfallStep {
  label: string;
  value: number;          // 'total': valor con signo. 'positive'/'negative': magnitud del cambio
                          // (si viene negativa, el cambio se invierte, ej: pendientes < 0)
  type: 'total' | 'positive' | 'negative';
  color?: string;         // color personalizado (sobreescribe el default)
}

@Component({
  selector: 'app-waterfall-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective, TranslocoPipe],
  templateUrl: './waterfall-chart.component.html',
  styleUrls: ['./waterfall-chart.component.scss']
})
export class WaterfallChartComponent implements OnChanges {
  @Input() steps: WaterfallStep[] = [];
  @Input() title?: string;
  @Input() height: number = 320;
  @Input() showValues: boolean = true;

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

      meta.data.forEach((bar, i) => {
        const step = this.steps[i];
        if (!step) return;

        const signedValue = this.getSignedValue(step);
        const text = this.formatCurrency(signedValue);

        const anyBar = bar as any;
        if (step.type === 'total' && signedValue < 0) {
          // Barra total negativa: etiqueta bajo la barra
          ctx.textBaseline = 'top';
          ctx.fillText(text, anyBar.x, Math.max(anyBar.y, anyBar.base) + 4);
        } else {
          ctx.textBaseline = 'bottom';
          ctx.fillText(text, anyBar.x, Math.min(anyBar.y, anyBar.base) - 4);
        }
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

        const currentRight = current.x + (current.width || 0) / 2;
        const nextLeft = next.x - (next.width || 0) / 2;

        // La conexión sale del valor acumulado donde "termina" la barra actual
        const yCurrent = this.cumulativeEnds[i] !== undefined
          ? chart.scales['y'].getPixelForValue(this.cumulativeEnds[i])
          : current.y;

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
            return `${step.label}: ${this.formatCurrency(this.getSignedValue(step))}`;
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

  /** Valor acumulado al final de cada barra (para las líneas conectoras) */
  private cumulativeEnds: number[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['steps']) {
      this.updateChartData();
    }
  }

  private updateChartData(): void {
    const labels = this.steps.map(s => s.label);

    const data: [number, number][] = [];
    const backgroundColors: string[] = [];

    const cumulativeEnds: number[] = [];
    let cumulative = 0;
    let cumulativeInitialized = false;

    for (const step of this.steps) {
      let bar: [number, number];
      let color: string;

      if (step.type === 'total') {
        bar = step.value >= 0 ? [0, step.value] : [step.value, 0];
        cumulative = step.value;
        cumulativeInitialized = true;
        color = step.color || (step.value >= 0 ? '#0d6efd' : '#dc3545');
      } else if (step.type === 'positive') {
        const start = cumulativeInitialized ? cumulative : 0;
        const end = start + step.value;
        bar = [Math.min(start, end), Math.max(start, end)];
        cumulative = end;
        cumulativeInitialized = true;
        color = step.color || '#198754';
      } else {
        const start = cumulativeInitialized ? cumulative : 0;
        const end = start - step.value;
        bar = [Math.min(start, end), Math.max(start, end)];
        cumulative = end;
        cumulativeInitialized = true;
        color = step.color || '#dc3545';
      }

      data.push(bar);
      backgroundColors.push(color);
      cumulativeEnds.push(cumulative);
    }

    this.cumulativeEnds = cumulativeEnds;

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
    // ng2-charts detecta el cambio de referencia de [data] y actualiza el gráfico
  }

  /** Valor con signo que representa el paso (negativo = resta) */
  private getSignedValue(step: WaterfallStep): number {
    return step.type === 'negative' ? -step.value : step.value;
  }

  /** Formato CLP conservando el signo: -$1.234 */
  private formatCurrency(value: number): string {
    const rounded = Math.round(value);
    const formatted = Math.abs(rounded).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${rounded < 0 ? '-' : ''}$${formatted}`;
  }
}
