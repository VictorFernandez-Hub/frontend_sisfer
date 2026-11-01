import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../../../../core/constants/api.constants';

@Component({
  selector: 'app-activar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="d-flex justify-content-center align-items-center vh-100" style="background:#1a1a1a;">
      <div class="bg-white rounded-3 shadow p-4" style="width:520px;">
        <h5 class="text-center mb-3" style="color:#f97316;">Activar cuenta</h5>
        @if (mensaje()) {
          <div class="alert" [class.alert-success]="exito()" [class.alert-danger]="!exito()">{{ mensaje() }}</div>
        }
        @if (!exito()) {
          <div class="d-flex gap-3 mb-3">
            <div class="flex-grow-1">
              <label class="form-label">Nueva clave</label>
              <div class="input-group mb-2">
                <input [type]="verClave() ? 'text' : 'password'" class="form-control" [(ngModel)]="clave" (focus)="mostrarReglas.set(true)" />
                <button type="button" class="btn btn-outline-secondary" (click)="verClave.set(!verClave())">
                  <i class="bi" [class.bi-eye]="!verClave()" [class.bi-eye-slash]="verClave()"></i>
                </button>
              </div>
              <label class="form-label">Confirmar clave</label>
              <div class="input-group">
                <input [type]="verConfirmar() ? 'text' : 'password'" class="form-control" [(ngModel)]="confirmar" />
                <button type="button" class="btn btn-outline-secondary" (click)="verConfirmar.set(!verConfirmar())">
                  <i class="bi" [class.bi-eye]="!verConfirmar()" [class.bi-eye-slash]="verConfirmar()"></i>
                </button>
              </div>
            </div>
            @if (mostrarReglas()) {
              <div class="border rounded p-2 small" style="min-width:180px;">
                <div class="fw-semibold mb-1">Tu clave debe tener:</div>
                <div [class.text-success]="tieneMin()" [class.text-danger]="!tieneMin()">1. Mínimo 8 caracteres</div>
                <div [class.text-success]="tieneMayus()" [class.text-danger]="!tieneMayus()">2. Una letra mayúscula</div>
                <div [class.text-success]="tieneMinus()" [class.text-danger]="!tieneMinus()">3. Una letra minúscula</div>
                <div [class.text-success]="tieneSimbolo()" [class.text-danger]="!tieneSimbolo()">4. Un símbolo</div>
              </div>
            }
          </div>
          <button class="btn w-100 text-white" style="background:#f97316;" (click)="activar()">Activar</button>
        }
      </div>
    </div>
  `
})
export class ActivarComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  token = '';
  clave = '';
  confirmar = '';
  mensaje = signal('');
  exito = signal(false);
  mostrarReglas = signal(false);
  verClave = signal(false);
  verConfirmar = signal(false);

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
  }

  tieneMin(): boolean { return this.clave.length >= 8; }
  tieneMayus(): boolean { return /[A-Z]/.test(this.clave); }
  tieneMinus(): boolean { return /[a-z]/.test(this.clave); }
  tieneSimbolo(): boolean { return /[^A-Za-z0-9]/.test(this.clave); }
  claveValida(): boolean { return this.tieneMin() && this.tieneMayus() && this.tieneMinus() && this.tieneSimbolo(); }

  activar(): void {
    if (!this.claveValida()) {
      this.mensaje.set('La clave no cumple lo requerido. Revísala.');
      this.exito.set(false);
      this.mostrarReglas.set(true);
      return;
    }
    if (this.clave !== this.confirmar) {
      this.mensaje.set('Las claves no coinciden.');
      this.exito.set(false);
      return;
    }
    this.http.post(`${API_URL}/auth/activar`, { token: this.token, clave: this.clave }, { responseType: 'text' })
      .subscribe({
        next: () => {
          this.exito.set(true);
          this.mensaje.set('Cuenta activada. Ya puedes entrar. Cierra esta ventana.');
        },
        error: () => {
          this.exito.set(false);
          this.mensaje.set('El enlace no es válido o venció.');
        }
      });
  }
}