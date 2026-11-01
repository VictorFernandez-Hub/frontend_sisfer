import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Cliente } from '../modelos/cliente.model';
import { BuscadorComponent } from '../../../shared/components/buscador/buscador.component';
import { ClienteService } from '../servicios/cliente.service';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-cliente-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BuscadorComponent],
  templateUrl: './cliente-lista.component.html',
  styleUrl: './cliente-lista.component.css'
})
export class ClienteListaComponent implements OnInit {
  private fb = inject(FormBuilder);
  private clienteService = inject(ClienteService);


  private auth = inject(AuthService);

  puedeModificar(): boolean {
  return this.auth.tieneRol([
    'ADMIN_SISTEMA', 'ROLE_ADMIN_SISTEMA',
    'ADMIN_NEGOCIO', 'ROLE_ADMIN_NEGOCIO',
    'VENDEDOR', 'ROLE_VENDEDOR'
    ]);
  }

  // Signals para manejar el estado reactivo
  clientes = signal<Cliente[]>([]);
  private clientesOriginales: Cliente[] = [];
  clienteParaEditar = signal<Cliente | null>(null);
  cargando = signal<boolean>(false);
  errorMessage = signal<string>('');

  // Formulario Reactivo
  clienteForm!: FormGroup;

  ngOnInit(): void {
    this.initForm();
    this.escucharCambioTipoDoc(); // Sincroniza las validaciones de DNI/RUC
    this.cargarClientes();
  }

  private initForm(): void {
    this.clienteForm = this.fb.group({
      id_cliente: [{ value: null, disabled: true }],
      tipo_doc: ['DNI', [Validators.required]],
      // Inicia con patrón de DNI por defecto (8 dígitos)
      num_doc: ['', [Validators.required, Validators.pattern(/^[0-9]{8}$/)]],
      nombres: ['', [Validators.required, Validators.maxLength(150)]],
      // Exactamente 9 dígitos si el campo no está vacío
      telefono: ['', [Validators.pattern(/^[0-9]{9}$/)]],
      direccion: ['', [Validators.maxLength(200)]],
      email: ['', [Validators.email, Validators.maxLength(120)]],
      estado: ['ACTIVO', [Validators.required]]
    });
  }

  /**
   * Sincroniza dinámicamente las restricciones SQL del CHECK:
   * DNI -> 8 dígitos | RUC -> 11 dígitos
   */
  private escucharCambioTipoDoc(): void {
    this.clienteForm.get('tipo_doc')?.valueChanges.subscribe((tipoDoc: string) => {
      const numDocControl = this.clienteForm.get('num_doc');
      
      if (tipoDoc === 'RUC') {
        numDocControl?.setValidators([Validators.required, Validators.pattern(/^[0-9]{11}$/)]);
      } else {
        // DNI o cualquier otro valor por defecto
        numDocControl?.setValidators([Validators.required, Validators.pattern(/^[0-9]{8}$/)]);
      }
      
      numDocControl?.updateValueAndValidity();
    });
  }

  filtrarClientes(termino: string): void {
  const filtro = termino.trim().toLowerCase();

  if (!filtro) {
    this.clientes.set(this.clientesOriginales);
    return;
  }

  const resultados = this.clientesOriginales.filter(cliente => {
    const nombres = cliente.nombres?.toLowerCase() || '';
    const numDoc = cliente.num_doc?.toLowerCase() || '';
    const email = cliente.email?.toLowerCase() || '';
    const telefono = cliente.telefono?.toLowerCase() || '';

    return nombres.includes(filtro)
      || numDoc.includes(filtro)
      || email.includes(filtro)
      || telefono.includes(filtro);
  });

  this.clientes.set(resultados);
}

  cargarClientes(): void {
    this.cargando.set(true);
    this.errorMessage.set('');

    this.clienteService.obtenerClientes().subscribe({
      next: (data) => {
        this.clientesOriginales = data;
        this.clientes.set(data);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al obtener los clientes desde MySQL:', err);
        this.errorMessage.set('No se pudieron obtener los datos. Verifique si inició sesión.');
        this.cargando.set(false);
      }
    });
  }

  prepararNuevoCliente(): void {
    this.errorMessage.set('');
    this.clienteParaEditar.set(null);
    this.resetearFormulario();
  }

  editar(cliente: Cliente): void {
    this.errorMessage.set('');
    this.clienteParaEditar.set(cliente);
    
    // Primero seteamos tipo_doc para que active la validación correcta (DNI o RUC)
    this.clienteForm.patchValue({
      id_cliente: cliente.id_cliente,
      tipo_doc: cliente.tipo_doc,
      num_doc: cliente.num_doc,
      nombres: cliente.nombres,
      telefono: cliente.telefono || '',
      direccion: cliente.direccion || '',
      email: cliente.email || '',
      estado: cliente.estado
    });
  }

  guardarCliente(): void {
    if (this.clienteForm.invalid) {
      this.clienteForm.markAllAsTouched();
      return;
    }

    this.errorMessage.set('');
    const valoresForm = this.clienteForm.getRawValue();

    if (this.clienteParaEditar()) {
      const id = this.clienteParaEditar()!.id_cliente!;
      const clienteActualizar: Cliente = {
        ...this.clienteParaEditar()!,
        ...valoresForm
      };

      this.clienteService.actualizarCliente(id, clienteActualizar).subscribe({
        next: () => {
          this.cargarClientes();
          this.cerrarModal();
        },
        error: (err) => {
          console.error('Error al actualizar el cliente:', err);
          this.errorMessage.set('Error al actualizar el cliente en la base de datos.');
        }
      });
    } else {
      const nuevoCliente: Cliente = {
        ...valoresForm
      };

      this.clienteService.crearCliente(nuevoCliente).subscribe({
        next: () => {
          this.cargarClientes();
          this.cerrarModal();
        },
        error: (err) => {
          console.error('Error al crear el cliente:', err);
          this.errorMessage.set('Error al guardar el cliente en la base de datos.');
        }
      });
    }
  }

  eliminar(id_cliente: number | undefined): void {
    if (!id_cliente) return;

    if (confirm('¿Está seguro de eliminar este cliente?')) {
      this.clienteService.eliminarCliente(id_cliente).subscribe({
        next: () => {
          this.cargarClientes();
        },
        error: (err) => {
          console.error('Error al eliminar el cliente:', err);
          this.errorMessage.set('No se pudo eliminar el cliente.');
        }
      });
    }
  }

  resetearFormulario(): void {
    this.clienteForm.reset({
      tipo_doc: 'DNI',
      estado: 'ACTIVO'
    });
  }

  private cerrarModal(): void {
    const modalElement = document.getElementById('modalRegistroCli');
    if (modalElement) {
      const modalInstance = (window as any).bootstrap?.Modal?.getInstance(modalElement);
      modalInstance?.hide();
    }
  }
}