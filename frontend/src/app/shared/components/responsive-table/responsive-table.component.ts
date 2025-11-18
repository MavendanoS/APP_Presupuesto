import { Component, Input, Output, EventEmitter, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  mobileLabel?: string; // Label para vista mobile
}

@Component({
  selector: 'app-responsive-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './responsive-table.component.html',
  styleUrls: ['./responsive-table.component.scss']
})
export class ResponsiveTableComponent {
  @Input() columns: TableColumn[] = [];
  @Input() data: any[] = [];
  @Input() loading: boolean = false;
  @Input() emptyMessage: string = 'No hay datos para mostrar';
  @Input() actionsTemplate?: TemplateRef<any>;

  @Output() rowClick = new EventEmitter<any>();
  @Output() sort = new EventEmitter<{ column: string; direction: 'asc' | 'desc' }>();

  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  onSort(column: TableColumn): void {
    if (!column.sortable) return;

    if (this.sortColumn === column.key) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column.key;
      this.sortDirection = 'asc';
    }

    this.sort.emit({ column: column.key, direction: this.sortDirection });
  }

  onRowClick(row: any): void {
    this.rowClick.emit(row);
  }

  getSortIcon(column: TableColumn): string {
    if (!column.sortable) return '';
    if (this.sortColumn !== column.key) return 'bi-arrow-down-up';
    return this.sortDirection === 'asc' ? 'bi-arrow-up' : 'bi-arrow-down';
  }

  getValue(row: any, key: string): any {
    return key.split('.').reduce((obj, k) => obj?.[k], row);
  }
}
