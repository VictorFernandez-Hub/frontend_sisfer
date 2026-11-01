export type TipoDocProveedor = 'RUC' | 'DNI' | 'CE' | 'PAS';

export interface Proveedor {
  id_proveedor?: number;
  tipo_doc: TipoDocProveedor;
  num_doc: string;
  razon_social: string;
  nom_comercial?: string;
  telefono?: string;
  telefono_fijo?: string;
  anexo?: string;
  email?: string;
  direccion?: string;
  contacto?: string;
  estado: 'ACTIVO' | 'INACTIVO';
  fec_registro?: string | Date;
}
