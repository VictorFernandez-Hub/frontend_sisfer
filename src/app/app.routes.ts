import { Routes } from '@angular/router';
import { MainLayoutComponent } from './core/components/main-layout/main-layout.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES)
  },

  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'clientes',
        loadComponent: () => import('./features/clientes')
          .then(m => m.ClienteListaComponent)
      },
      {
        path: 'proveedores',
        loadComponent: () => import('./features/proveedores')
          .then(m => m.ProveedorListaComponent)
      },
      {
        path: 'productos',
        loadComponent: () => import('./features/productos')
          .then(m => m.ProductoListaComponent)
      },
      {
        path: 'usuarios',
        loadComponent: () => import('./features/usuarios')
          .then(m => m.UsuarioListaComponent)
      },
      {
        path: 'roles',
        loadComponent: () => import('./features/roles/rol-lista/rol-lista.component')
          .then(m => m.RolListaComponent)
      },

      {
        path: 'bitacora',
        loadComponent: () => import('./features/bitacora/bitacora.component')
          .then(m => m.BitacoraComponent)
      },
    ]
  },

  {
    path: '**',
    redirectTo: 'auth/login'
  }
];