import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-bitacora',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container-fluid py-4 px-4">
      <div class="d-flex align-items-center justify-content-center mb-3">
        <h4 class="text-white mb-0">Bitácora de actividad</h4>
        <span class="badge bg-secondary ms-3">{{ registros().length }} registros</span>
      </div>

      <div class="bg-dark text-white rounded-3 px-3 py-2 mb-2 d-flex gap-3 mx-auto" style="font-size:13px; max-width: 900px;">
        <div style="min-width:90px" class="fw-bold text-center">Fecha</div>
        <div style="min-width:140px" class="fw-bold text-center">Usuario</div>
        <div style="min-width:90px" class="fw-bold text-center">Acción</div>
        <div class="fw-bold text-center" style="width:420px">Detalle</div>
      </div>

      <div class="d-flex flex-column gap-2 mx-auto" style="max-width: 900px;">
        @for (b of registros(); track b.idBitacora) {
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

  ngOnInit(): void {
    this.http.get<any[]>('http://localhost:8080/api/bitacora', { withCredentials: true })
      .subscribe(data => this.registros.set(data));
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

  esEdicion(detalle: string): boolean {
    return !!detalle && detalle.includes('→');
  }

  tituloEdicion(detalle: string): string {
    const punto = detalle.indexOf('. ');
    return punto > 0 ? detalle.substring(0, punto) : '';
  }

  lineasEdicion(detalle: string): string[] {
    const punto = detalle.indexOf('. ');
    const resto = punto > 0 ? detalle.substring(punto + 2) : detalle;
    return resto.split(';').map(s => s.trim()).filter(s => s.length > 0);
  }
}