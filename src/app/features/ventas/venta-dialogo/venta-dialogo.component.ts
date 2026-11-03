import { AfterViewInit, Component, ElementRef, ViewChild, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface DatosDialogo {
  titulo: string;
  mensaje: string;
  filas?: { etiqueta: string; valor: string }[];
  pedirMotivo?: boolean;
  textoBoton: string;
  claseBoton: string;
  accion: string;       // lo que se hará al aceptar; lo interpreta quien abrió el diálogo
}

const MOTIVO_MINIMO = 5;
const MOTIVO_MAXIMO = 150;

// Confirmación dentro de la ventana de la venta. Reemplaza a los avisos del navegador.
@Component({
  selector: 'app-venta-dialogo',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './venta-dialogo.component.html',
  styleUrls: ['./venta-dialogo.component.css']
})
export class VentaDialogoComponent implements AfterViewInit {
  datos = input.required<DatosDialogo>();
  aceptar = output<string>();
  cancelar = output<void>();

  readonly maximo = MOTIVO_MAXIMO;
  motivo = signal<string>('');
  intento = signal<boolean>(false);

  motivoValido = computed(() => this.motivo().trim().length >= MOTIVO_MINIMO);

  @ViewChild('motivoCampo') private motivoCampo?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('botonAceptar') private botonAceptar?: ElementRef<HTMLButtonElement>;

  ngAfterViewInit(): void {
    (this.motivoCampo ?? this.botonAceptar)?.nativeElement.focus();
  }

  alAceptar(): void {
    if (this.datos().pedirMotivo && !this.motivoValido()) {
      this.intento.set(true);
      return;
    }
    this.aceptar.emit(this.motivo().trim());
  }
}
