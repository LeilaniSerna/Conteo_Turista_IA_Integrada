import { Component, OnInit, inject } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { SupabaseService } from '../services/supabase';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
})
export class HomePage implements OnInit {
  private supabaseSvc = inject(SupabaseService);

  constructor() {}

  async ngOnInit() {
    console.log('prueba de conexion');
    
    const { data, error } = await this.supabaseSvc.getPuntosTuristicos();

    if (error) {
  
      const err = error as any;
      console.error('Error de conexión:', err.message || 'Error desconocido');
    } else {
      console.log('Conectado  Datos recibidos:', data);
    }
  }
}