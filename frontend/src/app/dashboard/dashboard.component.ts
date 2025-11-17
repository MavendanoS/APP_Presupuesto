import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../core/services/auth.service';
import { ClpCurrencyPipe } from '../shared/pipes/clp-currency.pipe';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ClpCurrencyPipe],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  user = this.authService.currentUser;
  loading = signal(true);

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    // Simulación de carga
    setTimeout(() => {
      this.loading.set(false);
    }, 500);
  }

  logout(): void {
    this.authService.logout();
  }
}
