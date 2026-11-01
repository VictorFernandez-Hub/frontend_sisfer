export interface UsuarioResponseDTO {
  idUsuario: number;
  cuenta: string;
  nombresCompleto: string;
  email: string;
  telefono: string;
  dni: string;
  estado: string;
  roles: string[];
  codigoRol: string;
  tipoContrato: string;
  fecInicio: string;
  fecFin: string;
}