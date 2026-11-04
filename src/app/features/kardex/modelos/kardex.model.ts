// Tipos de movimiento que guarda la base de datos (tabla kardex)
export type TipoMovimiento =
  | 'ENTRADA_COMPRA'
  | 'SALIDA_VENTA'
  | 'AJUSTE_ENTRADA'
  | 'AJUSTE_SALIDA'
  | 'ANULACION_COMPRA'
  | 'ANULACION_VENTA';

// Un movimiento del Kardex (ERS RI005: fecha, producto, tipo, cantidad,
// stock anterior, stock actual y usuario responsable)
export interface MovimientoKardex {
  idKardex: number;
  codigo: string;
  producto: string;
  fecMov: string;           // fecha y hora en formato ISO
  tipoMov: TipoMovimiento;
  documento: 'COMPRA' | 'VENTA' | 'AJUSTE';
  idDoc: number;            // número de la compra, venta o ajuste
  cantidad: number;
  stockAnt: number;
  stockNuevo: number;
  costoUnit: number;
  usuario: string;
}
