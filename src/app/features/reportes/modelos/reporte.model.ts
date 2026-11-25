// Lo que devuelve /api/reportes. Montos en soles; las fechas llegan como yyyy-MM-dd.

export interface ResumenReporte {
  desde: string;
  hasta: string;
  totalVendido: number;
  numVentas: number;
  ticketPromedio: number;
  numAnuladas: number;
  montoAnuladas: number;
}

export interface VentaPorMetodo {
  metodo: string;
  ventas: number;
  monto: number;
}

export interface ProductoVendido {
  codigo: string;
  producto: string;
  categoria: string;
  unidad: string;
  cantidad: number;
  monto: number;
}

export interface VentaPorVendedor {
  vendedor: string;
  cuenta: string;
  ventas: number;
  monto: number;
}

// ---------------------------------------------------------- stock

export type NivelAlerta = 'AGOTADO' | 'STOCK_MINIMO';

export interface AlertaStock {
  codigo: string;
  producto: string;
  categoria: string;
  marca: string;
  stockActual: number;
  stockMinimo: number;
  nivel: NivelAlerta;
}
