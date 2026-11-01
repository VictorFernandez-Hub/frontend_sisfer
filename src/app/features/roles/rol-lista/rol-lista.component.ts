import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RolService } from '../../usuarios/servicios/rol.service';

@Component({
  selector: 'app-rol-lista',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rol-lista.component.html'
})
export class RolListaComponent implements OnInit {
  private rolService = inject(RolService);
  roles = signal<any[]>([]);
  codigo = '';
  nombre = '';
  descripcion = '';
  modulos = { USUARIOS: false, CLIENTES: false, PRODUCTOS: false, PROVEEDORES: false };
  mensaje = signal('');

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.rolService.listar().subscribe(data => this.roles.set(data));
  }

  editando = signal<any>(null);

  cargarParaEditar(r: any): void {
    this.editando.set(r);
    this.codigo = r.codigo;
    this.nombre = r.nombre;
    this.descripcion = r.descripcion;
    this.modulos = {
        USUARIOS: r.modulos.includes('USUARIOS'),
        CLIENTES: r.modulos.includes('CLIENTES'),
        PRODUCTOS: r.modulos.includes('PRODUCTOS'),
      PROVEEDORES: r.modulos.includes('PROVEEDORES')
  };
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
  mostrarForm = signal(false);

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
      this.modulos = { USUARIOS: false, CLIENTES: false, PRODUCTOS: false, PROVEEDORES: false };
    }
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
}