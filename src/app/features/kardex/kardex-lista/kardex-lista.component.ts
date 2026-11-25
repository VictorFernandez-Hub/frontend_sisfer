import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { BuscadorComponent } from '../../../shared/components/buscador/buscador.component';
import { extraerMensajeError } from '../../../shared/utils/http-error.util';
import { NotificationService } from '../../../core/services/notification.service';
import { descargarExcel, hoyIso, imprimirPdf, rangoMes, rangoSemana } from '../../../shared/utils/exportar.util';
import { MovimientoKardex, TipoMovimiento } from '../modelos/kardex.model';
import { KardexService } from '../servicios/kardex.service';

// Filtro de la tabla: todos los movimientos, solo lo que entró o solo lo que salió
type FiltroMovimiento = 'TODOS' | 'ENTRADAS' | 'SALIDAS';

@Component({
  selector: 'app-kardex-lista',
  standalone: true,
  imports: [CommonModule, BuscadorComponent],
  templateUrl: './kardex-lista.component.html',
  styleUrls: ['./kardex-lista.component.css']
})
export class KardexListaComponent implements OnInit {
  private readonly kardexService = inject(KardexService);
  private readonly notificacion = inject(NotificationService);

  movimientos = signal<MovimientoKardex[]>([]);
  cargando = signal<boolean>(false);
  errorMessage = signal<string>('');
  termino = signal<string>('');
  filtro = signal<FiltroMovimiento>('TODOS');
  filtroTipo = signal<'' | TipoMovimiento>('');   // vacío = todos los tipos de movimiento
  filtroProducto = signal<string>('');            // vacío = todos los productos
  filtroUsuario = signal<string>('');             // vacío = todos los usuarios
  filtroDocumento = signal<string>('');           // vacío = compras, ventas y ajustes
  desde = signal<string>('');   // fecha en formato AAAA-MM-DD
  hasta = signal<string>('');

  // Tarjetas de resumen de arriba
  resumen = computed(() => {
    const lista = this.movimientos();
    return {
      total: lista.length,
      entradas: lista.filter(m => this.esEntrada(m)).length,
      salidas: lista.filter(m => !this.esEntrada(m)).length
    };
  });

  // Productos que tienen movimientos (para el filtro desplegable)
  productosEnLista = computed(() =>
    [...new Set(this.movimientos().map(m => m.producto))].sort((a, b) => a.localeCompare(b))
  );

  usuariosEnLista = computed(() =>
    [...new Set(this.movimientos().map(m => m.usuario ?? '').filter(u => u))].sort((a, b) => a.localeCompare(b))
  );

  hayFiltros = computed(() =>
    !!this.desde() || !!this.hasta() || !!this.filtroTipo() || !!this.filtroProducto() ||
    !!this.filtroUsuario() || !!this.filtroDocumento()
  );

  // Movimientos que se ven en la tabla (según buscador, filtros y fechas)
  movimientosFiltrados = computed(() => {
    const t = this.termino().trim().toLowerCase();
    const f = this.filtro();
    const tipo = this.filtroTipo();
    const prod = this.filtroProducto();
    const usuario = this.filtroUsuario();
    const documento = this.filtroDocumento();
    const d = this.desde();
    const h = this.hasta();

    return this.movimientos().filter(m => {
      const coincideTexto = !t ||
        m.codigo.toLowerCase().includes(t) ||
        m.producto.toLowerCase().includes(t) ||
        (m.usuario ?? '').toLowerCase().includes(t);
      const coincideTipo = f === 'TODOS' ||
        (f === 'ENTRADAS' && this.esEntrada(m)) ||
        (f === 'SALIDAS' && !this.esEntrada(m));
      const coincideMov = !tipo || m.tipoMov === tipo;
      const coincideProducto = !prod || m.producto === prod;
      const coincideUsuario = !usuario || m.usuario === usuario;
      const coincideDocumento = !documento || m.documento === documento;
      const dia = (m.fecMov ?? '').substring(0, 10);   // AAAA-MM-DD
      const coincideDesde = !d || dia >= d;
      const coincideHasta = !h || dia <= h;
      return coincideTexto && coincideTipo && coincideMov && coincideProducto &&
        coincideUsuario && coincideDocumento && coincideDesde && coincideHasta;
    });
  });

  ngOnInit(): void {
    this.cargarMovimientos();
  }

  cargarMovimientos(): void {
    this.cargando.set(true);
    this.errorMessage.set('');
    this.kardexService.obtenerMovimientos().subscribe({
      next: (data) => {
        this.movimientos.set(data);
        this.cargando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(extraerMensajeError(err, 'No se pudo cargar el kardex.'));
        this.cargando.set(false);
      }
    });
  }

  filtrarMovimientos(termino: string): void {
    this.termino.set(termino);
  }

  // Si se vuelve a tocar el mismo filtro, se quita y vuelve a "todos"
  elegirFiltro(f: FiltroMovimiento): void {
    this.filtro.set(this.filtro() === f ? 'TODOS' : f);
  }

  cambiarDesde(event: Event): void {
    this.desde.set((event.target as HTMLInputElement).value);
  }

  cambiarHasta(event: Event): void {
    this.hasta.set((event.target as HTMLInputElement).value);
  }

  cambiarTipo(event: Event): void {
    this.filtroTipo.set((event.target as HTMLSelectElement).value as '' | TipoMovimiento);
  }

  cambiarProducto(event: Event): void {
    this.filtroProducto.set((event.target as HTMLSelectElement).value);
  }

  cambiarUsuario(event: Event): void {
    this.filtroUsuario.set((event.target as HTMLSelectElement).value);
  }

  cambiarDocumento(event: Event): void {
    this.filtroDocumento.set((event.target as HTMLSelectElement).value);
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
    this.desde.set('');
    this.hasta.set('');
    this.filtroTipo.set('');
    this.filtroProducto.set('');
    this.filtroUsuario.set('');
    this.filtroDocumento.set('');
  }

  // ---------------------------------------------------------- exportar

  private encabezadosExport(): string[] {
    return ['Fecha', 'Código', 'Producto', 'Tipo de movimiento', 'Documento', 'N° de documento',
      'Cantidad', 'Stock anterior', 'Stock actual', 'Costo unit. (S/)', 'Usuario'];
  }

  private filasExport(): (string | number)[][] {
    return this.movimientosFiltrados().map(m => [
      (m.fecMov ?? '').replace('T', ' ').substring(0, 16), m.codigo, m.producto, this.textoTipo(m),
      m.documento, m.idDoc, (this.esEntrada(m) ? '+' : '-') + Number(m.cantidad),
      Number(m.stockAnt), Number(m.stockNuevo), Number(m.costoUnit ?? 0).toFixed(2), m.usuario ?? ''
    ]);
  }

  private textoFiltros(): string {
    const partes: string[] = [];
    if (this.filtro() !== 'TODOS') partes.push(this.filtro() === 'ENTRADAS' ? 'Solo entradas' : 'Solo salidas');
    if (this.filtroTipo()) partes.push(`Tipo: ${this.filtroTipo()}`);
    if (this.filtroProducto()) partes.push(`Producto: ${this.filtroProducto()}`);
    if (this.filtroDocumento()) partes.push(`Documento: ${this.filtroDocumento()}`);
    if (this.filtroUsuario()) partes.push(`Usuario: ${this.filtroUsuario()}`);
    if (this.desde()) partes.push(`Desde: ${this.desde()}`);
    if (this.hasta()) partes.push(`Hasta: ${this.hasta()}`);
    if (this.termino().trim()) partes.push(`Búsqueda: ${this.termino().trim()}`);
    return partes.length ? partes.join(' · ') : 'Sin filtros';
  }

  exportarExcel(): void {
    descargarExcel('kardex', this.encabezadosExport(), this.filasExport());
  }

  exportarPdf(): void {
    const lista = this.movimientosFiltrados();
    const entradas = lista.filter(m => this.esEntrada(m)).length;
    const sub = `${this.textoFiltros()} — ${lista.length} movimientos (${entradas} entradas, ${lista.length - entradas} salidas)`;
    if (!imprimirPdf('Kardex de movimientos', sub, this.encabezadosExport(), this.filasExport())) {
      this.notificacion.mostrar('El navegador bloqueó la ventana. Permita las ventanas emergentes e intente de nuevo.', 'error');
    }
  }

  // Una entrada es cuando el stock sube; una salida, cuando baja
  esEntrada(m: MovimientoKardex): boolean {
    return Number(m.stockNuevo) > Number(m.stockAnt);
  }

  textoTipo(m: MovimientoKardex): string {
    switch (m.tipoMov) {
      case 'ENTRADA_COMPRA': return 'Entrada por compra';
      case 'SALIDA_VENTA': return 'Salida por venta';
      case 'AJUSTE_ENTRADA': return 'Ajuste de entrada';
      case 'AJUSTE_SALIDA': return 'Ajuste de salida';
      case 'ANULACION_COMPRA': return 'Anulación de compra';
      case 'ANULACION_VENTA': return 'Anulación de venta';
      default: return m.tipoMov;
    }
  }
}
