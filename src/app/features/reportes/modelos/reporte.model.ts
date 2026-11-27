// Lo que devuelve /api/reportes. Montos en soles; las fechas llegan como yyyy-MM-dd.

export interface ResumenReporte {
  desde: string;
  hasta: string;
  totalVendido: number;
  numVentas: number;
  numAnuladas: number;
  montoAnuladas: number;
}

// Una venta del periodo (confirmada o anulada). La fecha llega como yyyy-MM-ddTHH:mm:ss
export type EstadoVenta = 'CONFIRMADA' | 'ANULADA';

export interface VentaRegistro {
  numero: string;
  fecha: string;
  comprobante: string;
  cliente: string;
  vendedor: string;
  metodo: string;
  total: number;
  estado: EstadoVenta;
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
