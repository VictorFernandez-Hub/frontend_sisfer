export type NivelStock = 'OK' | 'STOCK_MINIMO' | 'AGOTADO';

export interface Producto {
  id_producto?: number;
  codigo: string;
  nombre: string;
  descripcion?: string;

  // Relaciones (se envían al backend)
  id_categoria: number;
  id_marca: number;
  id_unidad: number;
  id_proveedor: number | null;

  // Solo lectura (las devuelve el backend para mostrar en la tabla)
  proveedor?: string;
  categoria?: string;
  marca?: string;
  unidad?: string;
  unidad_codigo?: string;
  unidad_entera?: boolean;

  // Precios en soles: no se piden al registrar (el de compra lo fija la primera compra)
  precio_compra?: number;
  precio_venta?: number;

  // Stock: stock_actual es solo lectura (lo mueven compras, ventas y ajustes)
  stock_actual?: number;
  stock_inicial?: number; // Solo al crear: entra como ajuste y queda en el kardex
  costo_apertura?: number; // Solo el formulario: se envía como precio_compra si hay stock inicial
  stock_minimo: number;
  nivel_stock?: NivelStock;

  // Solo lectura: false si tiene movimientos; entonces solo se puede desactivar
  eliminable?: boolean;

  estado: 'ACTIVO' | 'INACTIVO';
  fec_registro?: string | Date;
  fec_modifica?: string | Date;
}
