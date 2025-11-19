import { Component, signal, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PwaUpdateService } from './core/services/pwa-update.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('frontend');
  private pwaUpdateService = inject(PwaUpdateService);

  ngOnInit(): void {
    // Inicializar servicio de actualizaciones automáticas
    this.pwaUpdateService.init();
  }
}
