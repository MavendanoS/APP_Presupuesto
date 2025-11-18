import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="loading-container" [class.fullscreen]="fullscreen">
      <div class="spinner-border" [class]="'text-' + color" role="status">
        <span class="visually-hidden">{{ message }}</span>
      </div>
      @if (message) {
        <p class="mt-3 mb-0">{{ message }}</p>
      }
    </div>
  `,
  styles: [`
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;

      &.fullscreen {
        min-height: 50vh;
      }

      .spinner-border {
        width: 3rem;
        height: 3rem;
      }

      p {
        color: #6c757d;
        font-size: 0.875rem;
      }
    }
  `]
})
export class LoadingComponent {
  @Input() message: string = 'Cargando...';
  @Input() color: string = 'primary';
  @Input() fullscreen: boolean = false;
}
