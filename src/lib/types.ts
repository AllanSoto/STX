
import type { CryptoSymbol } from './constants';

export type UserEstado = 'activo' | 'inactivo' | 'bloqueado';

export interface Usuario {
  id_usuario: number;
  nombre: string;
  apellido: string;
  correo: string;
  password_hash?: string; // Optional on client
  telefono?: string | null;
  estado: UserEstado;
  fecha_creacion: string; // Will be a string from DB
  fecha_actualizacion: string; // Will be a string from DB
  id_rol: number;
  intentos_fallidos: number;
  bloqueado_hasta?: string | null; // Will be a string from DB
  username: string;
}
