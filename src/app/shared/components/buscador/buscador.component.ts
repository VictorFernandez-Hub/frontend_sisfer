import { Component, output, input } from '@angular/core';

@Component({
  selector: 'app-buscador',
  standalone: true,
  imports: [],
  templateUrl: './buscador.component.html'
})
export class BuscadorComponent {
  // Mantiene exactamente la misma variable y tipo para tus compañeros
  placeholder = input<string>('Buscar...');

  // Mantiene exactamente el mismo output
  alBuscar = output<string>();

  onInput(event: Event): void {
    const elemento = event.target as HTMLInputElement;
    this.alBuscar.emit(elemento.value);
  }

  // MÉTODO NECESARIO: Este es el que elimina el error rojo en el HTML
  limpiarBusqueda(inputElement: HTMLInputElement): void {
    inputElement.value = '';
    this.alBuscar.emit('');
  }
}