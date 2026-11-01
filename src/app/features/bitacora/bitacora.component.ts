import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../../core/constants/api.constants';

@Component({
  selector: 'app-bitacora',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container-fluid py-4 px-4">
      <div class="d-flex align-items-center justify-content-center mb-3 gap-3">
        <h4 class="text-white mb-0">Bitácora de actividad</h4>
        <span class="badge bg-secondary">{{ filtrados().length }} registros</span>
      </div>
    
      <div class="rounded-3 shadow-sm p-3 mb-3 mx-auto" style="max-width:900px; background:#fff; border-top: 3px solid #f97316;">
  <div class="d-flex justify-content-center gap-4 mb-3">
    <div class="form-check">
      <input class="form-check-input" type="radio" name="modo" id="modoDia"
        [checked]="modo() === 'rango'" (change)="modo.set('rango')"
        style="accent-color:#f97316;" />
      <label class="form-check-label fw-semibold" for="modoDia">Por rango de fechas</label>
    </div>
    <div class="form-check">
      <input class="form-check-input" type="radio" name="modo" id="modoMes"
        [checked]="modo() === 'mes'" (change)="modo.set('mes')"
        style="accent-color:#f97316;" />
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
    <button class="btn btn-sm btn-outline-secondary" (click)="limpiar()">Limpiar</button>
    <button class="btn btn-sm text-white" style="background:#f97316;" (click)="descargar()">Descargar Excel</button>
  </div>
</div>
      <div class="bg-dark text-white rounded-3 px-3 py-2 mb-2 d-flex gap-3 mx-auto" style="font-size:13px; max-width:900px;">
        <div style="min-width:90px" class="fw-bold text-center">Fecha</div>
        <div style="min-width:140px" class="fw-bold text-center">Usuario</div>
        <div style="min-width:90px" class="fw-bold text-center">Acción</div>
        <div class="fw-bold text-center" style="width:420px">Detalle</div>
      </div>

      <div class="d-flex flex-column gap-2 mx-auto" style="max-width:900px;">
        @for (b of filtrados(); track b.idBitacora) {
          <div class="bg-white rounded-3 shadow-sm p-3 d-flex gap-3 align-items-start">
            <div class="text-center" style="min-width:90px;">
              <div class="fw-bold" style="color:#f97316; font-size:14px;">{{ b.fecEvento | date:'HH:mm:ss' }}</div>
              <div class="fw-semibold text-dark" style="font-size:12px;">{{ b.fecEvento | date:'dd/MM/yyyy' }}</div>
            </div>
            <div class="text-center" style="min-width:140px;">
              <div class="fw-semibold">{{ b.cuenta }}</div>
              <span class="badge mt-1" [class]="colorModulo(b.modulo)">{{ b.modulo }}</span>
            </div>
            <div class="text-center" style="min-width:90px;">
              <span class="badge" [class]="colorAccion(b.accion)">{{ b.accion }}</span>
            </div>
            <div class="text-center" style="width:420px; font-size:14px; line-height:1.6;">
              @if (esEdicion(b.detalle)) {
                <div class="fw-semibold mb-1">{{ tituloEdicion(b.detalle) }}</div>
                <ol class="mb-0 ps-3 d-inline-block text-start">
                  @for (linea of lineasEdicion(b.detalle); track $index) {
                    <li>{{ linea }}</li>
                  }
                </ol>
              } @else {
                {{ b.detalle }}
              }
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class BitacoraComponent implements OnInit {
  private http = inject(HttpClient);
  registros = signal<any[]>([]);
  modo = signal<'rango' | 'mes'>('rango');
  desde = signal('');
  hasta = signal('');
  mes = signal('');

  filtrados = computed(() => {
    const lista = this.registros();
    if (this.modo() === 'mes' && this.mes()) {
      return lista.filter(b => (b.fecEvento ?? '').startsWith(this.mes()));
    }
    if (this.modo() === 'rango') {
      const d = this.desde();
      const h = this.hasta();
      return lista.filter(b => {
        const fecha = (b.fecEvento ?? '').substring(0, 10);
        if (d && fecha < d) return false;
        if (h && fecha > h) return false;
        return true;
      });
    }
    return lista;
  });

  ngOnInit(): void {
    this.http.get<any[]>(`${API_URL}/bitacora`, { withCredentials: true })
      .subscribe(data => this.registros.set(data));
  }

  limpiar(): void {
    this.desde.set('');
    this.hasta.set('');
    this.mes.set('');
  }

  descargar(): void {
    const filas = this.filtrados();
    const encabezado = 'Fecha,Usuario,Módulo,Acción,Detalle';
    const lineas = filas.map(b => {
      const fecha = (b.fecEvento ?? '').replace('T', ' ');
      const detalle = (b.detalle ?? '').replace(/"/g, '""');
      return `"${fecha}","${b.cuenta}","${b.modulo}","${b.accion}","${detalle}"`;
    });
    const csv = [encabezado, ...lineas].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
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
      case 'CREAR': return 'bg-success';
      case 'EDITAR': return 'bg-warning text-dark';
      case 'ELIMINAR': return 'bg-danger';
      default: return 'bg-info text-dark';
    }
  }

  colorModulo(modulo: string): string {
    switch (modulo) {
      case 'USUARIOS': return 'bg-primary';
      case 'CLIENTES': return 'bg-success';
      case 'PRODUCTOS': return 'bg-warning text-dark';
      case 'PROVEEDORES': return 'bg-info text-dark';
      case 'SEGURIDAD': return 'bg-dark';
      default: return 'bg-secondary';
    }
  }

  esEdicion(detalle: string): boolean { return !!detalle && detalle.includes('→'); }
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