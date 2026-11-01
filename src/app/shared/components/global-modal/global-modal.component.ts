import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-global-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './global-modal.component.html',
  styleUrls: ['./global-modal.component.css']
})
export class GlobalModalComponent {
  notificationService = inject(NotificationService);

  @Input() idModal: string = 'modalGlobal';
  @Input() titulo: string = '';
  @Input() textoBotonGuardar: string = 'Guardar';

  @Output() onGuardar = new EventEmitter<void>();

  public abrir(): void {
    const modalElement = document.getElementById(this.idModal);
    if (modalElement) {
      const modalInstance = (window as any).bootstrap?.Modal?.getOrCreateInstance(modalElement);
      modalInstance?.show();
    }
  }

  public cerrar(): void {
    const modalElement = document.getElementById(this.idModal);
    if (modalElement) {
      const modalInstance = (window as any).bootstrap?.Modal?.getInstance(modalElement);
      modalInstance?.hide();
    }
  }

  ejecutarGuardar(): void {
    this.onGuardar.emit();
  }

  @Output() onLimpiar = new EventEmitter<void>();

  ejecutarLimpiar() {
    this.onLimpiar.emit();
  }
}