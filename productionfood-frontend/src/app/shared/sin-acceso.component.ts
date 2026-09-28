import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-sin-acceso',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatCardModule, MatIconModule],
  template: `
    <main class="access-page">
      <mat-card>
        <mat-icon>lock</mat-icon>
        <h1>Acceso no autorizado</h1>
        <p>No tiene permisos para acceder a este módulo.</p>
        <a mat-raised-button color="primary" routerLink="/app/dashboard">
          Volver al dashboard
        </a>
      </mat-card>
    </main>
  `,
  styles: [`
    .access-page {
      min-height: 70vh;
      display: grid;
      place-items: center;
    }

    mat-card {
      max-width: 520px;
      padding: 40px;
      text-align: center;
    }

    mat-icon {
      margin: 0 auto 16px;
      font-size: 48px;
      width: 48px;
      height: 48px;
    }

    h1 {
      margin: 0 0 10px;
    }

    p {
      margin: 0 0 24px;
      color: #66716b;
    }
  `]
})
export class SinAccesoComponent {}
