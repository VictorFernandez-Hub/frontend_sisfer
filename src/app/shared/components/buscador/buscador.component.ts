import { Component, output, input } from '@angular/core';

@Component({
  selector: 'app-buscador',
  standalone: true,
  imports: [],
  templateUrl: './buscador.component.html'
})
export class BuscadorComponent {
  // Input basado en Signals (Sintaxis moderna)
  placeholder = input<string>('Buscar...');

  // Output basado en la API moderna de Angular (Reemplaza a @Output y EventEmitter)
  alBuscar = output<string>();

  onInput(event: Event): void {
    const elemento = event.target as HTMLInputElement;
    
    // Si necesitas usar placeholder aquí en la lógica de TS, se llama como función:
    // console.log('El placeholder actual es:', this.placeholder());
    
    this.alBuscar.emit(elemento.value);
  }
}