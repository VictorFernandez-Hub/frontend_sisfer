import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { RolService } from '../../../features/usuarios/servicios/rol.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private rolService = inject(RolService);

  isMenuOpen = signal<boolean>(false);
  username = this.authService.usuarioActual;
  private modulosDelRol = signal<string[]>([]);

  //CONFIGURACION DE ROLES PARA QUE PUEDAN VER O MODIFCIAR
  readonly ROLES_CLIENTES = ['ADMIN_SISTEMA', 'ROLE_ADMIN_SISTEMA', 'ADMIN_NEGOCIO', 'ROLE_ADMIN_NEGOCIO', 'VENDEDOR', 'ROLE_VENDEDOR', 'GERENTE', 'ROLE_GERENTE'];
  readonly ROLES_PRODUCTOS = ['ADMIN_SISTEMA', 'ROLE_ADMIN_SISTEMA', 'ADMIN_NEGOCIO', 'ROLE_ADMIN_NEGOCIO', 'ALMACENERO', 'ROLE_ALMACENERO', 'VENDEDOR', 'ROLE_VENDEDOR', 'GERENTE', 'ROLE_GERENTE'];
  readonly ROLES_VENTAS = ['ADMIN_NEGOCIO', 'ROLE_ADMIN_NEGOCIO', 'VENDEDOR', 'ROLE_VENDEDOR', 'GERENTE', 'ROLE_GERENTE'];
  readonly ROLES_COMPRAS = ['ADMIN_NEGOCIO', 'ROLE_ADMIN_NEGOCIO', 'ALMACENERO', 'ROLE_ALMACENERO', 'GERENTE', 'ROLE_GERENTE'];
  readonly ROLES_PROVEEDORES = ['ADMIN_SISTEMA', 'ROLE_ADMIN_SISTEMA', 'ADMIN_NEGOCIO', 'ROLE_ADMIN_NEGOCIO', 'ALMACENERO', 'ROLE_ALMACENERO', 'GERENTE', 'ROLE_GERENTE'];
  readonly ROLES_REPORTES = ['ADMIN_NEGOCIO', 'ROLE_ADMIN_NEGOCIO', 'GERENTE', 'ROLE_GERENTE'];
  readonly ROLES_USUARIOS = ['ADMIN_SISTEMA', 'ROLE_ADMIN_SISTEMA'];
  
  ngOnInit(): void {
    this.rolService.listar().subscribe(lista => {
      const codigos = this.authService.rolesActuales()
        .map(r => r.replace('ROLE_', ''));
      const mio = lista.find(r => codigos.includes(r.codigo));
      this.modulosDelRol.set(mio?.modulos || []);
    });
  }

  tieneModulo(modulo: string): boolean {
    return this.modulosDelRol().includes(modulo);
  }

  toggleMenu(): void {
    this.isMenuOpen.update(prev => !prev);
  }

  closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  tieneRol(rolesPermitidos: string[]): boolean {
    return this.authService.tieneRol(rolesPermitidos);
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/auth/login']);
      }
    });
  }
}