import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-error-message',
  standalone: true,
  imports: [CommonModule, TranslocoPipe],
  template: `
    <div class="alert alert-danger alert-dismissible fade show" role="alert">
      <i class="bi bi-exclamation-triangle-fill me-2"></i>
      <strong>{{ 'common.error' | transloco }}:</strong> {{ message }}
      @if (dismissible) {
        <button type="button" class="btn-close" (click)="onDismiss()"></button>
      }
    </div>
  `,
  styles: [`
    .alert {
      margin-bottom: 1rem;
    }
  `]
})
export class ErrorMessageComponent {
  @Input() message: string = '';
  @Input() dismissible: boolean = true;
  @Output() dismissed = new EventEmitter<void>();

  onDismiss(): void {
    this.dismissed.emit();
  }
}
