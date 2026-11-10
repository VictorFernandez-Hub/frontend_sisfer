import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RolService } from '../../usuarios/servicios/rol.service';
import { BuscadorComponent } from '../../../shared/components/buscador/buscador.component';

@Component({
  selector: 'app-rol-lista',
  standalone: true,
  imports: [CommonModule, FormsModule, BuscadorComponent],
  templateUrl: './rol-lista.component.html',
  styleUrls: ['./rol-lista.component.css'] 
})

export class RolListaComponent implements OnInit {
  private rolService = inject(RolService);
  
  roles = signal<any[]>([]);
  rolesOriginales: any[] = []; // <--- Copia de respaldo para el funcionamiento del buscador

  codigo = '';
  nombre = '';
  descripcion = '';
  
  // Módulos que se pueden asignar a un rol (mismos que RolController.MODULOS_ASIGNABLES del backend).
  readonly MODULOS = [
    { codigo: 'CLIENTES', nombre: 'Clientes' },
    { codigo: 'PRODUCTOS', nombre: 'Productos' },
    { codigo: 'PROVEEDORES', nombre: 'Proveedores' },
    { codigo: 'VENTAS', nombre: 'Ventas' },
    { codigo: 'COBROS', nombre: 'Cobros' },
    { codigo: 'COMPRAS', nombre: 'Compras' },
    { codigo: 'INVENTARIO', nombre: 'Inventario' },
    { codigo: 'KARDEX', nombre: 'Kardex' },
    { codigo: 'USUARIOS', nombre: 'Usuarios' },
    { codigo: 'ROLES', nombre: 'Roles' },
    { codigo: 'BITACORA', nombre: 'Bitácora' }
  ];

  todosMarcados(): boolean {
    return this.MODULOS.every(m => this.modulos[m.codigo]);
  }

  marcarTodos(marcar: boolean): void {
    this.modulos = Object.fromEntries(this.MODULOS.map(m => [m.codigo, marcar]));
  }
  
  modulos: Record<string, boolean> = this.modulosVacios();
  mensaje = signal('');
  mostrarForm = signal(false);
  editando = signal<any>(null);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.rolService.listar().subscribe(data => {
      this.rolesOriginales = data; // <--- Guardamos la data original completa
      this.roles.set(data);        // <--- Seteamos la signal para la tabla
    });
  }

  cargarParaEditar(r: any): void {
    this.editando.set(r);
    this.codigo = r.codigo;
    this.nombre = r.nombre;
    this.descripcion = r.descripcion;
    this.modulos = Object.fromEntries(
      this.MODULOS.map(m => [m.codigo, (r.modulos || []).includes(m.codigo)])
    );
    this.mostrarForm.set(true);
  }

  eliminarRol(r: any): void {
    if (!confirm('¿Eliminar el rol ' + r.codigo + '?')) return;
    this.rolService.eliminar(r.idRol).subscribe(() => this.cargar());
  }

  guardar(): void {
    const elegidos = Object.entries(this.modulos)
      .filter(([, v]) => v).map(([k]) => k);

    if (!this.codigo || !this.nombre) {
      this.mensaje.set('Ingrese código y nombre.');
      return;
    }

    const datos = {
      codigo: this.codigo,
      nombre: this.nombre,
      descripcion: this.descripcion,
      modulos: elegidos
    };

    const peticion = this.editando()
      ? this.rolService.actualizar(this.editando().idRol, datos)
      : this.rolService.crear(datos);

    peticion.subscribe({
      next: () => {
        this.mensaje.set(this.editando() ? 'Rol actualizado.' : 'Rol creado.');
        this.editando.set(null);
        this.limpiar();
        this.mostrarForm.set(false);
        this.cargar();
      },
      error: (err) => {
        const texto = typeof err.error === 'string'
          ? err.error
          : (err.error?.message || 'No se pudo guardar el rol.');
        this.mensaje.set(texto);
      }
    });
  }

  nuevo(): void {
    this.editando.set(null);
    this.limpiar();
    this.mostrarForm.set(true);
  }

  cerrar(): void {
    this.mostrarForm.set(false);
    this.editando.set(null);
  }

  limpiar(): void {
    this.codigo = '';
    this.nombre = '';
    this.descripcion = '';
    this.modulos = this.modulosVacios();
  }

  private modulosVacios(): Record<string, boolean> {
    return Object.fromEntries(this.MODULOS.map(m => [m.codigo, false]));
  }

  filtrarRoles(termino: string): void {
    const filtro = termino.trim().toLowerCase();

    if (!filtro) {
      this.roles.set(this.rolesOriginales);
      return;
    }

    const resultados = this.rolesOriginales.filter(rol => {
      const codigo = rol.codigo?.toLowerCase() || '';
      const nombre = rol.nombre?.toLowerCase() || '';
      const descripcion = rol.descripcion?.toLowerCase() || '';

      return codigo.includes(filtro)
        || nombre.includes(filtro)
        || descripcion.includes(filtro);
    });

    this.roles.set(resultados);
  }
}