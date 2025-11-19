import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';

@Component({
  selector: 'app-category-list',
  imports: [CommonModule, NavbarComponent],
  templateUrl: './category-list.html',
  styleUrl: './category-list.scss',
})
export class CategoryListComponent {

}
