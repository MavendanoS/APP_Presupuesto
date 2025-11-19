import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { TimeSeriesComponent } from '../time-series/time-series.component';
import { TrendsComponent } from '../trends/trends.component';
import { PredictionsComponent } from '../predictions/predictions.component';
import { ExportPanelComponent } from '../export-panel/export-panel.component';

@Component({
  selector: 'app-analytics-view',
  standalone: true,
  imports: [
    CommonModule,
    NavbarComponent,
    TimeSeriesComponent,
    TrendsComponent,
    PredictionsComponent,
    ExportPanelComponent
  ],
  templateUrl: './analytics-view.html',
  styleUrl: './analytics-view.scss',
})
export class AnalyticsViewComponent {
  activeTab = signal<'overview' | 'trends' | 'predictions' | 'export'>('overview');

  changeTab(tab: 'overview' | 'trends' | 'predictions' | 'export'): void {
    this.activeTab.set(tab);
  }
}
