import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { 
  globeOutline, notificationsOutline, downloadOutline, 
  documentTextOutline, searchOutline 
} from 'ionicons/icons';
import { SupabaseService } from '../../services/supabase';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

@Component({
  selector: 'app-historial',
  templateUrl: './historial.page.html',
  styleUrls: ['./historial.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class HistorialPage implements OnInit {
  private supabaseSvc = inject(SupabaseService);
  private toastCtrl = inject(ToastController);

  isLoading = signal(true);
  searchQuery = signal('');
  allRecords = signal<any[]>([]);
  userInitials = signal('AD');

  filteredRecords = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.allRecords();
    return this.allRecords().filter(r => 
      r.punto.toLowerCase().includes(query) || 
      r.ubicacion.toLowerCase().includes(query)
    );
  });

  constructor() {
    addIcons({ 
      globeOutline, notificationsOutline, downloadOutline, 
      documentTextOutline, searchOutline 
    });
  }

  async ngOnInit() {
    await this.loadUserProfile();
    await this.loadHistory();
  }

  async loadUserProfile() {
    try {
      const { data: { user } } = await this.supabaseSvc.supabaseClient.auth.getUser();
      if (user?.email) this.userInitials.set(user.email.substring(0, 2).toUpperCase());
    } catch (e) {
      this.userInitials.set('AD');
    }
  }

  async loadHistory() {
    this.isLoading.set(true);
    const { data, error } = await this.supabaseSvc.getHistorialCompleto();

    if (!error && data) {
      const formatted = data.map((item: any) => ({
        id: item.id,
        punto: item.puntos_turisticos?.nombre || 'Punto Desconocido',
        ubicacion: item.puntos_turisticos?.descripcion || 'Calvillo, Ags.',
        fecha: new Date(item.creado_at).toLocaleDateString('es-MX'),
        hora: new Date(item.creado_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        afluencia: (item.entradas || 0) + (item.salidas || 0)
      }));
      this.allRecords.set(formatted);
    }
    this.isLoading.set(false);
  }

  async handleRefresh(event: any) {
    await Haptics.impact({ style: ImpactStyle.Medium });
    await this.loadHistory();
    event.target.complete();
  }

  async exportRow(record: any) {
    await Haptics.impact({ style: ImpactStyle.Light });
    const content = `Punto,${record.punto}\nUbicacion,${record.ubicacion}\nFecha,${record.fecha}\nHora,${record.hora}\nAfluencia,${record.afluencia}`;
    this.downloadCSV(content, `Registro_${record.punto}.csv`);
    
    const toast = await this.toastCtrl.create({
      message: 'Descargando registro...',
      duration: 2000,
      color: 'success',
      position: 'bottom'
    });
    await toast.present();
  }

  async exportGlobalCSV() {
    await Haptics.impact({ style: ImpactStyle.Heavy });
    if (this.allRecords().length === 0) return;
    const headers = ['Punto,Ubicacion,Fecha,Hora,Afluencia'];
    const rows = this.allRecords().map(r => `${r.punto},"${r.ubicacion}",${r.fecha},${r.hora},${r.afluencia}`);
    this.downloadCSV(headers.join('\n') + '\n' + rows.join('\n'), 'Historial_GeoTourist.csv');
  }

  private downloadCSV(content: string, fileName: string) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', fileName);
    link.click();
  }
}