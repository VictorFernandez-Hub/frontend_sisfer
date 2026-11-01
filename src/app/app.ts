import { Component } from '@angular/core';
import { GlobalModalComponent } from './shared/components/global-modal/global-modal.component';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet,GlobalModalComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
}