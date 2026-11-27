import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { extraerMensajeError } from '../../../shared/utils/http-error.util';
import {
  AlertaStock, ProductoVendido, ResumenReporte, VentaPorMetodo, VentaPorVendedor, VentaRegistro
} from '../modelos/reporte.model';
import { ReporteService } from '../servicios/reporte.service';

type Pestana = 'ventas' | 'metodos' | 'vendidos' | 'vendedores' | 'alertas';
type Atajo = 'hoy' | 'semana' | 'mes';
type FiltroEstado = 'TODAS' | 'CONFIRMADA' | 'ANULADA';

interface OpcionPestana { id: Pestana; texto: string; icono: string; }

// Mismos roles que el enlace del menú y que SecurityConfig (/api/reportes/**).
// Son quienes ven las ventas de todo el negocio; el vendedor ve las suyas en el módulo Ventas
const ROLES_REPORTES = ['ADMIN_SISTEMA', 'ROLE_ADMIN_SISTEMA', 'ADMIN_NEGOCIO', 'ROLE_ADMIN_NEGOCIO', 'GERENTE', 'ROLE_GERENTE'];

@Component({
  selector: 'app-reporte-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reporte-panel.component.html',
  styleUrls: ['./reporte-panel.component.css']
})
export class ReportePanelComponent implements OnInit {
  private readonly reporteService = inject(ReporteService);
  private readonly authService = inject(AuthService);
  private readonly notificacion = inject(NotificationService);

  readonly puedeConsultar = this.authService.tieneRol(ROLES_REPORTES);

  readonly pestanas: OpcionPestana[] = [
    { id: 'ventas', texto: 'Ventas del periodo', icono: 'bi-list-ul' },
    { id: 'metodos', texto: 'Medios de pago', icono: 'bi-wallet2' },
    { id: 'vendidos', texto: 'Más vendidos', icono: 'bi-trophy' },
    { id: 'vendedores', texto: 'Por vendedor', icono: 'bi-person-badge' },
    { id: 'alertas', texto: 'Alertas de stock', icono: 'bi-exclamation-triangle' }
  ];
  pestana = signal<Pestana>('ventas');

  readonly filtros: { id: FiltroEstado; texto: string }[] = [
    { id: 'TODAS', texto: 'Todas' },
    { id: 'CONFIRMADA', texto: 'Confirmadas' },
    { id: 'ANULADA', texto: 'Anuladas' }
  ];
  filtroEstado = signal<FiltroEstado>('TODAS');

  resumen = signal<ResumenReporte | null>(null);
  ventas = signal<VentaRegistro[]>([]);
  metodos = signal<VentaPorMetodo[]>([]);
  vendidos = signal<ProductoVendido[]>([]);
  vendedores = signal<VentaPorVendedor[]>([]);
  // Stock (no depende de las fechas)
  alertas = signal<AlertaStock[]>([]);

  cargando = signal<boolean>(false);
  cargaInicial = signal<boolean>(true);
  descargando = signal<boolean>(false);
  descargandoExcel = signal<boolean>(false);
  errorFechas = signal<string>('');

  // Por defecto, el mes actual (igual que el backend)
  desde = this.inicioMes();
  hasta = this.finMes();

  // Base de los porcentajes: lo cobrado en el periodo
  totalMetodos = computed(() => this.metodos().reduce((suma, m) => suma + Number(m.monto), 0));
  totalAgotados = computed(() => this.alertas().filter(a => a.nivel === 'AGOTADO').length);

  // Filtro de la lista de ventas: se aplica aquí, sin volver a pedir al backend
  ventasFiltradas = computed(() => {
    const f = this.filtroEstado();
    return f === 'TODAS' ? this.ventas() : this.ventas().filter(v => v.estado === f);
  });
  // Igual que la tarjeta "Total vendido": una anulada no suma, salvo cuando se miran solo las anuladas
  totalFiltrado = computed(() => {
    const soloAnuladas = this.filtroEstado() === 'ANULADA';
    return this.ventasFiltradas()
      .filter(v => soloAnuladas || v.estado !== 'ANULADA')
      .reduce((suma, v) => suma + Number(v.total), 0);
  });

  cuantas(f: FiltroEstado): number {
    return f === 'TODAS' ? this.ventas().length : this.ventas().filter(v => v.estado === f).length;
  }

  elegirFiltro(f: FiltroEstado): void {
    this.filtroEstado.set(f);
  }

  ngOnInit(): void {
    // Un rol sin acceso que escribe la dirección a mano no llega a pedir nada al backend
    if (!this.puedeConsultar) return;
    this.cargar();
  }

  // Los datos anteriores se mantienen mientras carga: la pantalla no se vacía ni salta
  cargar(): void {
    if (!this.fechasValidas()) return;

    this.cargando.set(true);
    forkJoin({
      resumen: this.reporteService.resumen(this.desde, this.hasta),
      ventas: this.reporteService.ventas(this.desde, this.hasta),
      metodos: this.reporteService.porMetodo(this.desde, this.hasta),
      vendidos: this.reporteService.topProductos(this.desde, this.hasta, 10),
      vendedores: this.reporteService.porVendedor(this.desde, this.hasta),
      alertas: this.reporteService.alertasStock()
    }).subscribe({
      next: (d) => {
        this.resumen.set(d.resumen);
        this.ventas.set(d.ventas);
        this.metodos.set(d.metodos);
        this.vendidos.set(d.vendidos);
        this.vendedores.set(d.vendedores);
        this.alertas.set(d.alertas);
        this.cargando.set(false);
        this.cargaInicial.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.notificacion.mostrar(extraerMensajeError(err, 'No se pudo cargar el reporte de ventas.'), 'error');
        this.cargando.set(false);
        this.cargaInicial.set(false);
      }
    });
  }

  private fechasValidas(): boolean {
    this.errorFechas.set('');
    if (!this.desde || !this.hasta) {
      this.errorFechas.set('Elija las dos fechas.');
      return false;
    }
    if (this.desde > this.hasta) {
      this.errorFechas.set('"Desde" no puede ser posterior a "Hasta".');
      return false;
    }
    return true;
  }

  elegirPestana(p: Pestana): void {
    this.pestana.set(p);
  }

  // ---------------------------------------------------------- fechas

  usarAtajo(atajo: Atajo): void {
    const [d, h] = this.rangoDe(atajo);
    this.desde = d;
    this.hasta = h;
    this.cargar();
  }

  atajoActivo(atajo: Atajo): boolean {
    const [d, h] = this.rangoDe(atajo);
    return this.desde === d && this.hasta === h;
  }

  // Hoy; la semana de lunes a domingo; el mes completo
  private rangoDe(atajo: Atajo): [string, string] {
    const hoy = new Date();
    if (atajo === 'hoy') return [this.texto(hoy), this.texto(hoy)];
    if (atajo === 'semana') {
      const lunes = new Date(hoy);
      lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
      const domingo = new Date(lunes);
      domingo.setDate(lunes.getDate() + 6);
      return [this.texto(lunes), this.texto(domingo)];
    }
    return [this.inicioMes(), this.finMes()];
  }

  private inicioMes(): string {
    const hoy = new Date();
    return this.texto(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  }

  private finMes(): string {
    const hoy = new Date();
    return this.texto(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0));
  }

  // yyyy-MM-dd con la fecha local (toISOString usaría UTC y podría correr un día)
  private texto(d: Date): string {
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
  }

  // ---------------------------------------------------------- vistas

  porcentaje(monto: number, total: number): number {
    return total > 0 ? Math.round((Number(monto) / total) * 1000) / 10 : 0;
  }

  // ---------------------------------------------------------- PDF

  // La pestaña se abre al hacer clic: si se abre después de la descarga, el navegador la bloquea
  descargarPdf(): void {
    if (!this.fechasValidas()) return;
    const nombre = `Reporte-ventas-${this.desde}_${this.hasta}.pdf`;
    const ventana = window.open('', '_blank');
    this.descargando.set(true);
    this.reporteService.pdf(this.desde, this.hasta).subscribe({
      next: (pdf) => {
        this.descargando.set(false);
        const url = URL.createObjectURL(pdf);
        if (ventana) {
          ventana.location.href = url;
        } else {
          // Si el navegador bloqueó la pestaña, el PDF se descarga
          const enlace = document.createElement('a');
          enlace.href = url;
          enlace.download = nombre;
          document.body.appendChild(enlace);
          enlace.click();
          enlace.remove();
        }
        // Se libera después: si se libera al instante, la pestaña queda en blanco
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      },
      error: (err: HttpErrorResponse) => {
        this.descargando.set(false);
        ventana?.close();
        this.notificacion.mostrar(extraerMensajeError(err, 'No se pudo generar el PDF.'), 'error');
      }
    });
  }

  // ---------------------------------------------------------- Excel

  // El Excel no se puede ver en el navegador: siempre se descarga
  descargarExcel(): void {
    if (!this.fechasValidas()) return;
    this.descargandoExcel.set(true);
    this.reporteService.excel(this.desde, this.hasta).subscribe({
      next: (archivo) => {
        this.descargandoExcel.set(false);
        const url = URL.createObjectURL(archivo);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = `Reporte-ventas-${this.desde}_${this.hasta}.xlsx`;
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      },
      error: (err: HttpErrorResponse) => {
        this.descargandoExcel.set(false);
        this.notificacion.mostrar(extraerMensajeError(err, 'No se pudo generar el Excel.'), 'error');
      }
    });
  }
}
