import { Component, ElementRef, ViewChild, computed, input, model, signal } from '@angular/core';

export interface OpcionBusqueda {
  id: number;
  texto: string;
  detalle?: string;
  deshabilitada?: boolean;
}

const SIN_BLOQUEOS = new Set<number>();
const MAX_RESULTADOS = 50;
const ALTO_LISTA = 340; // 16rem de la lista más el pie de la ventana
let contador = 0;

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// Lista desplegable con buscador: permite elegir por código, nombre o documento.
// La lista flota sobre el contenido, así que abrirla no mueve nada de la pantalla.
@Component({
  selector: 'app-selector-busqueda',
  standalone: true,
  templateUrl: './selector-busqueda.component.html',
  styleUrls: ['./selector-busqueda.component.css']
})
export class SelectorBusquedaComponent {
  opciones = input.required<OpcionBusqueda[]>();
  valor = model<number | null>(null);
  // Ids que no se pueden volver a elegir (por ejemplo, un producto que ya está en otra línea)
  bloqueados = input<Set<number>>(SIN_BLOQUEOS);
  textoBloqueado = input<string>('Ya elegido');
  placeholder = input<string>('Buscar...');
  etiqueta = input<string>('');
  idCampo = input<string>('');
  invalido = input<boolean>(false);

  @ViewChild('campo') private campo?: ElementRef<HTMLInputElement>;

  readonly idLista = `selector-lista-${++contador}`;
  abierta = signal<boolean>(false);
  haciaArriba = signal<boolean>(false);
  activa = signal<number>(-1);
  private escribiendo = signal<boolean>(false);
  private texto = signal<string>('');

  private seleccionada = computed(() => this.opciones().find(o => o.id === this.valor()));

  textoVisible = computed(() => this.escribiendo() ? this.texto() : this.seleccionada()?.texto ?? '');

  filtradas = computed(() => {
    const buscado = this.escribiendo() ? normalizar(this.texto().trim()) : '';
    const lista = !buscado ? this.opciones() : this.opciones().filter(o =>
      normalizar(`${o.texto} ${o.detalle ?? ''}`).includes(buscado));
    return lista.slice(0, MAX_RESULTADOS);
  });

  enfocar(): void {
    this.campo?.nativeElement.focus();
  }

  deshabilitada(o: OpcionBusqueda): boolean {
    return !!o.deshabilitada || this.estaBloqueada(o);
  }

  estaBloqueada(o: OpcionBusqueda): boolean {
    return this.bloqueados().has(o.id) && o.id !== this.valor();
  }

  alEnfocar(evento: FocusEvent): void {
    (evento.target as HTMLInputElement).select();
    this.abrir();
  }

  // Si el campo ya tenía el foco (por ejemplo, tras cerrar con Esc), el clic la vuelve a abrir
  alHacerClic(): void {
    if (!this.abierta()) this.abrir();
  }

  alEscribir(evento: Event): void {
    this.texto.set((evento.target as HTMLInputElement).value);
    this.escribiendo.set(true);
    if (!this.abierta()) this.calcularDireccion();
    this.abierta.set(true);
    this.activa.set(this.siguienteHabilitada(-1, 1));
  }

  // Si se sale sin elegir, vuelve a mostrar lo que ya estaba seleccionado
  alSalir(): void {
    this.cerrar();
  }

  alTeclear(evento: KeyboardEvent): void {
    switch (evento.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        evento.preventDefault();
        if (!this.abierta()) {
          this.abrir();
          return;
        }
        const sentido = evento.key === 'ArrowDown' ? 1 : -1;
        this.activa.set(this.siguienteHabilitada(this.activa(), sentido));
        this.mostrarActiva();
        break;
      }
      case 'Enter': {
        // Enter elige la opción marcada y no envía nada más
        evento.preventDefault();
        const opcion = this.filtradas()[this.activa()];
        if (this.abierta() && opcion) {
          this.elegir(opcion);
        }
        break;
      }
      case 'Escape':
        if (this.abierta()) {
          evento.stopPropagation();
          this.cerrar();
        }
        break;
    }
  }

  elegir(opcion: OpcionBusqueda): void {
    if (this.deshabilitada(opcion)) return;
    this.cerrar();
    this.valor.set(opcion.id);
  }

  private abrir(): void {
    this.calcularDireccion();
    this.abierta.set(true);
    const actual = this.filtradas().findIndex(o => o.id === this.valor());
    this.activa.set(actual >= 0 ? actual : this.siguienteHabilitada(-1, 1));
    this.mostrarActiva();
  }

  // Si abajo no entra (por el pie de la ventana), la lista se abre hacia arriba
  private calcularDireccion(): void {
    const campo = this.campo?.nativeElement.getBoundingClientRect();
    this.haciaArriba.set(!!campo && campo.bottom + ALTO_LISTA > window.innerHeight && campo.top > ALTO_LISTA);
  }

  private cerrar(): void {
    this.abierta.set(false);
    this.escribiendo.set(false);
    this.texto.set('');
    this.activa.set(-1);
  }

  private siguienteHabilitada(desde: number, sentido: 1 | -1): number {
    const lista = this.filtradas();
    for (let i = desde + sentido; i >= 0 && i < lista.length; i += sentido) {
      if (!this.deshabilitada(lista[i])) return i;
    }
    return desde >= 0 && desde < lista.length ? desde : -1;
  }

  private mostrarActiva(): void {
    setTimeout(() => document.getElementById(`${this.idLista}-${this.activa()}`)?.scrollIntoView({ block: 'nearest' }));
  }
}
