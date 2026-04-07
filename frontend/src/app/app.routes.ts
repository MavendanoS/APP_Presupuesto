import { Routes } from '@angular/router';
import { authGuard, publicGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    canActivate: [publicGuard],
    children: [
      {
        path: 'login',
        loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent)
      },
      {
        path: 'register',
        loadComponent: () => import('./auth/register/register.component').then(m => m.RegisterComponent)
      },
      {
        path: 'forgot-password',
        loadComponent: () => import('./auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent)
      },
      {
        path: 'reset-password',
        loadComponent: () => import('./auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent)
      },
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'history',
    canActivate: [authGuard],
    loadComponent: () => import('./history/payment-history/payment-history.component').then(m => m.PaymentHistoryComponent)
  },
  {
    path: 'services',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./services/service-list/service-list.component').then(m => m.ServiceListComponent)
      },
      {
        path: 'new',
        loadComponent: () => import('./services/service-form/service-form.component').then(m => m.ServiceFormComponent)
      },
      {
        path: 'edit/:id',
        loadComponent: () => import('./services/service-form/service-form.component').then(m => m.ServiceFormComponent)
      }
    ]
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./user/user-profile.component').then(m => m.UserProfileComponent)
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];
