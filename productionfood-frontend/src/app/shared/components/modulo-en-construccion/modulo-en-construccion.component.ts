import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-modulo-en-construccion',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatCardModule, MatIconModule],
  templateUrl: './modulo-en-construccion.component.html',
  styleUrl: './modulo-en-construccion.component.scss'
})
export class ModuloEnConstruccionComponent {
  readonly titulo = input.required<string>();
  readonly descripcion = input('');
  readonly hu = input<string | undefined>(undefined);
  readonly icono = input('construction');
}
