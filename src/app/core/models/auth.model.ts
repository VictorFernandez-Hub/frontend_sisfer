// src/app/core/models/auth.model.ts
export interface AuthResponse {
  token: string;
  username: string;
  roles?: string[]; // Opcional, por si luego manejas permisos
}

export interface LoginCredentials {
  username?: string | null;
  password?: string | null;
  rememberMe?: boolean | null;
}