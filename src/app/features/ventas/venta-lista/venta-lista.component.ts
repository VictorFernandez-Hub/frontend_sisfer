import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { BuscadorComponent } from '../../../shared/components/buscador/buscador.component';
import { extraerMensajeError } from '../../../shared/utils/http-error.util';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { ClienteService } from '../../clientes/servicios/cliente.service';
import { ProductoService } from '../../productos/servicios/producto.service';
import { Cliente } from '../../clientes/modelos/cliente.model';
import { Producto } from '../../productos/modelos/producto.model';
import { EstadoVenta, OpcionVenta, VentaDetalle, VentaResumen } from '../modelos/venta.model';
import { VentaService } from '../servicios/venta.service';
import { VentaDetalleComponent } from '../venta-detalle/venta-detalle.component';
import { VentaFormComponent } from '../venta-form/venta-form.component';
import { ROLES_ADMIN_NEGOCIO, ROLES_CONSULTAR, ROLES_REGISTRAR, claseEstado } from '../venta-reglas';

type FiltroEstado = 'TODOS' | EstadoVenta;
type VistaVentana = 'form' | 'detalle' | null;

@Component({
  selector: 'app-venta-lista',
  standalone: true,
  imports: [CommonModule, FormsModule, BuscadorComponent, VentaFormComponent, VentaDetalleComponent],
  templateUrl: './venta-lista.component.html',
  styleUrls: ['./venta-lista.component.css']
})
export class VentaListaComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly ventaService = inject(VentaService);
  private readonly clienteService = inject(ClienteService);
  private readonly productoService = inject(ProductoService);
  private readonly authService = inject(AuthService);
  private readonly notificacion = inject(NotificationService);

  // Mismos roles que SecurityConfig: el gerente solo consulta y el precio lo cambia el administrador del negocio
  readonly puedeConsultar = this.authService.tieneRol(ROLES_CONSULTAR);
  readonly puedeRegistrar = this.authService.tieneRol(ROLES_REGISTRAR);
  readonly esAdminNegocio = this.authService.tieneRol(ROLES_ADMIN_NEGOCIO);

  readonly claseEstado = claseEstado;

  ventas = signal<VentaResumen[]>([]);
  clientes = signal<Cliente[]>([]);
  productos = signal<Producto[]>([]);
  metodos = signal<OpcionVenta[]>([]);
  tiposComp = signal<OpcionVenta[]>([]);
  cargando = signal<boolean>(false);
  cargaInicial = signal<boolean>(true);
  errorCarga = signal<string>('');
  errorFechas = signal<string>('');
  termino = signal<string>('');
  filtroEstado = signal<FiltroEstado>('TODOS');
  descargandoId = signal<number | null>(null);

  // Rango de fechas del listado (vacío = últimas ventas)
  desde = '';
  hasta = '';

  // La ventana muestra el formulario o el detalle de una venta
  vista = signal<VistaVentana>(null);
  ventaActual = signal<VentaDetalle | null>(null);

  @ViewChild('ventanaVenta') private ventanaVenta?: ElementRef<HTMLElement>;
  @ViewChild(VentaFormComponent) private formulario?: VentaFormComponent;
  private ventana: any = null;
  private readonly alOcultarVentana = () => {
    this.vista.set(null);
    this.ventaActual.set(null);
  };
  // Bootstrap pone el foco en la ventana al terminar de abrirla; recién entonces se puede mover
  private readonly alMostrarVentana = () => this.formulario?.enfocarPrimerProducto();

  catalogosListos = computed(() =>
    this.clientes().length > 0 && this.productos().length > 0 && this.metodos().length > 0 && this.tiposComp().length > 0);

  resumen = computed(() => {
    const lista = this.ventas();
    const confirmadas = lista.filter(v => v.estado === 'CONFIRMADA');
    return {
      confirmadas: confirmadas.length,
      vendido: confirmadas.reduce((suma, v) => suma + Number(v.totTotal), 0),
      borradores: lista.filter(v => v.estado === 'BORRADOR').length,
      anuladas: lista.filter(v => v.estado === 'ANULADA').length
    };
  });

  // Lo cobrado por cada medio de pago, para cuadrar la caja con las ventas que se están mostrando
  cajaPorMetodo = computed(() => {
    const caja = new Map<string, { metodo: string; ventas: number; total: number }>();
    for (const v of this.ventas()) {
      if (v.estado !== 'CONFIRMADA') continue;
      const fila = caja.get(v.metodo) ?? { metodo: v.metodo, ventas: 0, total: 0 };
      fila.ventas += 1;
      fila.total += Number(v.totTotal);
      caja.set(v.metodo, fila);
    }
    return [...caja.values()].sort((a, b) => b.total - a.total);
  });

  ventasFiltradas = computed(() => {
    const t = this.termino().trim().toLowerCase();
    const estado = this.filtroEstado();
    return this.ventas().filter(v => {
      const coincideTexto = !t ||
        v.numero.toLowerCase().includes(t) ||
        v.cliente.toLowerCase().includes(t) ||
        (v.docCliente ?? '').toLowerCase().includes(t) ||
        (v.comprobante ?? '').toLowerCase().includes(t) ||
        (v.usuario ?? '').toLowerCase().includes(t);
      return coincideTexto && (estado === 'TODOS' || v.estado === estado);
    });
  });

  ngOnInit(): void {
    // Un rol sin acceso que escribe la dirección a mano no llega a pedir nada al backend
    if (!this.puedeConsultar) return;

    this.cargarVentas();
    this.ventaService.tiposComprobante().subscribe({
      next: (lista) => this.tiposComp.set(lista),
      error: () => this.tiposComp.set([])
    });
    if (!this.puedeRegistrar) return;

    this.ventaService.metodos().subscribe({
      next: (lista) => this.metodos.set(lista),
      error: () => this.metodos.set([])
    });
    this.cargarClientes();
    this.cargarProductos();
  }

  ngAfterViewInit(): void {
    const elemento = this.ventanaVenta?.nativeElement;
    if (!elemento) return;
    this.ventana = (window as any).bootstrap?.Modal?.getOrCreateInstance(elemento);
    // La barra de desplazamiento está en el body. Al abrir la ventana se oculta y, sin reservar
    // su lugar, toda la página se ensancha 15 px detrás del fondo oscuro
    document.body.style.setProperty('scrollbar-gutter', 'stable');
    // El contenido se quita al terminar de cerrarse: así la ventana no se encoge mientras desaparece
    elemento.addEventListener('hidden.bs.modal', this.alOcultarVentana);
    elemento.addEventListener('shown.bs.modal', this.alMostrarVentana);
  }

  // Si se sale de la pantalla con la ventana abierta, no debe quedar el fondo oscuro
  ngOnDestroy(): void {
    this.ventanaVenta?.nativeElement.removeEventListener('hidden.bs.modal', this.alOcultarVentana);
    this.ventanaVenta?.nativeElement.removeEventListener('shown.bs.modal', this.alMostrarVentana);
    this.ventana?.dispose();
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('padding-right');
    document.body.style.removeProperty('scrollbar-gutter');
  }

  // Las filas se mantienen mientras se actualiza: la tabla no se vacía ni salta
  cargarVentas(): void {
    this.errorFechas.set('');
    if (this.desde && this.hasta && this.desde > this.hasta) {
      this.errorFechas.set('"Desde" no puede ser posterior a "Hasta".');
      return;
    }
    this.cargando.set(true);
    this.ventaService.listar(this.desde, this.hasta).subscribe({
      next: (data) => {
        this.ventas.set(data);
        this.errorCarga.set('');
        this.cargando.set(false);
        this.cargaInicial.set(false);
      },
      error: (err: HttpErrorResponse) => {
        const mensaje = this.mensajeDeCarga(err);
        if (this.ventas().length > 0) {
          this.notificacion.mostrar(mensaje, 'error');
        } else {
          this.errorCarga.set(mensaje);
        }
        this.cargando.set(false);
        this.cargaInicial.set(false);
      }
    });
  }

  // Este rol sí puede consultar: un 403 aquí significa que la sesión ya no existe en el servidor
  private mensajeDeCarga(err: HttpErrorResponse): string {
    return err.status === 403
      ? 'Su sesión venció. Cierre sesión y vuelva a ingresar.'
      : extraerMensajeError(err, 'No se pudo cargar las ventas.');
  }

  private cargarClientes(): void {
    this.clienteService.obtenerClientesActivos().subscribe({
      next: (lista) => this.clientes.set(lista),
      error: () => this.clientes.set([])
    });
  }

  // El stock cambia con cada venta: se vuelve a pedir para mostrarlo al día
  private cargarProductos(): void {
    this.productoService.obtenerProductosActivos().subscribe({
      next: (lista) => this.productos.set(lista),
      error: () => this.productos.set([])
    });
  }

  filtrarVentas(termino: string): void {
    this.termino.set(termino);
  }

  // Si se vuelve a tocar el mismo filtro, se quita y vuelve a "todos"
  elegirFiltro(estado: FiltroEstado): void {
    this.filtroEstado.set(this.filtroEstado() === estado ? 'TODOS' : estado);
  }

  esHoy(): boolean {
    return !!this.desde && this.desde === this.hasta && this.desde === this.hoy();
  }

  verHoy(): void {
    this.desde = this.hoy();
    this.hasta = this.hoy();
    this.cargarVentas();
  }

  limpiarFechas(): void {
    this.desde = '';
    this.hasta = '';
    this.cargarVentas();
  }

  descripcionPeriodo(): string {
    if (this.esHoy()) return 'de hoy';
    return this.desde || this.hasta ? 'del rango elegido' : 'de las últimas registradas';
  }

  // ---------------------------------------------------------- ventana

  nuevaVenta(): void {
    this.ventaActual.set(null);
    this.vista.set('form');
    this.cargarClientes();
    this.cargarProductos();
    this.ventana?.show();
  }

  verDetalle(v: VentaResumen): void {
    this.ventaService.obtener(v.idVenta).subscribe({
      next: (d) => {
        this.ventaActual.set(d);
        this.vista.set('detalle');
        this.ventana?.show();
      },
      error: (err: HttpErrorResponse) =>
        this.notificacion.mostrar(extraerMensajeError(err, 'No se pudo abrir la venta.'), 'error')
    });
  }

  editarBorrador(d: VentaDetalle): void {
    this.ventaActual.set(d);
    this.vista.set('form');
    this.cargarClientes();
    this.cargarProductos();
  }

  // Al cancelar la edición de un borrador se vuelve a su detalle; una venta nueva cierra la ventana
  cancelarFormulario(): void {
    if (this.ventaActual()) {
      this.vista.set('detalle');
    } else {
      this.cerrarVentana();
    }
  }

  cerrarVentana(): void {
    this.ventana?.hide();
  }

  alGuardarBorrador(v: VentaDetalle): void {
    this.notificacion.mostrar(`Venta ${v.numero} guardada en borrador. El stock todavía no cambia.`, 'success');
    this.mostrarResultado(v);
  }

  // Tras cobrar se muestra el detalle y se descarga el voucher para entregarlo al cliente
  alCobrar(v: VentaDetalle): void {
    this.notificacion.mostrar(`Venta ${v.numero} cobrada. Se emitió ${v.comprobante?.numeroCompleto ?? ''}.`, 'success');
    this.mostrarResultado(v);
    this.bajarPdf(v.idVenta, v.comprobante?.numeroCompleto, v.numero);
  }

  // No se usa el tipo 'delete' porque su título es "Eliminado" y una venta anulada no se borra
  alAnular(v: VentaDetalle): void {
    this.notificacion.mostrar(`Venta ${v.numero} anulada.`, 'success');
    this.mostrarResultado(v);
  }

  private mostrarResultado(v: VentaDetalle): void {
    this.ventaActual.set(v);
    this.vista.set('detalle');
    this.cargarVentas();
    this.cargarProductos();
  }

  // ---------------------------------------------------------- comprobante

  tienePdf(v: VentaResumen): boolean {
    return !!v.comprobante || v.estado === 'BORRADOR';
  }

  descargarDesdeFila(v: VentaResumen): void {
    this.bajarPdf(v.idVenta, v.comprobante, v.numero);
  }

  private bajarPdf(id: number, comprobante: string | null | undefined, numero: string): void {
    this.descargandoId.set(id);
    this.ventaService.guardarPdf(id, comprobante, numero).subscribe({
      next: () => this.descargandoId.set(null),
      error: (err: HttpErrorResponse) => {
        this.descargandoId.set(null);
        this.notificacion.mostrar(extraerMensajeError(err, 'No se pudo descargar el comprobante.'), 'error');
      }
    });
  }

  private hoy(): string {
    const d = new Date();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
  }
}
