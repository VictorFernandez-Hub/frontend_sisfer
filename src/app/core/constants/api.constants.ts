import { environment } from '../../../environments/environment';

export const API_URL = environment.apiUrl;

export const ENDPOINTS = {
  AUTH: {
    LOGIN: `${API_URL}/auth/login`,
    LOGOUT: `${API_URL}/auth/logout`
  },
  PRODUCTOS: `${API_URL}/productos`,
  PROVEEDORES: `${API_URL}/proveedores`
};