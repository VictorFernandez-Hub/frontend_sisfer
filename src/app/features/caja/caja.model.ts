// Caja del turno de ventas (mismos datos que CajaDetalle y CajaFila del backend)

export type EstadoCaja = 'ABIERTA' | 'CERRADA';
export type TipoMovimiento = 'INGRESO' | 'EGRESO';

export interface CajaPorMetodo {
  codigo: string;
  metodo: string;
  ventas: number;
  total: number;
}

export interface CajaMovimiento {
  idMovimiento: number;
  tipo: TipoMovimiento;
  monto: number;
  motivo: string;
  fecha: string;
  usuario: string;
}

export interface CajaVenta {
  idVenta: number;
  numero: string;
  fecVenta: string;
  cliente: string;
  metodo: string;
  comprobante: string;
  total: number;
  estado: string;
}

export interface CajaDetalle {
  idCaja: number;
  numero: string;
  usuario: string;
  nombreUsuario: string;
  fecApertura: string;
  montoApertura: number;
  entregadoPor: string | null;
  nombreEntregadoPor: string | null;
  obsApertura: string;
  fecCierre: string | null;
  cerradoPor: string | null;
  estado: EstadoCaja;
  deOtroDia: boolean;
  numVentas: number;
  numAnuladas: number;
  totalVentas: number;
  ventasEfectivo: number;
  ingresos: number;
  egresos: number;
  efectivoEsperado: number;
  efectivoContado: number | null;
  diferencia: number | null;
  obsCierre: string;
  porMetodo: CajaPorMetodo[];
  movimientos: CajaMovimiento[];
  ventas: CajaVenta[];
}

export interface CajaActual {
  abierta: boolean;
  caja: CajaDetalle | null;
  fondoMaximo: number;
}

// Persona que entrega el fondo inicial al abrir la caja
export interface EntregadorFondo {
  idUsuario: number;
  cuenta: string;
  nombre: string;
  rol: string;
  codigoRol: string;
}

export interface CajaFila {
  idCaja: number;
  numero: string;
  usuario: string;
  nombreUsuario: string;
  fecApertura: string;
  fecCierre: string | null;
  montoApertura: number;
  entregadoPor: string | null;
  numVentas: number;
  totalVentas: number;
  efectivoEsperado: number | null;
  efectivoContado: number | null;
  diferencia: number | null;
  estado: EstadoCaja;
}

// Billetes y monedas en soles, para contar el efectivo sin calculadora
export const DENOMINACIONES = [200, 100, 50, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1];

// Quienes cobran ventas y por eso trabajan con caja (mismos roles que SecurityConfig)
export const ROLES_CAJA = ['ADMIN_NEGOCIO', 'ROLE_ADMIN_NEGOCIO', 'VENDEDOR', 'ROLE_VENDEDOR', 'MOD_VENTAS'];
// Ven las cajas de todos los vendedores
export const ROLES_SUPERVISAR_CAJA = ['ADMIN_NEGOCIO', 'ROLE_ADMIN_NEGOCIO', 'GERENTE', 'ROLE_GERENTE'];
// Pueden cerrar la caja que otro vendedor dejó abierta
export const ROLES_CERRAR_AJENA = ['ADMIN_NEGOCIO', 'ROLE_ADMIN_NEGOCIO'];
