import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { BuscadorComponent } from '../../../shared/components/buscador/buscador.component';
import { extraerMensajeError } from '../../../shared/utils/http-error.util';
import { AuthService } from '../../../core/services/auth.service';
import { Producto } from '../modelos/producto.model';
import { Catalogo } from '../modelos/catalogo.model';
import { ProductoService } from '../servicios/producto.service';
import { Proveedor } from '../../proveedores/modelos/proveedor.model';
import { ProveedorService } from '../../proveedores/servicios/proveedor.service';

@Component({
  selector: 'app-producto-lista',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BuscadorComponent],
  templateUrl: './producto-lista.component.html',
  styleUrls: ['./producto-lista.component.css']
})
export class ProductoListaComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly productoService = inject(ProductoService);
  private readonly proveedorService = inject(ProveedorService);
  private readonly authService = inject(AuthService);

  productos = signal<Producto[]>([]);
  proveedores = signal<Proveedor[]>([]);
  categorias = signal<Catalogo[]>([]);
  marcas = signal<Catalogo[]>([]);
  unidades = signal<Catalogo[]>([]);

  productoParaEditar = signal<Producto | null>(null);
  cargando = signal<boolean>(false);
  guardando = signal<boolean>(false);
  errorMessage = signal<string>('');
  errorFormulario = signal<string>('');
  termino = signal<string>('');
  soloStockBajo = signal<boolean>(false);
  verInactivos = signal<boolean>(false);

  readonly puedeGestionar = computed(() => this.authService.tieneRol([
    'ADMIN_SISTEMA', 'ROLE_ADMIN_SISTEMA', 'ADMIN_NEGOCIO', 'ROLE_ADMIN_NEGOCIO', 'ALMACENERO', 'ROLE_ALMACENERO'
  ]));

  productosFiltrados = computed(() => {
    const t = this.termino().trim().toLowerCase();
    return this.productos().filter(p => {
      const coincideTexto = !t ||
        p.codigo.toLowerCase().includes(t) ||
        p.nombre.toLowerCase().includes(t) ||
        (p.categoria ?? '').toLowerCase().includes(t) ||
        (p.marca ?? '').toLowerCase().includes(t) ||
        (p.proveedor ?? '').toLowerCase().includes(t);
      const coincideStock = !this.soloStockBajo() || p.nivel_stock !== 'OK';
      // Los dados de baja solo se ven a pedido
      const coincideEstado = this.verInactivos() ? p.estado === 'INACTIVO' : p.estado === 'ACTIVO';
      return coincideTexto && coincideStock && coincideEstado;
    });
  });

  totalInactivos = computed(() => this.productos().filter(p => p.estado === 'INACTIVO').length);

  totalStockBajo = computed(() =>
    this.productos().filter(p => p.estado === 'ACTIVO' && p.nivel_stock !== 'OK').length
  );

  totalAgotados = computed(() =>
    this.productos().filter(p => p.estado === 'ACTIVO' && p.nivel_stock === 'AGOTADO').length
  );

  productoForm!: FormGroup;

  
  ngOnInit(): void {
    this.initForm();
    this.cargarCatalogos();
    this.cargarProductos();
  }

  private initForm(): void {
    this.productoForm = this.fb.group({
      id_producto: [{ value: null, disabled: true }],
      codigo: [{ value: '', disabled: true }],
      nombre: ['', [Validators.required, Validators.maxLength(150)]],
      descripcion: ['', [Validators.maxLength(300)]],
      id_categoria: [null, [Validators.required]],
      id_marca: [null, [Validators.required]],
      id_unidad: [null, [Validators.required]],
      id_proveedor: [null, [Validators.required]],
      stock_inicial: [0, [Validators.required, Validators.min(0)]],
      stock_minimo: [0, [Validators.required, Validators.min(0)]],
      estado: ['ACTIVO', [Validators.required]]
    });
  }

  private cargarCatalogos(): void {
    forkJoin({
      categorias: this.productoService.obtenerCategorias(),
      marcas: this.productoService.obtenerMarcas(),
      unidades: this.productoService.obtenerUnidades(),
      proveedores: this.proveedorService.obtenerProveedoresActivos()
    }).subscribe({
      next: ({ categorias, marcas, unidades, proveedores }) => {
        this.categorias.set(categorias);
        this.marcas.set(marcas);
        this.unidades.set(unidades);
        this.proveedores.set(proveedores);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(extraerMensajeError(err, 'No se pudieron cargar categorías, marcas, unidades y proveedores.'));
      }
    });
  }

  cargarProductos(): void {
    this.cargando.set(true);
    this.errorMessage.set('');
    this.productoService.obtenerProductos().subscribe({
      next: (data) => {
        const ordenados = [...data].sort((a, b) =>
          String(a.codigo).localeCompare(String(b.codigo))
        );
        this.productos.set(ordenados);
        this.cargando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(extraerMensajeError(err, 'No se pudieron cargar los productos.'));
        this.cargando.set(false);
      }
    });
  }

  filtrarProductos(termino: string): void {
    this.termino.set(termino);
  }

  alternarStockBajo(): void {
    this.soloStockBajo.update(v => !v);
    if (this.soloStockBajo()) this.verInactivos.set(false);
  }

  alternarInactivos(): void {
    this.verInactivos.update(v => !v);
    if (this.verInactivos()) this.soloStockBajo.set(false);
  }

  esInvalido(campo: string): boolean {
    const control = this.productoForm.get(campo);
    return !!control && control.touched && control.invalid;
  }

  prepararNuevo(): void {
    this.errorFormulario.set('');
    this.productoParaEditar.set(null);
    this.resetearFormulario();
    this.productoForm.get('stock_inicial')?.enable();
    // El backend calcula el código: también cuenta los productos eliminados, que la lista no muestra
    this.productoService.obtenerSiguienteCodigo().subscribe({
      next: ({ codigo }) => this.productoForm.patchValue({ codigo }),
      error: (err: HttpErrorResponse) => {
        this.errorFormulario.set(extraerMensajeError(err, 'No se pudo generar el código del producto.'));
      }
    });
  }

  editarProducto(p: Producto): void {
    this.errorFormulario.set('');
    this.productoParaEditar.set(p);
    this.productoForm.patchValue({
      id_producto: p.id_producto,
      codigo: p.codigo,
      nombre: p.nombre,
      descripcion: p.descripcion || '',
      id_categoria: p.id_categoria,
      id_marca: p.id_marca,
      id_unidad: p.id_unidad,
      id_proveedor: p.id_proveedor ?? null,
      stock_inicial: p.stock_actual ?? 0,
      stock_minimo: p.stock_minimo,
      estado: p.estado
    });
    // Al editar, el stock solo cambia con compras, ventas o ajustes
    this.productoForm.get('stock_inicial')?.disable();
  }

  guardarProducto(): void {
    if (this.productoForm.invalid) {
      this.productoForm.markAllAsTouched();
      return;
    }
    this.errorFormulario.set('');
    this.guardando.set(true);
    const v = this.productoForm.getRawValue();
    const producto: Producto = {
      ...v,
      codigo: String(v.codigo).trim().toUpperCase(),
      id_categoria: Number(v.id_categoria),
      id_marca: Number(v.id_marca),
      id_unidad: Number(v.id_unidad),
      id_proveedor: Number(v.id_proveedor),
      stock_minimo: Number(v.stock_minimo)
      // Sin precios: al crear quedan en 0 y al editar el backend conserva los actuales
    };

    const editando = this.productoParaEditar();
    if (editando) {
      delete producto.stock_inicial; // El backend lo ignora al editar; no se envía
    } else {
      producto.stock_inicial = Number(v.stock_inicial);
    }
    const peticion = editando
      ? this.productoService.actualizarProducto(editando.id_producto!, producto)
      : this.productoService.crearProducto(producto);

    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.cargarProductos();
        this.cerrarModal();
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        this.errorFormulario.set(extraerMensajeError(err, 'No se pudo guardar el producto.'));
      }
    });
  }

  cambiarEstado(p: Producto): void {
    const nuevoEstado = p.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    if (nuevoEstado === 'INACTIVO' &&
      !confirm(`¿Dar de baja "${p.codigo} - ${p.nombre}"?\nNo aparecerá en ventas ni compras, pero se conserva su historial.`)) {
      return;
    }
    this.errorMessage.set('');
    this.productoService.cambiarEstado(p.id_producto!, nuevoEstado).subscribe({
      next: () => this.cargarProductos(),
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(extraerMensajeError(err, 'No se pudo cambiar el estado del producto.'));
      }
    });
  }

  eliminarProducto(p: Producto): void {
    if (!p.id_producto || p.estado !== 'INACTIVO') return;
    const detalle = p.eliminable === false
      ? 'Desaparecerá del sistema. Su historial de stock (kardex) se conserva para la auditoría.'
      : 'No tiene movimientos, así que se borrará por completo.';
    if (!confirm(`¿Borrar el producto "${p.codigo} - ${p.nombre}"?\n${detalle}\nEsta acción no se puede deshacer.`)) return;
    this.errorMessage.set('');
    this.productoService.eliminarProducto(p.id_producto).subscribe({
      next: () => this.cargarProductos(),
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(extraerMensajeError(err, 'No se pudo eliminar el producto.'));
      }
    });
  }

  resetearFormulario(): void {
    this.productoForm.reset({
      id_producto: this.productoParaEditar()?.id_producto ?? null,
      codigo: '',
      nombre: '',
      descripcion: '',
      id_categoria: null,
      id_marca: null,
      id_unidad: null,
      id_proveedor: null,
      stock_inicial: this.productoParaEditar()?.stock_actual ?? 0,
      stock_minimo: 0,
      estado: 'ACTIVO'
    });
  }

  /** El stock inicial ya quedó en el mínimo o por debajo: se avisa antes de guardar */
  stockInicialBajo(): boolean {
    if (this.productoParaEditar()) return false;
    const inicial = Number(this.productoForm.get('stock_inicial')?.value);
    const minimo = Number(this.productoForm.get('stock_minimo')?.value);
    return !isNaN(inicial) && !isNaN(minimo) && minimo > 0 && inicial <= minimo;
  }
  
  private cerrarModal(): void {
    const modalElement = document.getElementById('modalRegistroPro');
    if (modalElement) {
      const modalInstance = (window as any).bootstrap?.Modal?.getInstance(modalElement);
      modalInstance?.hide();
    }
  }
}