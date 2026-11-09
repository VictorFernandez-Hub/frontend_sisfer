export type EstadoVenta = 'BORRADOR' | 'CONFIRMADA' | 'ANULADA';

// Una fila del listado de ventas
export interface VentaResumen {
  idVenta: number;
  numero: string;
  fecVenta: string;
  cliente: string;
  docCliente: string;
  metodo: string;
  comprobante: string;      // B001-00000001 o vacío si sigue en borrador
  totTotal: number;
  estado: EstadoVenta;
  usuario: string;
}

export interface LineaVentaDetalle {
  idProducto: number;
  codigo: string;
  producto: string;
  unidad: string;
  cantidad: number;
  precioUnit: number;
  totLinea: number;
}

// Boleta o factura (no se envía a SUNAT)
export interface ComprobanteVenta {
  tipo: 'BOL' | 'FAC';
  nombre: string;
  serie: string;
  numero: number;
  numeroCompleto: string;
  fecEmision: string;
  estado: 'EMITIDO' | 'ANULADO';
}

// Una venta con todos sus productos
export interface VentaDetalle {
  idVenta: number;
  numero: string;
  fecVenta: string;
  idCliente: number;
  cliente: string;
  tipoDocCliente: string;
  numDocCliente: string;
  direccionCliente: string;
  idMetodo: number;
  metodo: string;
  codigoOperacion: string;
  totSubtotal: number;
  totIgv: number;
  totTotal: number;
  estado: EstadoVenta;
  observacion: string;
  usuario: string;
  comprobante: ComprobanteVenta | null;
  lineas: LineaVentaDetalle[];
}

// Lo que se envía al backend. Si precioUnit va vacío se usa el precio de venta del producto
export interface VentaRequest {
  idCliente: number;
  idMetodo: number;
  observacion: string;
  codigoOperacion: string;
  lineas: { idProducto: number; cantidad: number; precioUnit: number | null }[];
}

// Medio de pago o tipo de comprobante
export interface OpcionVenta {
  id: number;
  codigo: string;
  nombre: string;
}
