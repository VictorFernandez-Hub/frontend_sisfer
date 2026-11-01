// Ítem genérico para los combos de categoría, marca y unidad de medida
export interface Catalogo {
  id: number;
  codigo?: string | null; // Solo las unidades tienen código (UND, KG, M...)
  nombre: string;
}
