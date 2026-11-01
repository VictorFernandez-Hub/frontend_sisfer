import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UsuarioService } from '../servicios/usuario.service';
import { BuscadorComponent } from '../../../shared/components/buscador/buscador.component';
import { UsuarioResponseDTO } from '../modelos/usuario.model';
import { NotificationService } from '../../../core/services/notification.service';
import { RolService } from '../servicios/rol.service';

declare var bootstrap: any;

@Component({
  selector: 'app-usuario-lista',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BuscadorComponent],
  templateUrl: './usuario-lista.component.html',
})
export class UsuarioListaComponent implements OnInit {
  private usuarioService = inject(UsuarioService);
  notificationService = inject(NotificationService);
  private fb = inject(FormBuilder);
  private rolService = inject(RolService);
  rolesDisponibles = signal<any[]>([]);

  usuarios = signal<UsuarioResponseDTO[]>([]);
  private usuariosOriginales: UsuarioResponseDTO[] = [];
  cargando: boolean = true;
  usuarioParaEditar = signal<UsuarioResponseDTO | null>(null);
  hidePassword = signal<boolean>(true);
  avisoGuardado = signal('');
  mostrarClave = signal(false);
  mostrarReglas = signal(false);
  private reglasTimer: any;

  usuarioForm: FormGroup = this.fb.group({
    idUsuario: [null],
    cuenta: ['', [Validators.required, Validators.minLength(4)]],
    nombresCompleto: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)]],
    telefono: ['', [Validators.required, Validators.pattern(/^9[0-9]{8}$/)]],
    dni: ['', [Validators.required, Validators.pattern(/^[0-9]{8}$/)]],
    tipoContrato: [''],
    fecInicio: [''],
    fecFin: [''],
    estado: ['ACTIVO', [Validators.required]],
    clave: [''],
    confirmarClave: [''],
    codigoRol: ['VENDEDOR', [Validators.required]]
  });

  ngOnInit(): void {
    this.obtenerUsuarios();
    this.rolService.listar().subscribe(data => this.rolesDisponibles.set(data));
  }

  togglePasswordVisibility(): void {
    this.hidePassword.update((value) => !value);
  }

  soloNumerosDni(event: Event): void {
    const input = event.target as HTMLInputElement;
    const limpio = input.value.replace(/[^0-9]/g, '').slice(0, 8);
    this.usuarioForm.get('dni')?.setValue(limpio, { emitEvent: false });
  }

  soloNumerosTelefono(event: Event): void {
    const input = event.target as HTMLInputElement;
    const limpio = input.value.replace(/[^0-9]/g, '').slice(0, 9);
    this.usuarioForm.get('telefono')?.setValue(limpio, { emitEvent: false });
  }

  esPersonal(): boolean {
    const rol = this.usuarioForm.value.codigoRol;
    return !!rol && rol !== 'ADMIN_SISTEMA';
  }

  activarReglas(): void {
    if (this.reglasTimer) {
      clearTimeout(this.reglasTimer);
      this.reglasTimer = null;
    }
    this.mostrarReglas.set(true);
  }

  ocultarReglas(): void {
    this.reglasTimer = setTimeout(() => this.mostrarReglas.set(false), 200);
  }

  tieneMinimo(valor: string): boolean {
    return (valor || '').length >= 8;
  }
  tieneMayuscula(valor: string): boolean {
    return /[A-Z]/.test(valor || '');
  }
  tieneNumero(valor: string): boolean {
    return /[0-9]/.test(valor || '');
  }
  tieneSimbolo(valor: string): boolean {
    return /[^A-Za-z0-9]/.test(valor || '');
  }
  claveSegura(valor: string): boolean {
    return this.tieneMinimo(valor) && this.tieneMayuscula(valor)
      && this.tieneNumero(valor) && this.tieneSimbolo(valor);
  }

  filtrarUsuarios(termino: string): void {
    const filtro = termino.trim().toLowerCase();
    if (!filtro) {
      this.usuarios.set(this.usuariosOriginales);
      return;
    }
    const resultados = this.usuariosOriginales.filter(usuario => {
      const cuenta = usuario.cuenta?.toLowerCase() || '';
      const nombres = usuario.nombresCompleto?.toLowerCase() || '';
      const email = usuario.email?.toLowerCase() || '';
      const telefono = usuario.telefono?.toLowerCase() || '';
      const dni = usuario.dni?.toLowerCase() || '';
      return cuenta.includes(filtro) || nombres.includes(filtro)
        || email.includes(filtro) || telefono.includes(filtro) || dni.includes(filtro);
    });
    this.usuarios.set(resultados);
  }

  obtenerUsuarios(): void {
    this.cargando = true;
    this.usuarioService.listarUsuarios().subscribe({
      next: (data) => {
        this.usuariosOriginales = data;
        this.usuarios.set(data);
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al consultar la BD:', err);
        this.cargando = false;
      }
    });
  }

  prepararNuevoUsuario(): void {
    this.usuarioParaEditar.set(null);
    this.mostrarClave.set(true);
    this.usuarioForm.reset({ estado: 'ACTIVO', codigoRol: 'VENDEDOR' });
  }

  editarUsuario(usuario: UsuarioResponseDTO): void {
    this.usuarioParaEditar.set(usuario);
    this.mostrarClave.set(false);
    this.usuarioForm.patchValue({
      idUsuario: usuario.idUsuario,
      cuenta: usuario.cuenta,
      nombresCompleto: usuario.nombresCompleto,
      email: usuario.email,
      telefono: usuario.telefono,
      dni: usuario.dni,
      tipoContrato: usuario.tipoContrato,
      fecInicio: usuario.fecInicio,
      fecFin: usuario.fecFin,
      codigoRol: usuario.codigoRol,
      estado: usuario.estado,
      clave: '',
      confirmarClave: ''
    });
  }

  guardarUsuario(): void {
    const email = this.usuarioForm.value.email || '';
    const telefono = this.usuarioForm.value.telefono || '';
    const dni = this.usuarioForm.value.dni || '';
    const tipo = this.usuarioForm.value.tipoContrato;
    const inicio = this.usuarioForm.value.fecInicio;
    const fin = this.usuarioForm.value.fecFin;

    if (!this.usuarioForm.value.cuenta) {
      this.avisoGuardado.set('Ingrese la cuenta del usuario.');
      return;
    }
    if (!this.usuarioForm.value.nombresCompleto) {
      this.avisoGuardado.set('Ingrese los nombres y apellidos.');
      return;
    }
    if (!this.usuarioForm.value.codigoRol) {
      this.avisoGuardado.set('Seleccione el rol.');
      return;
    }
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
      this.avisoGuardado.set('El correo debe llevar @ y punto.');
      return;
    }
    if (!/^9[0-9]{8}$/.test(telefono)) {
      this.avisoGuardado.set('El teléfono debe empezar con 9 y tener 9 dígitos.');
      return;
    }
    if (!/^[0-9]{8}$/.test(dni)) {
      this.avisoGuardado.set('El DNI debe tener 8 dígitos, solo números.');
      return;
    }
    if (this.esPersonal()) {
      if (!tipo) {
        this.avisoGuardado.set('Seleccione el tipo de contrato.');
        return;
      }
      if (!inicio) {
        this.avisoGuardado.set('Ingrese la fecha de inicio del contrato.');
        return;
      }
      if (tipo === 'PLAZO_FIJO' && !fin) {
        this.avisoGuardado.set('En plazo fijo debe ingresar la fecha de fin.');
        return;
      }
      if (tipo === 'PLAZO_FIJO' && fin && inicio && fin < inicio) {
        this.avisoGuardado.set('La fecha de fin no puede ser anterior a la de inicio.');
        return;
      }
    }

    if (!this.usuarioParaEditar() && !this.usuarioForm.value.clave) {
      this.avisoGuardado.set('La clave es obligatoria al crear un usuario.');
      return;
    }

    const clave = this.usuarioForm.value.clave;
    const confirmar = this.usuarioForm.value.confirmarClave;

    if (clave && !this.claveSegura(clave)) {
      this.avisoGuardado.set('La clave no cumple los requisitos.');
      return;
    }
    if (clave && clave !== confirmar) {
      this.avisoGuardado.set('Las claves no coinciden.');
      return;
    }

    const datosUsuario = this.usuarioForm.value;

    if (this.usuarioParaEditar()) {
      this.usuarioService.actualizarUsuario(datosUsuario.idUsuario, datosUsuario).subscribe({
        next: () => {
          this.avisoGuardado.set(this.mensajeSegunEstado(datosUsuario.estado, false));
          this.obtenerUsuarios();
        },
        error: (err) => {
          const texto = typeof err.error === 'string' ? err.error : 'No se guardó el usuario.';
          this.avisoGuardado.set(texto);
        }
      });
    } else {
      this.usuarioService.crearUsuario(datosUsuario).subscribe({
        next: () => {
          this.avisoGuardado.set(this.mensajeSegunEstado(datosUsuario.estado, true));
          this.obtenerUsuarios();
        },
        error: (err) => {
        const texto = typeof err.error === 'string' ? err.error : 'No se guardó el usuario.';
        this.avisoGuardado.set(texto);
        }
      });
    }
  }

  private mensajeSegunEstado(estado: string, esNuevo: boolean): string {
    if (estado === 'INACTIVO') {
      return 'Usuario inactivo. Debe comunicarse con el administrador del negocio.';
    }
    if (estado === 'BLOQUEADO') {
      return 'Usuario bloqueado. Debe comunicarse con el área de sistemas.';
    }
    return esNuevo ? '¡Usuario creado exitosamente!' : '¡Usuario actualizado exitosamente!';
  }

  aceptarAviso(): void {
    const texto = this.avisoGuardado();
    const cierra = texto.includes('exitosamente')
      || texto.includes('inactivo')
      || texto.includes('bloqueado');
    this.avisoGuardado.set('');
    if (cierra) this.cerrarModal();
  }

  eliminarUsuario(idUsuario: number): void {
    if (confirm('¿Está seguro de eliminar este usuario?')) {
      this.usuarioService.eliminarUsuario(idUsuario).subscribe({
        next: () => this.obtenerUsuarios(),
        error: (err) => console.error('Error al eliminar usuario:', err)
      });
    }
  }

  resetearFormulario(): void {
    this.usuarioForm.reset({
      idUsuario: this.usuarioParaEditar()?.idUsuario || null,
      estado: 'ACTIVO'
    });
  }

  private cerrarModal(): void {
    const modalElement = document.getElementById('modalRegistroUsuario');
    if (modalElement) {
      const modal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
      modal.hide();
    }
  }
}