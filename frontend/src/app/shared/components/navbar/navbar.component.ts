import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { AuthService } from '../../../core/services/auth.service';
import { IndicatorsService } from '../../../core/services/indicators.service';
import { LocaleService } from '../../../core/services/locale.service';
import { APP_VERSION } from '../../../core/version';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslocoModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {
  isMenuOpen = false;
  appVersion = APP_VERSION;

  private localeService = inject(LocaleService);

  navLinks = [
    { path: '/dashboard', translationKey: 'nav.dashboard', icon: 'bi-house', exact: false },
    { path: '/incomes', translationKey: 'nav.incomes', icon: 'bi-cash-coin', exact: false },
    { path: '/history', translationKey: 'nav.history', icon: 'bi-clock-history', exact: true },
    { path: '/history/incomes', translationKey: 'nav.incomeHistory', icon: 'bi-graph-up', exact: true },
    { path: '/services', translationKey: 'nav.services', icon: 'bi-gear', exact: false }
  ];

  // Indicadores (valores en CLP con 2 decimales, formato según idioma activo)
  dolarFormatted = computed(() => this.formatIndicator(this.indicatorsService.dolar()));
  ufFormatted = computed(() => this.formatIndicator(this.indicatorsService.uf()));

  constructor(
    private authService: AuthService,
    public indicatorsService: IndicatorsService
  ) {}

  get user() {
    return this.authService.currentUser;
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu(): void {
    this.isMenuOpen = false;
  }

  private formatIndicator(value: number | null): string | null {
    if (value === null || value === undefined) return null;
    return new Intl.NumberFormat(this.localeService.locale(), {
      style: 'currency',
      currency: 'CLP',
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  logout(): void {
    this.authService.logout();
    this.closeMenu();
  }
}
