import { Component, EventEmitter, Input, OnInit, Output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { extraerMensajeError } from '../../shared/utils/http-error.util';
import { redondear } from '../ventas/venta-reglas';
import { CajaService } from './caja.service';
import {
  CajaDetalle, CajaFila, DENOMINACIONES, EntregadorFondo, ROLES_CAJA, ROLES_CERRAR_AJENA, ROLES_SUPERVISAR_CAJA, TipoMovimiento
} from './caja.model';

type Pestana = 'turno' | 'historial';

/** Conteo de billetes y monedas: cantidad por denominación. */
class Conteo {
  porDenominacion: Record<string, number | null> = {};
  usarDenominaciones = false;
  montoDirecto: number | null = null;

  total(): number {
    if (!this.usarDenominaciones) return redondear(Number(this.montoDirecto) || 0);
    let suma = 0;
    for (const d of DENOMINACIONES) {
      suma += d * (Number(this.porDenominacion[String(d)]) || 0);
    }
    return redondear(suma);
  }

  vacio(): boolean {
    if (this.usarDenominaciones) return DENOMINACIONES.every(d => !this.porDenominacion[String(d)]);
    return this.montoDirecto === null || (this.montoDirecto as unknown) === '';
  }

  detalle(): string {
    if (!this.usarDenominaciones) return '';
    return DENOMINACIONES
      .filter(d => Number(this.porDenominacion[String(d)]) > 0)
      .map(d => `${this.porDenominacion[String(d)]} x S/ ${d.toFixed(2)}`)
      .join(', ');
  }
}

@Component({
  selector: 'app-caja',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './caja.component.html',
  styleUrl: './caja.component.css'
})
export class CajaComponent implements OnInit {
  private readonly cajaService = inject(CajaService);
  private readonly authService = inject(AuthService);
  private readonly notificacion = inject(NotificationService);

  // La caja vive dentro de Ventas: la pantalla de Ventas elige qué parte mostrar
  @Input() vistaInicial: Pestana = 'turno';
  @Output() abrio = new EventEmitter<CajaDetalle>();
  @Output() cerro = new EventEmitter<CajaDetalle>();
  @Output() irAVentas = new EventEmitter<void>();

  readonly DENOMINACIONES = DENOMINACIONES;
  readonly ahora = new Date();
  readonly trabajaConCaja = this.authService.tieneRol(ROLES_CAJA);
  readonly puedeSupervisar = this.authService.tieneRol(ROLES_SUPERVISAR_CAJA);
  readonly puedeCerrarAjena = this.authService.tieneRol(ROLES_CERRAR_AJENA);
  readonly cuenta = this.authService.usuarioActual;
  readonly puedeEntrar = this.trabajaConCaja || this.puedeSupervisar;

  pestana = signal<Pestana>('turno');
  cargando = signal(true);
  enviando = signal(false);
  error = signal('');

  // ------------------------------------------------ turno del usuario
  caja = signal<CajaDetalle | null>(null);
  fondoMaximo = signal(2000);
  // El arqueo recién cerrado se muestra hasta que el vendedor abre otra caja
  arqueo = signal<CajaDetalle | null>(null);

  // Apertura: solo el monto total y quién entregó ese dinero (el conteo por billetes queda para el cierre)
  montoApertura: number | null = null;
  idEntregadoPor: number | null = null;
  entregadores = signal<EntregadorFondo[]>([]);
  obsApertura = '';

  // ------------------------------------------------ movimientos
  movTipo: TipoMovimiento = 'INGRESO';
  movMonto: number | null = null;
  movMotivo = '';
  mostrarMovimiento = signal(false);

  // ------------------------------------------------ cierre (de la caja propia o de otra, si es administrador)
  cierreDe = signal<CajaDetalle | null>(null);
  cierre = new Conteo();
  obsCierre = '';
  confirmarCierre = signal(false);

  // ------------------------------------------------ historial
  historial = signal<CajaFila[]>([]);
  cargandoHistorial = signal(false);
  desde = '';
  hasta = '';
  filtroEstado = '';
  detalleHistorial = signal<CajaDetalle | null>(null);

  resumenHistorial = computed(() => {
    const cerradas = this.historial().filter(c => c.estado === 'CERRADA');
    return {
      abiertas: this.historial().length - cerradas.length,
      vendido: this.historial().reduce((s, c) => s + Number(c.totalVentas), 0),
      faltantes: cerradas.filter(c => Number(c.diferencia) < 0).length,
      sobrantes: cerradas.filter(c => Number(c.diferencia) > 0).length
    };
  });

  ngOnInit(): void {
    if (!this.puedeEntrar) return;
    if (this.trabajaConCaja) this.cargarEntregadores();
    this.pestana.set(this.trabajaConCaja ? this.vistaInicial : 'historial');
    if (this.pestana() === 'turno') {
      this.cargarActual();
    } else {
      this.cargando.set(false);
      this.cargarHistorial();
    }
  }

  elegirPestana(p: Pestana): void {
    this.pestana.set(p);
    if (p === 'historial') this.cargarHistorial();
    else this.cargarActual();
  }

  cargarActual(): void {
    this.cargando.set(true);
    this.cajaService.actual().subscribe({
      next: (r) => {
        this.caja.set(r.caja);
        this.fondoMaximo.set(Number(r.fondoMaximo) || 2000);
        this.error.set('');
        this.cargando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(extraerMensajeError(err, 'No se pudo consultar la caja.'));
        this.cargando.set(false);
      }
    });
  }

  // ------------------------------------------------ apertura

  private cargarEntregadores(): void {
    this.cajaService.entregadores().subscribe({
      next: (lista) => {
        this.entregadores.set(lista);
        // Lo normal es que el sencillo lo entregue el administrador del negocio: viene elegido
        if (this.idEntregadoPor === null) {
          this.idEntregadoPor = lista.find(e => e.codigoRol === 'ADMIN_NEGOCIO')?.idUsuario ?? null;
        }
      },
      error: (err: HttpErrorResponse) =>
        this.error.set(extraerMensajeError(err, 'No se pudo cargar la lista de quién entrega el fondo.'))
    });
  }

  aperturaVacia(): boolean {
    return this.montoApertura === null || (this.montoApertura as unknown) === '';
  }

  totalApertura(): number {
    return redondear(Number(this.montoApertura) || 0);
  }

  // Con fondo mayor que cero hay que indicar quién lo entregó
  pideEntregador(): boolean {
    return !this.aperturaVacia() && this.totalApertura() > 0;
  }

  errorApertura(): string {
    if (this.aperturaVacia()) return '';
    const monto = this.totalApertura();
    if (monto < 0) return 'El fondo no puede ser negativo.';
    if (monto > this.fondoMaximo()) return `El fondo no puede pasar de S/ ${this.fondoMaximo().toFixed(2)}.`;
    if (!this.dosDecimales(this.montoApertura)) return 'Use como máximo 2 decimales.';
    return '';
  }

  abrirCaja(): void {
    if (this.aperturaVacia()) {
      this.error.set('Indique con cuánto efectivo empieza el turno. Si no recibió sencillo, escriba 0.');
      return;
    }
    if (this.errorApertura()) return;
    if (this.pideEntregador() && this.idEntregadoPor === null) {
      this.error.set('Indique quién le entregó el fondo inicial.');
      return;
    }

    this.enviando.set(true);
    this.error.set('');
    const entrega = this.pideEntregador() ? Number(this.idEntregadoPor) : null;
    this.cajaService.abrir(this.totalApertura(), entrega, this.obsApertura.trim().slice(0, 200)).subscribe({
      next: (c) => {
        this.enviando.set(false);
        this.caja.set(c);
        this.arqueo.set(null);
        this.montoApertura = null;
        this.idEntregadoPor = this.entregadores().find(e => e.codigoRol === 'ADMIN_NEGOCIO')?.idUsuario ?? null;
        this.obsApertura = '';
        this.notificacion.mostrar(`Caja ${c.numero} abierta. Ya puede cobrar ventas.`, 'success');
        this.abrio.emit(c);
      },
      error: (err: HttpErrorResponse) => {
        this.enviando.set(false);
        this.error.set(extraerMensajeError(err, 'No se pudo abrir la caja.'));
        this.cargarActual();
      }
    });
  }

  // ------------------------------------------------ movimientos

  abrirMovimiento(tipo: TipoMovimiento): void {
    this.movTipo = tipo;
    this.movMonto = null;
    this.movMotivo = '';
    this.error.set('');
    this.mostrarMovimiento.set(true);
  }

  errorMovimiento(): string {
    if (this.movMonto === null) return '';
    const m = Number(this.movMonto);
    if (!(m > 0)) return 'El monto debe ser mayor que cero.';
    if (!this.dosDecimales(this.movMonto)) return 'Use como máximo 2 decimales.';
    const disponible = Number(this.caja()?.efectivoEsperado ?? 0);
    if (this.movTipo === 'EGRESO' && m > disponible) {
      return `En la caja debería haber S/ ${disponible.toFixed(2)}. No puede sacar más.`;
    }
    return '';
  }

  guardarMovimiento(): void {
    if (this.movMonto === null || this.errorMovimiento()) return;
    if (this.movMotivo.trim().length < 5) {
      this.error.set('Explique el motivo (mínimo 5 caracteres).');
      return;
    }
    this.enviando.set(true);
    this.error.set('');
    this.cajaService.registrarMovimiento(this.movTipo, redondear(Number(this.movMonto)), this.movMotivo.trim()).subscribe({
      next: (c) => {
        this.enviando.set(false);
        this.caja.set(c);
        this.mostrarMovimiento.set(false);
        this.notificacion.mostrar(this.movTipo === 'INGRESO' ? 'Entrada de efectivo registrada.' : 'Salida de efectivo registrada.', 'success');
      },
      error: (err: HttpErrorResponse) => {
        this.enviando.set(false);
        this.error.set(extraerMensajeError(err, 'No se pudo registrar el movimiento.'));
      }
    });
  }

  // ------------------------------------------------ cierre

  iniciarCierre(c: CajaDetalle): void {
    this.cierre = new Conteo();
    this.cierre.usarDenominaciones = true;
    this.obsCierre = '';
    this.confirmarCierre.set(false);
    this.error.set('');
    this.cierreDe.set(c);
  }

  // Un administrador cierra desde el historial la caja que otro vendedor dejó abierta
  cerrarAjena(fila: CajaFila): void {
    this.cajaService.obtener(fila.idCaja).subscribe({
      next: (c) => this.iniciarCierre(c),
      error: (err: HttpErrorResponse) =>
        this.notificacion.mostrar(extraerMensajeError(err, 'No se pudo abrir la caja.'), 'error')
    });
  }

  cancelarCierre(): void {
    this.cierreDe.set(null);
    this.confirmarCierre.set(false);
  }

  diferenciaCierre(): number {
    const c = this.cierreDe();
    if (!c) return 0;
    return redondear(this.cierre.total() - Number(c.efectivoEsperado));
  }

  errorCierre(): string {
    if (this.cierre.vacio()) return 'Cuente el efectivo de la caja. Si no hay nada, escriba 0.';
    if (this.cierre.total() < 0) return 'El efectivo contado no puede ser negativo.';
    if (!this.cierre.usarDenominaciones && !this.dosDecimales(this.cierre.montoDirecto)) return 'Use como máximo 2 decimales.';
    if (this.diferenciaCierre() !== 0 && this.obsCierre.trim().length < 10) {
      return `Explique el ${this.diferenciaCierre() > 0 ? 'sobrante' : 'faltante'} en la observación (mínimo 10 caracteres).`;
    }
    return '';
  }

  // Primer clic: revisa. Segundo clic: cierra (el cierre no se puede deshacer)
  cerrarCaja(): void {
    const c = this.cierreDe();
    if (!c || this.errorCierre()) return;
    if (!this.confirmarCierre()) {
      this.confirmarCierre.set(true);
      return;
    }
    const detalle = this.cierre.detalle();
    const obs = [this.obsCierre.trim(), detalle ? `Conteo: ${detalle}` : ''].filter(Boolean).join('. ');

    this.enviando.set(true);
    this.error.set('');
    this.cajaService.cerrar(c.idCaja, this.cierre.total(), obs.slice(0, 300)).subscribe({
      next: (cerrada) => {
        this.enviando.set(false);
        this.cierreDe.set(null);
        this.confirmarCierre.set(false);
        if (this.caja()?.idCaja === cerrada.idCaja) {
          this.caja.set(null);
          this.arqueo.set(cerrada);
        } else {
          this.detalleHistorial.set(cerrada);
        }
        this.notificacion.mostrar(`Caja ${cerrada.numero} cerrada.`, 'success');
        this.cerro.emit(cerrada);
        if (this.pestana() === 'historial') this.cargarHistorial();
      },
      error: (err: HttpErrorResponse) => {
        this.enviando.set(false);
        this.confirmarCierre.set(false);
        this.error.set(extraerMensajeError(err, 'No se pudo cerrar la caja.'));
      }
    });
  }

  // ------------------------------------------------ historial

  cargarHistorial(): void {
    if (this.desde && this.hasta && this.desde > this.hasta) {
      this.notificacion.mostrar('"Desde" no puede ser posterior a "Hasta".', 'error');
      return;
    }
    this.cargandoHistorial.set(true);
    this.cajaService.listar(this.desde, this.hasta, this.filtroEstado).subscribe({
      next: (lista) => {
        this.historial.set(lista);
        this.cargandoHistorial.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.cargandoHistorial.set(false);
        this.notificacion.mostrar(extraerMensajeError(err, 'No se pudo cargar el historial de cajas.'), 'error');
      }
    });
  }

  verDetalle(fila: CajaFila): void {
    this.cajaService.obtener(fila.idCaja).subscribe({
      next: (c) => this.detalleHistorial.set(c),
      error: (err: HttpErrorResponse) =>
        this.notificacion.mostrar(extraerMensajeError(err, 'No se pudo abrir la caja.'), 'error')
    });
  }

  esAjena(fila: CajaFila): boolean {
    return fila.usuario.toLowerCase() !== (this.cuenta() ?? '').toLowerCase();
  }

  // ------------------------------------------------ ayudas

  imprimir(): void {
    window.print();
  }

  claseDiferencia(d: number | null | undefined): string {
    const n = Number(d ?? 0);
    if (n === 0) return 'text-success';
    return n > 0 ? 'text-primary' : 'text-danger';
  }

  textoDiferencia(d: number | null | undefined): string {
    const n = Number(d ?? 0);
    if (n === 0) return 'Cuadra';
    return n > 0 ? 'Sobrante' : 'Faltante';
  }

  private dosDecimales(valor: number | null): boolean {
    if (valor === null) return true;
    return Math.abs(Number(valor) * 100 - Math.round(Number(valor) * 100)) < 1e-6;
  }
}
