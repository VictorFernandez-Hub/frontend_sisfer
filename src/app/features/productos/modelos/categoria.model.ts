export interface Categoria {
  id?: number; // El '?' significa opcional (las nuevas categorías no tienen ID hasta que se guardan en la BD)
  nombre: string;
}