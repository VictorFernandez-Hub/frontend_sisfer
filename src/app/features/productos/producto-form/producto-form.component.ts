import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms'; // Casi seguro lo necesitarás para formularios

@Component({
  selector: 'app-producto-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './producto-form.component.html',
  styleUrls: ['./producto-form.component.css'] // Usa styleUrls (plural) por consistencia
})
export class ProductoFormComponent {
  // Aquí irá la lógica de tu formulario
}