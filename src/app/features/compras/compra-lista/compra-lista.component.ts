import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { BuscadorComponent } from '../../../shared/components/buscador/buscador.component';
import { extraerMensajeError } from '../../../shared/utils/http-error.util';
import { descargarExcel, hoyIso, imprimirPdf, rangoMes, rangoSemana } from '../../../shared/utils/exportar.util';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { ProveedorService } from '../../proveedores/servicios/proveedor.service';
import { ProductoService } from '../../productos/servicios/producto.service';
import { Proveedor } from '../../proveedores/modelos/proveedor.model';
import { Producto } from '../../productos/modelos/producto.model';
import { CompraDetalle, CompraRequest, CompraResumen, EstadoCompra } from '../modelos/compra.model';
import { CompraService } from '../servicios/compra.service';

// Una línea del formulario: un producto, cuántas unidades y a qué costo
interface LineaForm {
  idProducto: number | null;
  cantidad: number;
  costoUnit: number;
}

const IGV = 0.18;

@Component({
  selector: 'app-compra-lista',
  standalone: true,
  imports: [CommonModule, FormsModule, BuscadorComponent],
  templateUrl: './compra-lista.component.html',
  styleUrls: ['./compra-lista.component.css']
})
export class CompraListaComponent implements OnInit {
  private readonly compraService = inject(CompraService);
  private readonly proveedorService = inject(ProveedorService);
  private readonly productoService = inject(ProductoService);
  private readonly notificacion = inject(NotificationService);
  private readonly authService = inject(AuthService);

  // El gerente solo consulta: no registra, confirma ni anula (igual que SecurityConfig del backend)
  readonly puedeGestionar = this.authService.tieneRol([
    'ADMIN_NEGOCIO', 'ROLE_ADMIN_NEGOCIO', 'ALMACENERO', 'ROLE_ALMACENERO', 'MOD_COMPRAS'
  ]);

  compras =signal<CompraResumen[]>([]);
  proveedores = signal<Proveedor[]>([]);
  productos = signal<Producto[]>([]);
  cargando = signal<boolean>(false);
  guardando = signal<boolean>(false);
  errorMessage = signal<string>('');
  formError = signal<string>('');
  termino = signal<string>('');
  filtroEstado = signal<'TODOS' | EstadoCompra>('TODOS');
  filtroProveedor = signal<string>('');   // vacío = todos los proveedores
  filtroTipoDoc = signal<string>('');     // vacío = todos los tipos de documento
  filtroUsuario = signal<string>('');     // vacío = todos los usuarios
  desde = signal<string>('');             // fecha en formato AAAA-MM-DD
  hasta = signal<string>('');

  mostrandoForm = signal<boolean>(false);
  detalle = signal<CompraDetalle | null>(null);

  // Datos del formulario "Nueva compra"
  idProveedor: number | null = null;
  fecCompra = this.hoy();
  tipoDoc = 'FACTURA';
  numDoc = '';
  observacion = '';
  lineas: LineaForm[] = [];

  // Proveedores que aparecen en las compras (para el filtro desplegable)
  proveedoresEnLista = computed(() =>
    [...new Set(this.compras().map(c => c.proveedor))].sort((a, b) => a.localeCompare(b))
  );

  // Usuarios que registraron compras (para el filtro desplegable)
  usuariosEnLista = computed(() =>
    [...new Set(this.compras().map(c => c.usuario ?? '').filter(u => u))].sort((a, b) => a.localeCompare(b))
  );

  hayFiltros = computed(() =>
    this.filtroEstado() !== 'TODOS' || !!this.filtroProveedor() || !!this.filtroTipoDoc() ||
    !!this.filtroUsuario() || !!this.desde() || !!this.hasta()
  );

  // Compras que se ven en la tabla (según buscador, estado, proveedor y fechas)
  comprasFiltradas = computed(() => {
    const t = this.termino().trim().toLowerCase();
    const estado = this.filtroEstado();
    const prov = this.filtroProveedor();
    const tipoDoc = this.filtroTipoDoc();
    const usuario = this.filtroUsuario();
    const d = this.desde();
    const h = this.hasta();

    return this.compras().filter(c => {
      const coincideTexto = !t ||
        c.numero.toLowerCase().includes(t) ||
        c.proveedor.toLowerCase().includes(t) ||
        (c.numDoc ?? '').toLowerCase().includes(t) ||
        (c.usuario ?? '').toLowerCase().includes(t);
      const coincideEstado = estado === 'TODOS' || c.estado === estado;
      const coincideProveedor = !prov || c.proveedor === prov;
      const coincideTipoDoc = !tipoDoc || c.tipoDoc === tipoDoc;
      const coincideUsuario = !usuario || c.usuario === usuario;
      const dia = (c.fecCompra ?? '').substring(0, 10);   // AAAA-MM-DD
      const coincideDesde = !d || dia >= d;
      const coincideHasta = !h || dia <= h;
      return coincideTexto && coincideEstado && coincideProveedor && coincideTipoDoc &&
        coincideUsuario && coincideDesde && coincideHasta;
    });
  });

  // Resumen de lo que se ve: cuántas compras y cuánto suman las confirmadas
  resumenFiltrado = computed(() => {
    const lista = this.comprasFiltradas();
    const confirmadas = lista.filter(c => c.estado === 'CONFIRMADA');
    return {
      cantidad: lista.length,
      confirmadas: confirmadas.length,
      totalConfirmado: confirmadas.reduce((suma, c) => suma + Number(c.totTotal ?? 0), 0)
    };
  });

  ngOnInit(): void {
    this.cargarCompras();
    this.proveedorService.obtenerProveedoresActivos().subscribe({
      next: (lista) => this.proveedores.set(lista),
      error: () => this.proveedores.set([])
    });
    this.productoService.obtenerProductosActivos().subscribe({
      next: (lista) => this.productos.set(lista),
      error: () => this.productos.set([])
    });
  }

  cargarCompras(): void {
    this.cargando.set(true);
    this.errorMessage.set('');
    this.compraService.listar().subscribe({
      next: (data) => {
        this.compras.set(data);
        this.cargando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(extraerMensajeError(err, 'No se pudo cargar las compras.'));
        this.cargando.set(false);
      }
    });
  }

  filtrarCompras(termino: string): void {
    this.termino.set(termino);
  }

  cambiarEstado(event: Event): void {
    this.filtroEstado.set((event.target as HTMLSelectElement).value as 'TODOS' | EstadoCompra);
  }

  cambiarProveedor(event: Event): void {
    this.filtroProveedor.set((event.target as HTMLSelectElement).value);
  }

  cambiarDesde(event: Event): void {
    this.desde.set((event.target as HTMLInputElement).value);
  }

  cambiarHasta(event: Event): void {
    this.hasta.set((event.target as HTMLInputElement).value);
  }

  cambiarTipoDoc(event: Event): void {
    this.filtroTipoDoc.set((event.target as HTMLSelectElement).value);
  }

  cambiarUsuario(event: Event): void {
    this.filtroUsuario.set((event.target as HTMLSelectElement).value);
  }

  rangoHoy(): void {
    this.desde.set(hoyIso());
    this.hasta.set(hoyIso());
  }

  rangoEstaSemana(): void {
    const r = rangoSemana();
    this.desde.set(r.desde);
    this.hasta.set(r.hasta);
  }

  rangoEsteMes(): void {
    const r = rangoMes();
    this.desde.set(r.desde);
    this.hasta.set(r.hasta);
  }

  limpiarFiltros(): void {
    this.filtroEstado.set('TODOS');
    this.filtroProveedor.set('');
    this.filtroTipoDoc.set('');
    this.filtroUsuario.set('');
    this.desde.set('');
    this.hasta.set('');
  }

  // ---------------------------------------------------------- exportar

  private encabezadosExport(): string[] {
    return ['N° compra', 'Fecha', 'Proveedor', 'Tipo de documento', 'N° de documento', 'Total (S/)', 'Estado', 'Registró'];
  }

  private filasExport(): (string | number)[][] {
    return this.comprasFiltradas().map(c => [
      c.numero, (c.fecCompra ?? '').substring(0, 10), c.proveedor, c.tipoDoc, c.numDoc ?? '',
      Number(c.totTotal ?? 0).toFixed(2), c.estado, c.usuario ?? ''
    ]);
  }

  private textoFiltros(): string {
    const partes: string[] = [];
    if (this.filtroEstado() !== 'TODOS') partes.push(`Estado: ${this.filtroEstado()}`);
    if (this.filtroProveedor()) partes.push(`Proveedor: ${this.filtroProveedor()}`);
    if (this.filtroTipoDoc()) partes.push(`Documento: ${this.filtroTipoDoc()}`);
    if (this.filtroUsuario()) partes.push(`Registró: ${this.filtroUsuario()}`);
    if (this.desde()) partes.push(`Desde: ${this.desde()}`);
    if (this.hasta()) partes.push(`Hasta: ${this.hasta()}`);
    if (this.termino().trim()) partes.push(`Búsqueda: ${this.termino().trim()}`);
    return partes.length ? partes.join(' · ') : 'Sin filtros';
  }

  exportarExcel(): void {
    descargarExcel('compras', this.encabezadosExport(), this.filasExport());
  }

  exportarPdf(): void {
    const r = this.resumenFiltrado();
    const sub = `${this.textoFiltros()} — ${r.cantidad} compras; confirmadas: ${r.confirmadas}, total S/ ${r.totalConfirmado.toFixed(2)}`;
    if (!imprimirPdf('Compras', sub, this.encabezadosExport(), this.filasExport())) {
      this.notificacion.mostrar('El navegador bloqueó la ventana. Permita las ventanas emergentes e intente de nuevo.', 'error');
    }
  }

  // ---------------------------------------------------------- nueva compra

  nuevaCompra(): void {
    this.detalle.set(null);
    this.idProveedor = null;
    this.fecCompra = this.hoy();
    this.tipoDoc = 'FACTURA';
    this.numDoc = '';
    this.observacion = '';
    this.lineas = [{ idProducto: null, cantidad: 1, costoUnit: 0 }];
    this.formError.set('');
    this.mostrandoForm.set(true);
  }

  cancelarForm(): void {
    this.mostrandoForm.set(false);
  }

  agregarLinea(): void {
    this.lineas.push({ idProducto: null, cantidad: 1, costoUnit: 0 });
  }

  quitarLinea(i: number): void {
    this.lineas.splice(i, 1);
  }

  // Al elegir un producto se sugiere su último precio de compra
  alElegirProducto(linea: LineaForm): void {
    const p = this.productos().find(x => x.id_producto === Number(linea.idProducto));
    if (p && !linea.costoUnit) {
      linea.costoUnit = Number(p.precio_compra) || 0;
    }
  }

  totalLinea(l: LineaForm): number {
    return this.redondear((Number(l.cantidad) || 0) * (Number(l.costoUnit) || 0));
  }

  // El costo escrito ya incluye IGV. El total es lo que se paga al proveedor.
  total(): number {
    return this.redondear(this.lineas.reduce((acc, l) => acc + this.totalLinea(l), 0));
  }

  subtotal(): number {
    return this.redondear(this.total() / (1 + IGV));
  }

  igv(): number {
    return this.redondear(this.total() - this.subtotal());
  }

  guardarBorrador(): void {
    this.formError.set('');

    if (!this.idProveedor) {
      this.formError.set('Seleccione un proveedor.');
      return;
    }
    if (!this.fecCompra) {
      this.formError.set('Indique la fecha de la compra.');
      return;
    }
    if (this.lineas.length === 0) {
      this.formError.set('Agregue al menos un producto.');
      return;
    }
    const ids = new Set<number>();
    for (const l of this.lineas) {
      if (!l.idProducto) {
        this.formError.set('Seleccione el producto en todas las líneas.');
        return;
      }
      if (!(Number(l.cantidad) > 0)) {
        this.formError.set('La cantidad debe ser mayor a 0.');
        return;
      }
      if (Number(l.costoUnit) < 0 || l.costoUnit === null) {
        this.formError.set('El costo no puede ser negativo.');
        return;
      }
      if (ids.has(Number(l.idProducto))) {
        this.formError.set('Un producto está repetido. Súmelo en una sola línea.');
        return;
      }
      ids.add(Number(l.idProducto));
    }

    const datos: CompraRequest = {
      idProveedor: Number(this.idProveedor),
      fecCompra: this.fecCompra,
      tipoDoc: this.tipoDoc.trim(),
      numDoc: this.numDoc.trim(),
      observacion: this.observacion.trim(),
      lineas: this.lineas.map(l => ({
        idProducto: Number(l.idProducto),
        cantidad: Number(l.cantidad),
        costoUnit: Number(l.costoUnit)
      }))
    };

    this.guardando.set(true);
    this.compraService.registrar(datos).subscribe({
      next: (creada) => {
        this.guardando.set(false);
        this.mostrandoForm.set(false);
        this.notificacion.mostrar(`Compra ${creada.numero} guardada en borrador. Falta confirmarla para que entre al stock.`, 'success');
        this.cargarCompras();
        this.detalle.set(creada);
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        this.formError.set(extraerMensajeError(err, 'No se pudo guardar la compra.'));
      }
    });
  }

  // ---------------------------------------------------------- detalle / confirmar / anular

  verDetalle(c: CompraResumen): void {
    this.mostrandoForm.set(false);
    this.compraService.obtener(c.idCompra).subscribe({
      next: (d) => this.detalle.set(d),
      error: (err: HttpErrorResponse) =>
        this.notificacion.mostrar(extraerMensajeError(err, 'No se pudo abrir la compra.'), 'error')
    });
  }

  cerrarDetalle(): void {
    this.detalle.set(null);
  }

  confirmar(idCompra: number, numero: string): void {
    const ok = window.confirm(
      `¿Confirmar la compra ${numero}?\n\nLa mercadería entrará al stock y se registrará en el Kardex. Esto no se puede deshacer.`
    );
    if (!ok) return;

    this.guardando.set(true);
    this.compraService.confirmar(idCompra).subscribe({
      next: (d) => {
        this.guardando.set(false);
        this.detalle.set(d);
        this.notificacion.mostrar(`Compra ${d.numero} confirmada. El stock y el Kardex ya se actualizaron.`, 'success');
        this.cargarCompras();
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        this.notificacion.mostrar(extraerMensajeError(err, 'No se pudo confirmar la compra.'), 'error');
      }
    });
  }

  anular(idCompra: number, numero: string): void {
    const ok = window.confirm(`¿Anular la compra ${numero}? Solo se anulan compras en borrador.`);
    if (!ok) return;

    this.guardando.set(true);
    this.compraService.anular(idCompra).subscribe({
      next: (d) => {
        this.guardando.set(false);
        this.detalle.set(d);
        this.notificacion.mostrar(`Compra ${d.numero} anulada.`, 'delete');
        this.cargarCompras();
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        this.notificacion.mostrar(extraerMensajeError(err, 'No se pudo anular la compra.'), 'error');
      }
    });
  }

  claseEstado(estado: string): string {
    switch (estado) {
      case 'CONFIRMADA': return 'bg-success-subtle text-success border border-success-subtle';
      case 'ANULADA': return 'bg-danger-subtle text-danger border border-danger-subtle';
      default: return 'bg-warning-subtle text-warning-emphasis border border-warning-subtle';
    }
  }

  nombreProducto(p: Producto): string {
    return `${p.codigo} - ${p.nombre}`;
  }

  private redondear(n: number): number {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

  private hoy(): string {
    const d = new Date();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
  }
}
