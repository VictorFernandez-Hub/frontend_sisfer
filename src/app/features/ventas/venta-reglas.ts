// Reglas y formatos que comparten las pantallas de Ventas.
// El backend vuelve a revisar estas reglas: aquí solo sirven para avisar antes de enviar.

// El precio de venta ya incluye IGV: el IGV se separa del total
export const IGV = 0.18;

// DNI 00000000 = "Cliente varios" (boletas rápidas). Viene en el script de la base
export const DOC_CLIENTE_VARIOS = '00000000';

// SUNAT exige identificar al comprador en boletas que pasan de este monto
export const TOPE_BOLETA_SIN_IDENTIFICAR = 700;

// Estas unidades no se parten. Metro, kilo y litro sí admiten decimales
export const UNIDADES_ENTERAS = ['UND', 'PQT', 'CJ'];

// MOD_VENTAS: rol con el módulo Ventas asignado en "Roles y accesos"
export const ROLES_REGISTRAR = ['ADMIN_NEGOCIO', 'ROLE_ADMIN_NEGOCIO', 'VENDEDOR', 'ROLE_VENDEDOR', 'MOD_VENTAS'];
export const ROLES_CONSULTAR = [...ROLES_REGISTRAR, 'GERENTE', 'ROLE_GERENTE'];
export const ROLES_ADMIN_NEGOCIO = ['ADMIN_NEGOCIO', 'ROLE_ADMIN_NEGOCIO'];

export function claseEstado(estado: string): string {
  switch (estado) {
    case 'CONFIRMADA': return 'bg-success-subtle text-success border border-success-subtle';
    case 'ANULADA': return 'bg-danger-subtle text-danger border border-danger-subtle';
    default: return 'bg-warning-subtle text-warning-emphasis border border-warning-subtle';
  }
}

export function redondear(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function soles(n: number): string {
  return 'S/ ' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
