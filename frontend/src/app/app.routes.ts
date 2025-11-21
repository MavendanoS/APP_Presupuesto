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
    path: 'expenses',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./expenses/expense-list/expense-list.component').then(m => m.ExpenseListComponent)
      },
      {
        path: 'new',
        loadComponent: () => import('./expenses/expense-form/expense-form.component').then(m => m.ExpenseFormComponent)
      },
      {
        path: 'edit/:id',
        loadComponent: () => import('./expenses/expense-edit/expense-edit.component').then(m => m.ExpenseEditComponent)
      }
    ]
  },
  {
    path: 'income',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./income/income-list/income-list').then(m => m.IncomeListComponent)
      },
      {
        path: 'new',
        loadComponent: () => import('./income/income-form/income-form.component').then(m => m.IncomeFormComponent)
      },
      {
        path: 'edit/:id',
        loadComponent: () => import('./income/income-form/income-form.component').then(m => m.IncomeFormComponent)
      }
    ]
  },
  {
    path: 'categories',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./categories/category-list/category-list').then(m => m.CategoryListComponent)
      },
      {
        path: 'new',
        loadComponent: () => import('./categories/category-form/category-form').then(m => m.CategoryFormComponent)
      },
      {
        path: 'edit/:id',
        loadComponent: () => import('./categories/category-form/category-form').then(m => m.CategoryFormComponent)
      }
    ]
  },
  {
    path: 'analytics',
    canActivate: [authGuard],
    loadComponent: () => import('./analytics/analytics-view/analytics-view').then(m => m.AnalyticsViewComponent)
  },
  {
    path: 'savings',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./savings/savings-list/savings-list').then(m => m.SavingsListComponent)
      },
      {
        path: 'new',
        loadComponent: () => import('./savings/savings-form/savings-form').then(m => m.SavingsFormComponent)
      },
      {
        path: 'edit/:id',
        loadComponent: () => import('./savings/savings-form/savings-form').then(m => m.SavingsFormComponent)
      },
      {
        path: ':id',
        loadComponent: () => import('./savings/savings-detail/savings-detail').then(m => m.SavingsDetailComponent)
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
