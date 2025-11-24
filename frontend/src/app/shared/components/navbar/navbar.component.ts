import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { AuthService } from '../../../core/services/auth.service';
import { IndicatorsService } from '../../../core/services/indicators.service';
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

  navLinks = [
    { path: '/dashboard', translationKey: 'nav.dashboard', icon: 'bi-house' },
    { path: '/expenses', translationKey: 'nav.expenses', icon: 'bi-wallet2' },
    { path: '/income', translationKey: 'nav.income', icon: 'bi-cash-stack' },
    { path: '/categories', translationKey: 'nav.categories', icon: 'bi-tags' },
    { path: '/savings', translationKey: 'nav.savings', icon: 'bi-piggy-bank' },
    { path: '/analytics', translationKey: 'nav.analytics', icon: 'bi-graph-up' }
  ];

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

  logout(): void {
    this.authService.logout();
    this.closeMenu();
  }
}
