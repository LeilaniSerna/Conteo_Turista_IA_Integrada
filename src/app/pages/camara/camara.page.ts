import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { notificationsOutline, globeOutline } from 'ionicons/icons';
import { SupabaseService } from '../../services/supabase';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { HeaderComponent } from '../../components/header/header.component';

@Component({
  selector: 'app-camara',
  templateUrl: './camara.page.html',
  styleUrls: ['./camara.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, HeaderComponent]
})
export class CamaraPage implements OnInit {
  private supabaseSvc = inject(SupabaseService);

  isLoading = signal(true);
  isCameraReady = signal(false);
  locations = signal<any[]>([]);
  selectedLocation = signal<any>(null);
  iaAccuracy = signal('99.8');
  entradasActuales = signal(0);
  cargaActual = signal(0);

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
      await this.updateLocationStats(data[0]);
    }
    
    this.isLoading.set(false);
    this.simulateCameraWarmup();
  }

  async updateLocationStats(location: any) {
    const hoy = new Date(new Date().setHours(0,0,0,0)).toISOString();
    const ahora = new Date().toISOString();
    
    const { data } = await (this.supabaseSvc as any).getRegistrosPorRango(hoy, ahora);
    const registros = (data || []).filter((r: any) => r.punto_id === location.id);
    
    const entradas = registros.reduce((s: number, r: any) => s + (r.entradas || 0), 0);
    this.entradasActuales.set(entradas);
    
    const ultimoNeto = registros.length > 0 ? registros[registros.length - 1].total_neto : 0;
    const carga = location.capacidad_maxima > 0 ? Math.min(Math.round((ultimoNeto / location.capacidad_maxima) * 100), 100) : 0;
    this.cargaActual.set(carga);
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
    const location = this.locations().find(loc => loc.id == event.target.value);
    if (location) {
      this.selectedLocation.set(location);
      await this.updateLocationStats(location);
      this.simulateCameraWarmup();
    }
  }

  async handleRefresh(event: any) {
    await Haptics.impact({ style: ImpactStyle.Light });
    await this.loadLocations();
    event.target.complete();
  }
}