import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { extraerMensajeError } from '../../../shared/utils/http-error.util';
import { CobroService, ConfigCobro, CuentaBanco, MetodoCobro } from '../servicios/cobro.service';

@Component({
  selector: 'app-cobros',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cobros.component.html',
  styleUrl: './cobros.component.css'
})
export class CobrosComponent implements OnInit {
  private readonly cobroService = inject(CobroService);

  celular = '';
  metodos = signal<MetodoCobro[]>([]);
  cuentas = signal<CuentaBanco[]>([]);
  aviso = signal('');
  error = signal('');

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cobroService.configuracion().subscribe({
      next: (datos: ConfigCobro) => {
        this.celular = datos.celular ?? '';
        this.metodos.set(datos.metodos ?? []);
        this.cuentas.set(datos.cuentas ?? []);
      },
      error: (err: HttpErrorResponse) => this.error.set(extraerMensajeError(err, 'No se pudieron leer los datos de cobro.'))
    });
  }

  guardarCelular(): void {
    this.error.set('');
    this.aviso.set('');
    this.cobroService.guardarCelular(this.celular.trim()).subscribe({
      next: () => this.aviso.set('El número de teléfono de la billetera digital fue actualizado.'),
      error: (err: HttpErrorResponse) => this.error.set(extraerMensajeError(err, 'No se pudo guardar el celular.'))
    });
  }

  guardarCuenta(cuenta: CuentaBanco): void {
    this.error.set('');
    this.aviso.set('');
    this.cobroService.guardarCuenta(cuenta).subscribe({
      next: () => this.aviso.set(`La cuenta del banco ${this.nombreBanco(cuenta.banco)} fue actualizada.`),
      error: (err: HttpErrorResponse) => this.error.set(extraerMensajeError(err, 'No se pudo guardar la cuenta.'))
    });
  }

  cambiarMetodo(metodo: MetodoCobro): void {
    if (metodo.codigo === 'EFECTIVO') return;
    const estado = metodo.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    this.cobroService.cambiarMetodo(metodo.id, estado).subscribe({
      next: () => {
        metodo.estado = estado;
        this.aviso.set(`${metodo.nombre} está ${estado === 'ACTIVO' ? 'activo' : 'inactivo'}.`);
      },
      error: (err: HttpErrorResponse) => this.error.set(extraerMensajeError(err, 'No se pudo cambiar el medio de pago.'))
    });
  }

  claseBanco(banco: string): string {
    return banco.toLowerCase();
  }

  nombreBanco(banco: string): string {
    if (banco === 'INTERBANK') return 'Interbank';
    if (banco === 'SCOTIABANK') return 'Scotiabank';
    return banco;
  }
}
