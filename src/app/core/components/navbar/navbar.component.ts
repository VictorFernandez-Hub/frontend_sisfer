import { Component, OnInit, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { filter } from 'rxjs';
import { API_URL } from '../../constants/api.constants';
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
  private http = inject(HttpClient);
  private ultimoModulo = '';

  isMenuOpen = signal<boolean>(false);
  username = this.authService.usuarioActual;
  userRoleName = signal<string>('');
  private modulosDelRol = signal<string[]>([]);

  //CONFIGURACION DE ROLES PARA QUE PUEDAN VER O MODIFCIAR
  readonly ROLES_CLIENTES = ['ADMIN_SISTEMA', 'ROLE_ADMIN_SISTEMA', 'ADMIN_NEGOCIO', 'ROLE_ADMIN_NEGOCIO', 'VENDEDOR', 'ROLE_VENDEDOR', 'GERENTE', 'ROLE_GERENTE'];
  readonly ROLES_PRODUCTOS = ['ADMIN_SISTEMA', 'ROLE_ADMIN_SISTEMA', 'ADMIN_NEGOCIO', 'ROLE_ADMIN_NEGOCIO', 'ALMACENERO', 'ROLE_ALMACENERO', 'VENDEDOR', 'ROLE_VENDEDOR', 'GERENTE', 'ROLE_GERENTE'];
  readonly ROLES_VENTAS = ['ADMIN_NEGOCIO', 'ROLE_ADMIN_NEGOCIO', 'VENDEDOR', 'ROLE_VENDEDOR', 'GERENTE', 'ROLE_GERENTE'];
  readonly ROLES_COBROS = ['ADMIN_SISTEMA', 'ROLE_ADMIN_SISTEMA', 'ADMIN_NEGOCIO', 'ROLE_ADMIN_NEGOCIO'];
  readonly ROLES_COMPRAS = ['ADMIN_SISTEMA', 'ROLE_ADMIN_SISTEMA','ADMIN_NEGOCIO', 'ROLE_ADMIN_NEGOCIO', 'ALMACENERO', 'ROLE_ALMACENERO', 'GERENTE', 'ROLE_GERENTE'];
  readonly ROLES_PROVEEDORES = ['ADMIN_SISTEMA', 'ROLE_ADMIN_SISTEMA', 'ADMIN_NEGOCIO', 'ROLE_ADMIN_NEGOCIO', 'ALMACENERO', 'ROLE_ALMACENERO', 'GERENTE', 'ROLE_GERENTE'];
  readonly ROLES_INVENTARIO = this.ROLES_PRODUCTOS;
  readonly ROLES_KARDEX = ['ADMIN_SISTEMA', 'ROLE_ADMIN_SISTEMA', 'ADMIN_NEGOCIO', 'ROLE_ADMIN_NEGOCIO', 'ALMACENERO', 'ROLE_ALMACENERO', 'GERENTE', 'ROLE_GERENTE'];
  readonly ROLES_REPORTES = ['ADMIN_SISTEMA', 'ROLE_ADMIN_SISTEMA','ADMIN_NEGOCIO', 'ROLE_ADMIN_NEGOCIO', 'GERENTE', 'ROLE_GERENTE'];
  readonly ROLES_USUARIOS = ['ADMIN_SISTEMA', 'ROLE_ADMIN_SISTEMA'];
  
  ngOnInit(): void {
    // Bitácora: anota cada módulo al que entra el usuario
    this.registrarIngreso(this.router.url);
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(e => this.registrarIngreso(e.urlAfterRedirects));

    this.rolService.listar().subscribe(lista => {
      const codigos = this.authService.rolesActuales()
        .map(r => r.replace('ROLE_', ''));
      const mio = lista.find(r => codigos.includes(r.codigo));
      this.modulosDelRol.set(mio?.modulos || []);
    });
  }

  private registrarIngreso(url: string): void {
    const ruta = (url || '').split(/[?#]/)[0].split('/').filter(Boolean)[0] ?? '';
    if (!ruta || ruta === this.ultimoModulo) return;
    this.ultimoModulo = ruta;
    this.http.post(`${API_URL}/bitacora/ingreso`, { ruta }, { withCredentials: true })
      .subscribe({ error: () => { /* La bitácora nunca debe interrumpir la navegación */ } });
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