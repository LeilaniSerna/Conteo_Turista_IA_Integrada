import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { notificationsOutline, globeOutline } from 'ionicons/icons';
import { SupabaseService } from '../../services/supabase';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

@Component({
  selector: 'app-camara',
  templateUrl: './camara.page.html',
  styleUrls: ['./camara.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class CamaraPage implements OnInit {
  private supabaseSvc = inject(SupabaseService);

  isLoading = signal(true);
  isCameraReady = signal(false);
  locations = signal<any[]>([]);
  selectedLocation = signal<any>(null);
  userInitials = signal('ER');
  iaAccuracy = signal('99.8');
  entradasActuales = signal(1402);
  cargaActual = signal(85);

  constructor() {
    addIcons({ notificationsOutline, globeOutline });
  }

  async ngOnInit() {
    await this.loadLocations();
  }

  async loadLocations() {
    this.isLoading.set(true);
    const { data, error } = await this.supabaseSvc.getPuntosTuristicos();
    
    if (!error && data && data.length > 0) {
      this.locations.set(data);
      this.selectedLocation.set(data[0]);
    }
    
    this.isLoading.set(false);
    this.simulateCameraWarmup();
  }

  simulateCameraWarmup() {
    this.isCameraReady.set(false);
    setTimeout(() => {
      this.isCameraReady.set(true);
      Haptics.impact({ style: ImpactStyle.Heavy });
    }, 1500);
  }

  async onLocationChange(event: any) {
    await Haptics.impact({ style: ImpactStyle.Medium });
    
    const selectedId = event.target.value;
    const location = this.locations().find(loc => loc.id == selectedId);
    
    if (location) {
      this.selectedLocation.set(location);
      // actializar carga en bd
      this.entradasActuales.set(location.entradas || Math.floor(Math.random() * 2000));
      this.cargaActual.set(Math.floor(Math.random() * 100)); // simulado
      
      
      this.simulateCameraWarmup();
    }
  }

  async handleRefresh(event: any) {
    await Haptics.impact({ style: ImpactStyle.Light });
    await this.loadLocations();
    event.target.complete();
  }
}