import { Component, OnInit, QueryList, ViewChildren, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { extraerMensajeError } from '../../../shared/utils/http-error.util';
import { Cliente } from '../../clientes/modelos/cliente.model';
import { Producto } from '../../productos/modelos/producto.model';
import { OpcionVenta, VentaDetalle, VentaRequest } from '../modelos/venta.model';
import { VentaService } from '../servicios/venta.service';
import { OpcionBusqueda, SelectorBusquedaComponent } from '../selector-busqueda/selector-busqueda.component';
import { DatosDialogo, VentaDialogoComponent } from '../venta-dialogo/venta-dialogo.component';
import { DOC_CLIENTE_VARIOS, IGV, TOPE_BOLETA_SIN_IDENTIFICAR, UNIDADES_ENTERAS, redondear, soles } from '../venta-reglas';

// Una línea del formulario: un producto, cuántas unidades y a qué precio.
// El precio está bloqueado; solo el administrador del negocio lo abre, línea por línea
interface LineaForm {
  clave: number;
  idProducto: number | null;
  cantidad: number | null;
  precioUnit: number;
  precioBase: number;     // precio de lista, o el ya guardado en la proforma
  precioAbierto: boolean;
}

@Component({
  selector: 'app-venta-form',
  standalone: true,
  imports: [CommonModule, FormsModule, SelectorBusquedaComponent, VentaDialogoComponent],
  templateUrl: './venta-form.component.html',
  styleUrls: ['./venta-form.component.css']
})
export class VentaFormComponent implements OnInit {
  private readonly ventaService = inject(VentaService);

  clientes = input.required<Cliente[]>();
  productos = input.required<Producto[]>();
  metodos = input.required<OpcionVenta[]>();
  tiposComp = input.required<OpcionVenta[]>();
  esAdminNegocio = input<boolean>(false);
  venta = input<VentaDetalle | null>(null);   // con datos = editar un borrador

  guardada = output<VentaDetalle>();
  cobrada = output<VentaDetalle>();
  cancelar = output<void>();

  @ViewChildren(SelectorBusquedaComponent) private selectores!: QueryList<SelectorBusquedaComponent>;

  guardando = signal<boolean>(false);
  error = signal<string>('');
  mostrarErrores = signal<boolean>(false);
  dialogo = signal<DatosDialogo | null>(null);
  // Productos ya elegidos: no se pueden repetir en otra línea
  ocupados = signal<Set<number>>(new Set());

  idCliente: number | null = null;
  idMetodo: number | null = null;
  idTipoComp: number | null = null;
  observacion = '';
  lineas: LineaForm[] = [];
  recibido: number | null = null;   // solo para calcular el vuelto en efectivo

  private siguienteClave = 1;

  opcionesCliente = computed<OpcionBusqueda[]>(() => this.clientes().map(c => ({
    id: Number(c.id_cliente),
    texto: c.nombres,
    detalle: `${c.tipo_doc} ${c.num_doc}`
  })));

  // Los agotados y los que no tienen precio se ven en la lista, pero no se pueden elegir
  opcionesProducto = computed<OpcionBusqueda[]>(() => this.productos().map(p => {
    const stock = Number(p.stock_actual ?? 0);
    const precio = Number(p.precio_venta ?? 0);
    let detalle = `${soles(precio)} · Stock ${stock} ${p.unidad_codigo ?? ''}`;
    if (stock <= 0) detalle = 'Agotado';
    else if (precio <= 0) detalle = 'Sin precio';
    return {
      id: Number(p.id_producto),
      texto: `${p.codigo} - ${p.nombre}`,
      detalle,
      deshabilitada: stock <= 0 || precio <= 0
    };
  }));

  ngOnInit(): void {
    const v = this.venta();
    if (v) {
      this.idCliente = v.idCliente;
      this.idMetodo = v.idMetodo;
      this.observacion = v.observacion ?? '';
      this.lineas = v.lineas.map(l => ({
        clave: this.siguienteClave++,
        idProducto: l.idProducto,
        cantidad: Number(l.cantidad),
        precioUnit: Number(l.precioUnit),
        precioBase: Number(l.precioUnit),
        precioAbierto: false
      }));
    } else {
      this.idCliente = this.clientes().find(c => c.num_doc === DOC_CLIENTE_VARIOS)?.id_cliente ?? null;
      this.idMetodo = this.metodos().find(m => m.codigo === 'EFECTIVO')?.id ?? null;
      this.lineas = [this.lineaVacia()];
    }
    this.sugerirComprobante();
    this.actualizarOcupados();
  }

  // La venta casi siempre empieza por el producto: "Cliente varios" ya viene elegido
  enfocarPrimerProducto(): void {
    if (!this.venta()) {
      this.selectores.get(1)?.enfocar();
    }
  }

  get titulo(): string {
    const v = this.venta();
    return v ? `Editar borrador ${v.numero}` : 'Nueva venta';
  }

  // ---------------------------------------------------------- líneas

  agregarLinea(): void {
    this.lineas.push(this.lineaVacia());
    setTimeout(() => this.selectores.last?.enfocar());
  }

  quitarLinea(i: number): void {
    this.lineas.splice(i, 1);
    this.actualizarOcupados();
    this.error.set('');
  }

  private lineaVacia(): LineaForm {
    return { clave: this.siguienteClave++, idProducto: null, cantidad: 1, precioUnit: 0, precioBase: 0, precioAbierto: false };
  }

  // Al elegir un producto se pone su precio de venta y el precio queda bloqueado
  alElegirProducto(linea: LineaForm, id: number | null): void {
    linea.idProducto = id;
    const p = this.productoDe(linea);
    linea.precioBase = p ? Number(p.precio_venta) || 0 : 0;
    linea.precioUnit = linea.precioBase;
    linea.precioAbierto = false;
    if (this.cantidadEntera(linea)) {
      linea.cantidad = Math.max(1, Math.floor(Number(linea.cantidad) || 1));
    }
    this.actualizarOcupados();
    this.error.set('');
  }

  private actualizarOcupados(): void {
    this.ocupados.set(new Set(this.lineas.filter(l => l.idProducto).map(l => Number(l.idProducto))));
  }

  // El candado solo existe para el administrador. Al volver a cerrarlo se recupera el precio base
  alternarPrecio(linea: LineaForm): void {
    linea.precioAbierto = !linea.precioAbierto;
    if (!linea.precioAbierto) {
      linea.precioUnit = linea.precioBase;
      this.error.set('');
    }
  }

  precioCambiado(linea: LineaForm): boolean {
    return !!linea.idProducto && Number(linea.precioUnit) !== linea.precioBase;
  }

  hayCambioDePrecio(): boolean {
    return this.lineas.some(l => this.precioCambiado(l));
  }

  productoDe(linea: LineaForm): Producto | undefined {
    return this.productos().find(x => x.id_producto === Number(linea.idProducto));
  }

  // Un borrador antiguo puede tener un producto que ya se desactivó
  noDisponible(linea: LineaForm): boolean {
    return !!linea.idProducto && this.productos().length > 0 && !this.productoDe(linea);
  }

  stockDe(linea: LineaForm): number {
    return Number(this.productoDe(linea)?.stock_actual ?? 0);
  }

  unidadDe(linea: LineaForm): string {
    return this.productoDe(linea)?.unidad_codigo ?? '';
  }

  // Martillos, paquetes y cajas se venden enteros; cable, kilos y litros admiten decimales
  cantidadEntera(linea: LineaForm): boolean {
    return UNIDADES_ENTERAS.includes(this.productoDe(linea)?.unidad_codigo ?? 'UND');
  }

  excedeStock(linea: LineaForm): boolean {
    return !!this.productoDe(linea) && Number(linea.cantidad) > this.stockDe(linea);
  }

  cantidadInvalida(linea: LineaForm): boolean {
    const cantidad = Number(linea.cantidad);
    return !!linea.idProducto
      && (!(cantidad > 0) || this.excedeStock(linea) || (this.cantidadEntera(linea) && !Number.isInteger(cantidad)));
  }

  // Aviso para reponer a tiempo: con esta venta el producto quedaría en su mínimo o por debajo
  quedaBajoMinimo(linea: LineaForm): boolean {
    const p = this.productoDe(linea);
    return !!p && !this.excedeStock(linea) && this.stockDe(linea) - Number(linea.cantidad) <= Number(p.stock_minimo);
  }

  // Aviso para el administrador: vender por debajo del último costo
  bajoCosto(linea: LineaForm): boolean {
    const p = this.productoDe(linea);
    return !!p && p.precio_compra != null && Number(linea.precioUnit) < Number(p.precio_compra);
  }

  // ---------------------------------------------------------- cliente y pago

  clienteSeleccionado(): Cliente | undefined {
    return this.clientes().find(c => c.id_cliente === Number(this.idCliente));
  }

  alElegirCliente(id: number | null): void {
    this.idCliente = id;
    this.sugerirComprobante();
    // "Cliente varios" no puede comprar a crédito
    if (this.esClienteVarios() && this.pagoACredito()) {
      this.idMetodo = this.metodos().find(m => m.codigo === 'EFECTIVO')?.id ?? null;
    }
    this.error.set('');
  }

  // Con RUC se sugiere factura; con DNI, boleta
  private sugerirComprobante(): void {
    const tipo = this.clienteSeleccionado()?.tipo_doc === 'RUC' ? 'FAC' : 'BOL';
    this.idTipoComp = this.tiposComp().find(t => t.codigo === tipo)?.id ?? null;
  }

  esClienteVarios(): boolean {
    return this.clienteSeleccionado()?.num_doc === DOC_CLIENTE_VARIOS;
  }

  faltaIdentificarComprador(): boolean {
    return this.esClienteVarios() && this.total() > TOPE_BOLETA_SIN_IDENTIFICAR;
  }

  pagoACredito(): boolean {
    return this.metodos().find(m => m.id === Number(this.idMetodo))?.codigo === 'CREDITO';
  }

  pagoEnEfectivo(): boolean {
    return this.metodos().find(m => m.id === Number(this.idMetodo))?.codigo === 'EFECTIVO';
  }

  esFactura(idTipoComp: number | null): boolean {
    return this.tiposComp().find(t => t.id === Number(idTipoComp))?.codigo === 'FAC';
  }

  montoExacto(): void {
    this.recibido = this.total();
  }

  recibidoInsuficiente(): boolean {
    return this.pagoEnEfectivo() && this.recibido !== null && this.vuelto() < 0;
  }

  // ---------------------------------------------------------- totales

  totalLinea(l: LineaForm): number {
    return redondear((Number(l.cantidad) || 0) * (Number(l.precioUnit) || 0));
  }

  total(): number {
    return redondear(this.lineas.reduce((acc, l) => acc + this.totalLinea(l), 0));
  }

  subtotal(): number {
    return redondear(this.total() / (1 + IGV));
  }

  igv(): number {
    return redondear(this.total() - this.subtotal());
  }

  vuelto(): number {
    return redondear((Number(this.recibido) || 0) - this.total());
  }

  // ---------------------------------------------------------- guardar y cobrar

  // Guarda en borrador: sirve como proforma o para cobrar después
  guardarBorrador(): void {
    const datos = this.armarDatos();
    if (!datos) return;

    const id = this.venta()?.idVenta;
    this.guardando.set(true);
    (id ? this.ventaService.actualizar(id, datos) : this.ventaService.registrar(datos)).subscribe({
      next: (v) => {
        this.guardando.set(false);
        this.guardada.emit(v);
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        this.error.set(extraerMensajeError(err, 'No se pudo guardar la venta.'));
      }
    });
  }

  // Revisa todo y pide confirmar: al cobrar se mueve el stock y se emite el comprobante
  pedirCobro(): void {
    if (!this.armarDatos()) return;
    if (!this.idTipoComp) {
      this.error.set('Seleccione boleta o factura.');
      return;
    }
    if (this.esFactura(this.idTipoComp) && this.clienteSeleccionado()?.tipo_doc !== 'RUC') {
      this.error.set('Para emitir factura el cliente debe tener RUC.');
      return;
    }
    if (this.faltaIdentificarComprador()) {
      this.error.set('Una boleta de más de S/ 700.00 debe llevar los datos del comprador. Elija al cliente.');
      return;
    }
    if (this.recibidoInsuficiente()) {
      this.error.set('El monto recibido no alcanza para el total.');
      return;
    }

    const filas = [
      { etiqueta: 'Cliente', valor: this.clienteSeleccionado()?.nombres ?? '' },
      { etiqueta: 'Comprobante', valor: this.tiposComp().find(t => t.id === Number(this.idTipoComp))?.nombre ?? '' },
      { etiqueta: 'Pago', valor: this.metodos().find(m => m.id === Number(this.idMetodo))?.nombre ?? '' },
      { etiqueta: 'Total', valor: soles(this.total()) }
    ];
    if (this.pagoEnEfectivo() && this.recibido !== null) {
      filas.push({ etiqueta: 'Vuelto', valor: soles(this.vuelto()) });
    }
    this.dialogo.set({
      titulo: '¿Cobrar esta venta?',
      mensaje: 'Se descontará el stock y se emitirá el comprobante.',
      filas,
      textoBoton: `Cobrar ${soles(this.total())}`,
      claseBoton: 'btn-success',
      accion: 'cobrar'
    });
  }

  cobrar(): void {
    this.dialogo.set(null);
    const datos = this.armarDatos();
    if (!datos) return;

    const idTipoComp = Number(this.idTipoComp);
    const idBorrador = this.venta()?.idVenta;
    this.guardando.set(true);

    // Venta nueva: se cobra en un solo paso y, si falla, no queda ningún borrador
    if (!idBorrador) {
      this.ventaService.cobrar(datos, idTipoComp).subscribe({
        next: (v) => this.alCobrar(v),
        error: (err: HttpErrorResponse) => {
          this.guardando.set(false);
          this.error.set(extraerMensajeError(err, 'No se pudo cobrar la venta.'));
        }
      });
      return;
    }

    // Proforma que ya existía: se guardan los cambios y luego se confirma
    this.ventaService.actualizar(idBorrador, datos).subscribe({
      next: (borrador) => {
        this.ventaService.confirmar(borrador.idVenta, idTipoComp).subscribe({
          next: (v) => this.alCobrar(v),
          error: (err: HttpErrorResponse) => {
            this.guardando.set(false);
            this.error.set(extraerMensajeError(err, 'No se pudo confirmar la venta.') +
              ` La venta ${borrador.numero} sigue en borrador.`);
          }
        });
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        this.error.set(extraerMensajeError(err, 'No se pudo guardar la venta.'));
      }
    });
  }

  private alCobrar(v: VentaDetalle): void {
    this.guardando.set(false);
    this.cobrada.emit(v);
  }

  private armarDatos(): VentaRequest | null {
    this.error.set('');
    this.mostrarErrores.set(true);

    if (!this.idCliente) {
      this.error.set('Seleccione un cliente.');
      return null;
    }
    if (!this.idMetodo) {
      this.error.set('Seleccione el medio de pago.');
      return null;
    }
    if (this.pagoACredito() && this.esClienteVarios()) {
      this.error.set('El crédito interno se da a un cliente identificado. Elija al cliente o cambie el medio de pago.');
      return null;
    }
    for (const l of this.lineas) {
      if (!l.idProducto) {
        this.error.set('Seleccione el producto en todas las líneas.');
        return null;
      }
      const p = this.productoDe(l);
      if (this.noDisponible(l)) {
        this.error.set('Un producto ya no está disponible. Quítelo de la venta.');
        return null;
      }
      if (!(Number(l.cantidad) > 0)) {
        this.error.set('La cantidad debe ser mayor a 0.');
        return null;
      }
      if (this.cantidadEntera(l) && !Number.isInteger(Number(l.cantidad))) {
        this.error.set(`${p?.codigo} - ${p?.nombre} se vende en cantidades enteras.`);
        return null;
      }
      if (this.excedeStock(l)) {
        this.error.set(`No hay stock suficiente de ${p?.codigo} - ${p?.nombre}. Disponible: ${this.stockDe(l)}.`);
        return null;
      }
      if (l.precioUnit === null || !(Number(l.precioUnit) > 0)) {
        this.error.set('El precio debe ser mayor a 0.');
        return null;
      }
    }
    if (this.hayCambioDePrecio() && !this.observacion.trim()) {
      this.error.set('Indique en la observación el motivo del cambio de precio.');
      return null;
    }

    return {
      idCliente: Number(this.idCliente),
      idMetodo: Number(this.idMetodo),
      observacion: this.observacion.trim(),
      // El vendedor no envía precio: el backend usa el de la proforma o el de lista
      lineas: this.lineas.map(l => ({
        idProducto: Number(l.idProducto),
        cantidad: Number(l.cantidad),
        precioUnit: this.esAdminNegocio() ? Number(l.precioUnit) : null
      }))
    };
  }
}
