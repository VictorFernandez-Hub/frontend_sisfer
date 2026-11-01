import { Component, EventEmitter, Output, input } from '@angular/core';

@Component({
  selector: 'app-buscador',
  standalone: true,
  imports: [],
  templateUrl: './buscador.component.html'
})
export class BuscadorComponent {
  // Recibe el texto de ayuda personalizado desde el componente padre
  placeholder = input<string>('Buscar...');

  // Emite el texto que escribe el usuario para que el padre lo filtre
  @Output() alBuscar = new EventEmitter<string>();

  onInput(event: Event): void {
    const elemento = event.target as HTMLInputElement;
    this.alBuscar.emit(elemento.value);
  }
}