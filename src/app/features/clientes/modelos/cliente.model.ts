export interface Cliente {
  id_cliente?: number;
  tipo_doc: string;
  num_doc: string;
  nombres: string;
  telefono?: string;
  direccion?: string;
  email?: string;
  estado: 'ACTIVO' | 'INACTIVO';
  fec_registro?: string | Date;
}