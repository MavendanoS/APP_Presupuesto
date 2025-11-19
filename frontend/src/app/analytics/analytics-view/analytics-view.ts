import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';

@Component({
  selector: 'app-analytics-view',
  imports: [CommonModule, NavbarComponent],
  templateUrl: './analytics-view.html',
  styleUrl: './analytics-view.scss',
})
export class AnalyticsViewComponent {

}
