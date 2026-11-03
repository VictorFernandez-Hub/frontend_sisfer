import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { extraerMensajeError } from '../../../shared/utils/http-error.util';
import { NotificationService } from '../../../core/services/notification.service';
import { OpcionVenta, VentaDetalle } from '../modelos/venta.model';
import { VentaService } from '../servicios/venta.service';
import { DatosDialogo, VentaDialogoComponent } from '../venta-dialogo/venta-dialogo.component';
import { claseEstado, soles } from '../venta-reglas';

@Component({
  selector: 'app-venta-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule, VentaDialogoComponent],
  templateUrl: './venta-detalle.component.html',
  styleUrls: ['./venta-detalle.component.css']
})
export class VentaDetalleComponent {
  private readonly ventaService = inject(VentaService);
  private readonly notificacion = inject(NotificationService);

  venta = input.required<VentaDetalle>();
  tiposComp = input.required<OpcionVenta[]>();
  puedeRegistrar = input<boolean>(false);
  esAdminNegocio = input<boolean>(false);

  cerrar = output<void>();
  editar = output<VentaDetalle>();
  confirmada = output<VentaDetalle>();
  anulada = output<VentaDetalle>();

  guardando = signal<boolean>(false);
  descargando = signal<boolean>(false);
  error = signal<string>('');
  dialogo = signal<DatosDialogo | null>(null);
  idTipoComp: number | null = null;

  readonly claseEstado = claseEstado;

  // Una venta anulada en borrador nunca emitió comprobante
  tienePdf = computed(() => !!this.venta().comprobante || this.venta().estado === 'BORRADOR');

  puedeAnular = computed(() => {
    if (!this.puedeRegistrar()) return false;
    if (this.venta().estado === 'BORRADOR') return true;
    return this.venta().estado === 'CONFIRMADA' && this.esAdminNegocio();
  });

  constructor() {
    // Con RUC se sugiere factura; con DNI, boleta
    effect(() => {
      const tipo = this.venta().tipoDocCliente === 'RUC' ? 'FAC' : 'BOL';
      this.idTipoComp = this.tiposComp().find(t => t.codigo === tipo)?.id ?? null;
    });
  }

  pedirConfirmacion(): void {
    const d = this.venta();
    this.error.set('');
    if (!this.idTipoComp) {
      this.error.set('Seleccione boleta o factura.');
      return;
    }
    this.dialogo.set({
      titulo: `¿Cobrar la venta ${d.numero}?`,
      mensaje: 'Se descontará el stock y se emitirá el comprobante.',
      filas: [
        { etiqueta: 'Cliente', valor: d.cliente },
        { etiqueta: 'Comprobante', valor: this.tiposComp().find(t => t.id === Number(this.idTipoComp))?.nombre ?? '' },
        { etiqueta: 'Pago', valor: d.metodo },
        { etiqueta: 'Total', valor: soles(d.totTotal) }
      ],
      textoBoton: `Cobrar ${soles(d.totTotal)}`,
      claseBoton: 'btn-success',
      accion: 'confirmar'
    });
  }

  pedirAnulacion(): void {
    const d = this.venta();
    this.error.set('');
    const confirmada = d.estado === 'CONFIRMADA';
    this.dialogo.set({
      titulo: `¿Anular la venta ${d.numero}?`,
      mensaje: confirmada
        ? `Los productos volverán al stock y ${d.comprobante?.numeroCompleto ?? 'el comprobante'} quedará anulado.`
        : 'Está en borrador: todavía no movió stock.',
      pedirMotivo: confirmada,
      textoBoton: 'Anular venta',
      claseBoton: 'btn-danger',
      accion: 'anular'
    });
  }

  alAceptarDialogo(motivo: string): void {
    const accion = this.dialogo()?.accion;
    this.dialogo.set(null);
    if (accion === 'confirmar') {
      this.confirmar();
    } else if (accion === 'anular') {
      this.anular(motivo);
    }
  }

  private confirmar(): void {
    this.guardando.set(true);
    this.ventaService.confirmar(this.venta().idVenta, Number(this.idTipoComp)).subscribe({
      next: (v) => {
        this.guardando.set(false);
        this.confirmada.emit(v);
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        this.error.set(extraerMensajeError(err, 'No se pudo confirmar la venta.'));
      }
    });
  }

  private anular(motivo: string): void {
    this.guardando.set(true);
    this.ventaService.anular(this.venta().idVenta, motivo).subscribe({
      next: (v) => {
        this.guardando.set(false);
        this.anulada.emit(v);
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        this.error.set(extraerMensajeError(err, 'No se pudo anular la venta.'));
      }
    });
  }

  descargarPdf(): void {
    const d = this.venta();
    this.descargando.set(true);
    this.ventaService.guardarPdf(d.idVenta, d.comprobante?.numeroCompleto, d.numero).subscribe({
      next: () => this.descargando.set(false),
      error: (err: HttpErrorResponse) => {
        this.descargando.set(false);
        this.notificacion.mostrar(extraerMensajeError(err, 'No se pudo descargar el comprobante.'), 'error');
      }
    });
  }
}
