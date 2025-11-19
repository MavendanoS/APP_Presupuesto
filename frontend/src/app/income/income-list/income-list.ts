import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';

@Component({
  selector: 'app-income-list',
  imports: [CommonModule, NavbarComponent],
  templateUrl: './income-list.html',
  styleUrl: './income-list.scss',
})
export class IncomeListComponent {

}
