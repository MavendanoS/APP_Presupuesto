import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {
  isMenuOpen = false;

  navLinks = [
    { path: '/dashboard', label: 'Dashboard', icon: 'bi-house' },
    { path: '/expenses', label: 'Gastos', icon: 'bi-wallet2' },
    { path: '/income', label: 'Ingresos', icon: 'bi-cash-stack' },
    { path: '/categories', label: 'Categorías', icon: 'bi-tags' },
    { path: '/savings', label: 'Ahorros', icon: 'bi-piggy-bank' },
    { path: '/analytics', label: 'Analytics', icon: 'bi-graph-up' }
  ];

  constructor(private authService: AuthService) {}

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
