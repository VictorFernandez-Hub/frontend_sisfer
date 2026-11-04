export type EstadoCompra = 'BORRADOR' | 'CONFIRMADA' | 'ANULADA';

// Una fila del listado de compras
export interface CompraResumen {
  idCompra: number;
  numero: string;
  fecCompra: string;
  proveedor: string;
  tipoDoc: string;
  numDoc: string;
  totTotal: number;
  estado: EstadoCompra;
  usuario: string;
}

export interface LineaCompraDetalle {
  idProducto: number;
  codigo: string;
  producto: string;
  unidad: string;
  cantidad: number;
  costoUnit: number;
  totLinea: number;
}

// Una compra con todos sus productos
export interface CompraDetalle {
  idCompra: number;
  numero: string;
  fecCompra: string;
  idProveedor: number;
  proveedor: string;
  tipoDoc: string;
  numDoc: string;
  totSubtotal: number;
  totIgv: number;
  totTotal: number;
  estado: EstadoCompra;
  observacion: string;
  usuario: string;
  lineas: LineaCompraDetalle[];
}

// Lo que se envía al backend para registrar una compra (queda en BORRADOR)
export interface CompraRequest {
  idProveedor: number;
  fecCompra: string;
  tipoDoc: string;
  numDoc: string;
  observacion: string;
  lineas: { idProducto: number; cantidad: number; costoUnit: number }[];
}
