import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../../core/constants/api.constants';

interface RegistroBitacora {
  idBitacora: number;
  fecEvento: string;
  cuenta: string;
  rol: string;
  modulo: string;
  accion: string;
  idRegistro: string;
  detalle: string;
  ipOrigen: string;
  exito: boolean;
}

@Component({
  selector: 'app-bitacora',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container-fluid py-4 px-4">
      <div class="d-flex align-items-center justify-content-center mb-3 gap-3 flex-wrap">
        <h4 class="text-white mb-0">Bitácora de auditoría</h4>
        <span class="badge bg-secondary">{{ filtrados().length }} registros</span>
        @if (fallos() > 0) {
          <span class="badge bg-danger">{{ fallos() }} intentos fallidos o denegados</span>
        }
      </div>

      <div class="rounded-3 shadow-sm p-3 mb-3 mx-auto" style="max-width:1100px; background:#fff; border-top: 3px solid #f97316;">
        <div class="d-flex justify-content-center gap-4 mb-3">
          <div class="form-check">
            <input class="form-check-input" type="radio" name="modo" id="modoDia"
              [checked]="modo() === 'rango'" (change)="modo.set('rango')" style="accent-color:#f97316;" />
            <label class="form-check-label fw-semibold" for="modoDia">Por rango de fechas</label>
          </div>
          <div class="form-check">
            <input class="form-check-input" type="radio" name="modo" id="modoMes"
              [checked]="modo() === 'mes'" (change)="modo.set('mes')" style="accent-color:#f97316;" />
            <label class="form-check-label fw-semibold" for="modoMes">Por mes</label>
          </div>
        </div>

        <div class="d-flex flex-wrap gap-3 align-items-end justify-content-center">
          @if (modo() === 'rango') {
            <div>
              <label class="form-label small mb-1 fw-semibold">Desde</label>
              <input type="date" class="form-control form-control-sm" [ngModel]="desde()" (ngModelChange)="desde.set($event)" />
            </div>
            <div>
              <label class="form-label small mb-1 fw-semibold">Hasta</label>
              <input type="date" class="form-control form-control-sm" [ngModel]="hasta()" (ngModelChange)="hasta.set($event)" />
            </div>
          } @else {
            <div>
              <label class="form-label small mb-1 fw-semibold">Mes</label>
              <input type="month" class="form-control form-control-sm" [ngModel]="mes()" (ngModelChange)="mes.set($event)" />
            </div>
          }
          <div>
            <label class="form-label small mb-1 fw-semibold">Usuario</label>
            <select class="form-select form-select-sm" [ngModel]="usuario()" (ngModelChange)="usuario.set($event)">
              <option value="">Todos</option>
              @for (u of opciones().usuarios; track u) { <option [value]="u">{{ u }}</option> }
            </select>
          </div>
          <div>
            <label class="form-label small mb-1 fw-semibold">Módulo</label>
            <select class="form-select form-select-sm" [ngModel]="modulo()" (ngModelChange)="modulo.set($event)">
              <option value="">Todos</option>
              @for (m of opciones().modulos; track m) { <option [value]="m">{{ m }}</option> }
            </select>
          </div>
          <div>
            <label class="form-label small mb-1 fw-semibold">Acción</label>
            <select class="form-select form-select-sm" [ngModel]="accion()" (ngModelChange)="accion.set($event)">
              <option value="">Todas</option>
              @for (a of opciones().acciones; track a) { <option [value]="a">{{ a }}</option> }
            </select>
          </div>
          <div>
            <label class="form-label small mb-1 fw-semibold">Resultado</label>
            <select class="form-select form-select-sm" [ngModel]="resultado()" (ngModelChange)="resultado.set($event)">
              <option value="">Todos</option>
              <option value="ok">Correcto</option>
              <option value="fallo">Fallido / denegado</option>
            </select>
          </div>
          <div>
            <label class="form-label small mb-1 fw-semibold">Buscar en el detalle</label>
            <input type="search" class="form-control form-control-sm" placeholder="Ej. HER-001, precio…"
              [ngModel]="texto()" (ngModelChange)="texto.set($event)" />
          </div>
          <button class="btn btn-sm btn-outline-secondary" (click)="limpiar()">Limpiar</button>
          <button class="btn btn-sm btn-outline-secondary" (click)="cargar()" [disabled]="cargando()">Actualizar</button>
          <button class="btn btn-sm text-white" style="background:#f97316;" (click)="descargar()">Descargar Excel</button>
        </div>
      </div>

      <div class="bg-dark text-white rounded-3 px-3 py-2 mb-2 d-flex gap-3 mx-auto" style="font-size:13px; max-width:1100px;">
        <div style="min-width:90px" class="fw-bold text-center">Fecha</div>
        <div style="min-width:150px" class="fw-bold text-center">Usuario</div>
        <div style="min-width:130px" class="fw-bold text-center">Acción</div>
        <div class="fw-bold text-center flex-grow-1">Detalle</div>
        <div style="min-width:110px" class="fw-bold text-center">Origen</div>
      </div>

      @if (cargando()) {
        <div class="text-center text-white-50 py-4">Cargando…</div>
      }

      <div class="d-flex flex-column gap-2 mx-auto" style="max-width:1100px;">
        @for (b of filtrados(); track b.idBitacora) {
          <div class="bg-white rounded-3 shadow-sm p-3 d-flex gap-3 align-items-start"
            [style.border-left]="b.exito ? '4px solid transparent' : '4px solid #dc3545'">
            <div class="text-center" style="min-width:90px;">
              <div class="fw-bold" style="color:#f97316; font-size:14px;">{{ b.fecEvento | date:'HH:mm:ss' }}</div>
              <div class="fw-semibold text-dark" style="font-size:12px;">{{ b.fecEvento | date:'dd/MM/yyyy' }}</div>
            </div>
            <div class="text-center" style="min-width:150px;">
              <div class="fw-semibold">{{ b.cuenta }}</div>
              @if (b.rol) { <div class="text-secondary" style="font-size:11px;">{{ b.rol }}</div> }
              <span class="badge mt-1" [class]="colorModulo(b.modulo)">{{ b.modulo }}</span>
            </div>
            <div class="text-center" style="min-width:130px;">
              <span class="badge" [class]="colorAccion(b.accion)">{{ b.accion }}</span>
              @if (!b.exito) { <div><span class="badge bg-danger mt-1">FALLIDO</span></div> }
              @if (b.idRegistro) { <div class="text-secondary mt-1" style="font-size:11px;">Registro #{{ b.idRegistro }}</div> }
            </div>
            <div class="flex-grow-1" style="font-size:14px; line-height:1.6;">
              @if (esEdicion(b.detalle)) {
                <div class="fw-semibold mb-1">{{ tituloEdicion(b.detalle) }}</div>
                <ol class="mb-0 ps-3">
                  @for (linea of lineasEdicion(b.detalle); track $index) {
                    <li>{{ linea }}</li>
                  }
                </ol>
              } @else {
                {{ b.detalle }}
              }
            </div>
            <div class="text-center text-secondary" style="min-width:110px; font-size:12px;">
              {{ b.ipOrigen || '—' }}
            </div>
          </div>
        } @empty {
          @if (!cargando()) {
            <div class="text-center text-white-50 py-4">No hay registros con estos filtros.</div>
          }
        }
      </div>
    </div>
  `
})
export class BitacoraComponent implements OnInit {
  private http = inject(HttpClient);
  registros = signal<RegistroBitacora[]>([]);
  cargando = signal(false);

  modo = signal<'rango' | 'mes'>('rango');
  desde = signal('');
  hasta = signal('');
  mes = signal('');
  usuario = signal('');
  modulo = signal('');
  accion = signal('');
  resultado = signal<'' | 'ok' | 'fallo'>('');
  texto = signal('');

  // Valores de los combos, tomados de los propios registros
  opciones = computed(() => {
    const lista = this.registros();
    const unicos = (f: (b: RegistroBitacora) => string) =>
      [...new Set(lista.map(f).filter(Boolean))].sort();
    return {
      usuarios: unicos(b => b.cuenta),
      modulos: unicos(b => b.modulo),
      acciones: unicos(b => b.accion)
    };
  });

  filtrados = computed(() => {
    const d = this.desde(), h = this.hasta(), m = this.mes();
    const u = this.usuario(), mod = this.modulo(), a = this.accion(), r = this.resultado();
    const t = this.texto().trim().toLowerCase();
    return this.registros().filter(b => {
      const fecha = (b.fecEvento ?? '').substring(0, 10);
      if (this.modo() === 'mes' && m && !fecha.startsWith(m)) return false;
      if (this.modo() === 'rango') {
        if (d && fecha < d) return false;
        if (h && fecha > h) return false;
      }
      if (u && b.cuenta !== u) return false;
      if (mod && b.modulo !== mod) return false;
      if (a && b.accion !== a) return false;
      if (r === 'ok' && !b.exito) return false;
      if (r === 'fallo' && b.exito) return false;
      if (t && !(`${b.detalle} ${b.idRegistro}`.toLowerCase().includes(t))) return false;
      return true;
    });
  });

  fallos = computed(() => this.filtrados().filter(b => !b.exito).length);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.http.get<RegistroBitacora[]>(`${API_URL}/bitacora`, { withCredentials: true })
      .subscribe({
        next: data => { this.registros.set(data); this.cargando.set(false); },
        error: () => this.cargando.set(false)
      });
  }

  limpiar(): void {
    this.desde.set('');
    this.hasta.set('');
    this.mes.set('');
    this.usuario.set('');
    this.modulo.set('');
    this.accion.set('');
    this.resultado.set('');
    this.texto.set('');
  }

  descargar(): void {
    const celda = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const encabezado = 'Fecha,Usuario,Rol,Módulo,Acción,Registro,Resultado,IP,Detalle';
    const lineas = this.filtrados().map(b => [
      (b.fecEvento ?? '').replace('T', ' '), b.cuenta, b.rol, b.modulo, b.accion,
      b.idRegistro, b.exito ? 'Correcto' : 'Fallido', b.ipOrigen, b.detalle
    ].map(celda).join(','));
    const csv = [encabezado, ...lineas].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bitacora.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  colorAccion(accion: string): string {
    switch (accion) {
      case 'LOGIN': return 'bg-primary';
      case 'LOGOUT':
      case 'SESION_EXPIRADA': return 'bg-secondary';
      case 'INGRESO': return 'bg-light text-dark border';
      case 'CREAR': return 'bg-success';
      case 'EDITAR':
      case 'CAMBIAR_PRECIO': return 'bg-warning text-dark';
      case 'CONFIRMAR':
      case 'ACTIVAR': return 'bg-success';
      case 'ELIMINAR':
      case 'ANULAR':
      case 'DESACTIVAR': return 'bg-danger';
      case 'LOGIN_FALLIDO':
      case 'LOGIN_RECHAZADO':
      case 'BLOQUEO':
      case 'ACCESO_DENEGADO': return 'bg-danger';
      default: return 'bg-info text-dark';
    }
  }

  colorModulo(modulo: string): string {
    switch (modulo) {
      case 'USUARIOS':
      case 'ROLES':
      case 'BITACORA': return 'bg-primary';
      case 'SEGURIDAD': return 'bg-dark';
      case 'CLIENTES':
      case 'VENTAS': return 'bg-success';
      case 'PRODUCTOS':
      case 'INVENTARIO':
      case 'KARDEX': return 'bg-warning text-dark';
      case 'PROVEEDORES':
      case 'COMPRAS': return 'bg-info text-dark';
      default: return 'bg-secondary';
    }
  }

  esEdicion(detalle: string): boolean { return !!detalle && detalle.includes('→') && detalle.includes(';'); }
  tituloEdicion(detalle: string): string {
    const p = detalle.indexOf('. ');
    return p > 0 ? detalle.substring(0, p) : '';
  }
  lineasEdicion(detalle: string): string[] {
    const p = detalle.indexOf('. ');
    const resto = p > 0 ? detalle.substring(p + 2) : detalle;
    return resto.split(';').map(s => s.trim()).filter(s => s.length > 0);
  }
}
