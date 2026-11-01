import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { BuscadorComponent } from '../../../shared/components/buscador/buscador.component';
import { extraerMensajeError } from '../../../shared/utils/http-error.util';
import { AuthService } from '../../../core/services/auth.service';
import { Proveedor, TipoDocProveedor } from '../modelos/proveedor.model';
import { ProveedorService } from '../servicios/proveedor.service';

// Patrones por tipo de documento (mismas reglas que ProveedorServiceImpl)
const PATRONES_DOC: Record<TipoDocProveedor, { patron: RegExp; maxLength: number; ayuda: string }> = {
  RUC: { patron: /^(10|15|17|20)[0-9]{9}$/, maxLength: 11, ayuda: '11 dígitos, empieza con 10, 15, 17 o 20' },
  DNI: { patron: /^[0-9]{8}$/, maxLength: 8, ayuda: '8 dígitos' },
  CE:  { patron: /^[A-Za-z0-9]{6,12}$/, maxLength: 12, ayuda: '6 a 12 caracteres' },
  PAS: { patron: /^[A-Za-z0-9]{6,12}$/, maxLength: 12, ayuda: '6 a 12 caracteres' }
};

@Component({
  selector: 'app-proveedor-lista',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BuscadorComponent],
  templateUrl: './proveedor-lista.component.html',
  styleUrl: './proveedor-lista.component.css'
})
export class ProveedorListaComponent implements OnInit {
  private fb = inject(FormBuilder);
  private proveedorService = inject(ProveedorService);
  private authService = inject(AuthService);

  proveedores = signal<Proveedor[]>([]);
  proveedorParaEditar = signal<Proveedor | null>(null);
  cargando = signal<boolean>(false);
  guardando = signal<boolean>(false);
  errorMessage = signal<string>('');      // Errores de la tabla
  errorFormulario = signal<string>('');   // Errores dentro del modal
  termino = signal<string>('');

  // Mismos roles que SecurityConfig para /api/proveedores/**
  readonly puedeGestionar = computed(() => this.authService.tieneRol([
    'ADMIN_SISTEMA', 'ROLE_ADMIN_SISTEMA','ADMIN_NEGOCIO', 'ROLE_ADMIN_NEGOCIO', 'ALMACENERO', 'ROLE_ALMACENERO'
  ]));

  // Filtro en memoria: documento, razón social, nombre comercial o contacto
  proveedoresFiltrados = computed(() => {
    const t = this.termino().trim().toLowerCase();
    if (!t) return this.proveedores();
    return this.proveedores().filter(p =>
      p.num_doc.toLowerCase().includes(t) ||
      p.razon_social.toLowerCase().includes(t) ||
      (p.nom_comercial ?? '').toLowerCase().includes(t) ||
      (p.contacto ?? '').toLowerCase().includes(t)
    );
  });

  readonly tiposDoc: TipoDocProveedor[] = ['RUC'];
  proveedorForm!: FormGroup;

  ngOnInit(): void {
    this.initForm();
    this.escucharCambioTipoDoc();
    this.cargarProveedores();
  }

  private initForm(): void {
    this.proveedorForm = this.fb.group({
      id_proveedor: [{ value: null, disabled: true }],
      tipo_doc: ['RUC', [Validators.required]],
      num_doc: ['', [Validators.required, Validators.pattern(PATRONES_DOC.RUC.patron)]],
      razon_social: ['', [Validators.required, Validators.maxLength(150)]],
      nom_comercial: ['', [Validators.maxLength(150)]],
      telefono: ['', [Validators.required, Validators.pattern(/^9[0-9]{8}$/)]],
      telefono_fijo: ['', [Validators.pattern(/^[0-9]{6,7}$/)]],
      anexo: ['', [Validators.pattern(/^[0-9]{1,6}$/)]],
      email: ['', [Validators.email, Validators.maxLength(120)]],
      direccion: ['', [Validators.maxLength(200)]],
      contacto: ['', [Validators.maxLength(100)]],
      estado: ['ACTIVO', [Validators.required]]
    });
  }

  /** Cambia la validación del N° de documento según el tipo elegido */
  private escucharCambioTipoDoc(): void {
    this.proveedorForm.get('tipo_doc')?.valueChanges.subscribe((tipo: TipoDocProveedor) => {
      const control = this.proveedorForm.get('num_doc');
      const regla = PATRONES_DOC[tipo] ?? PATRONES_DOC.RUC;
      control?.setValidators([Validators.required, Validators.pattern(regla.patron)]);
      control?.updateValueAndValidity();
    });
  }

  /** Datos de ayuda para el input del documento (maxlength y texto del label) */
  reglaDocActual() {
    const tipo = this.proveedorForm.get('tipo_doc')?.value as TipoDocProveedor;
    return PATRONES_DOC[tipo] ?? PATRONES_DOC.RUC;
  }

  esInvalido(campo: string): boolean {
  const control = this.proveedorForm.get(campo);
  if (!control) return false;
  const tieneValor = control.value !== null && control.value !== '';
  return control.invalid && (control.touched || tieneValor);
  }
  
  filtrarProveedores(termino: string): void {
    this.termino.set(termino);
  }

  cargarProveedores(): void {
    this.cargando.set(true);
    this.errorMessage.set('');

    this.proveedorService.obtenerProveedores().subscribe({
      next: (data) => {
        this.proveedores.set(data);
        this.cargando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error al obtener los proveedores:', err);
        this.errorMessage.set(extraerMensajeError(err, 'No se pudieron cargar los proveedores.'));
        this.cargando.set(false);
      }
    });
  }

  prepararNuevoProveedor(): void {
    this.errorFormulario.set('');
    this.proveedorParaEditar.set(null);
    this.resetearFormulario();
  }

  editar(proveedor: Proveedor): void {
    this.errorFormulario.set('');
    this.proveedorParaEditar.set(proveedor);
    this.proveedorForm.patchValue({
      id_proveedor: proveedor.id_proveedor,
      tipo_doc: proveedor.tipo_doc,
      num_doc: proveedor.num_doc,
      razon_social: proveedor.razon_social,
      nom_comercial: proveedor.nom_comercial || '',
      telefono: proveedor.telefono || '',
      telefono_fijo: proveedor.telefono_fijo || '',
      anexo: proveedor.anexo || '',
      email: proveedor.email || '',
      direccion: proveedor.direccion || '',
      contacto: proveedor.contacto || '',
      estado: proveedor.estado
    });
  }

  guardarProveedor(): void {
    if (this.proveedorForm.invalid) {
      this.proveedorForm.markAllAsTouched();
      return;
    }

    this.errorFormulario.set('');
    this.guardando.set(true);
    const valores = this.proveedorForm.getRawValue();
    const proveedor: Proveedor = {
      ...valores,
      num_doc: String(valores.num_doc).trim().toUpperCase()
    };

    const editando = this.proveedorParaEditar();
    const peticion = editando
      ? this.proveedorService.actualizarProveedor(editando.id_proveedor!, proveedor)
      : this.proveedorService.crearProveedor(proveedor);

    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.cargarProveedores();
        this.cerrarModal();
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error al guardar el proveedor:', err);
        this.guardando.set(false);
        this.errorFormulario.set(extraerMensajeError(err, 'No se pudo guardar el proveedor.'));
      }
    });
  }

  cambiarEstado(proveedor: Proveedor): void {
    const nuevoEstado = proveedor.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    this.errorMessage.set('');

    // Se usa PUT (igual que Clientes) enviando el mismo proveedor con el nuevo estado
    this.proveedorService.actualizarProveedor(proveedor.id_proveedor!, { ...proveedor, estado: nuevoEstado }).subscribe({
      next: () => this.cargarProveedores(),
      error: (err: HttpErrorResponse) => {
        console.error('Error al cambiar el estado:', err);
        this.errorMessage.set(extraerMensajeError(err, 'No se pudo cambiar el estado del proveedor.'));
      }
    });
  }

  eliminar(proveedor: Proveedor): void {
    if (!proveedor.id_proveedor) return;
    if (!confirm(`¿Eliminar al proveedor "${proveedor.razon_social}"?`)) return;

    this.errorMessage.set('');
    this.proveedorService.eliminarProveedor(proveedor.id_proveedor).subscribe({
      next: () => this.cargarProveedores(),
      error: (err: HttpErrorResponse) => {
        console.error('Error al eliminar el proveedor:', err);
        this.errorMessage.set(extraerMensajeError(err, 'No se pudo eliminar el proveedor.'));
      }
    });
  }
  
  resetearFormulario(): void {
    this.errorFormulario.set('');
    this.proveedorForm.reset({
      id_proveedor: this.proveedorParaEditar()?.id_proveedor ?? null,
      tipo_doc: 'RUC',
      num_doc: '',
      razon_social: '',
      nom_comercial: '',
      telefono: '',
      email: '',
      direccion: '',
      contacto: '',
      estado: 'ACTIVO'
    });
  }
  
  soloNumerosDoc(event: Event): void {
  const input = event.target as HTMLInputElement;
  const limpio = input.value.replace(/[^0-9]/g, '').slice(0, 11);
  this.proveedorForm.get('num_doc')?.setValue(limpio, { emitEvent: false });
  }

  private cerrarModal(): void {
    const modalElement = document.getElementById('modalRegistroProv');
    if (modalElement) {
      const modalInstance = (window as any).bootstrap?.Modal?.getInstance(modalElement);
      modalInstance?.hide();
    }
  }
}
