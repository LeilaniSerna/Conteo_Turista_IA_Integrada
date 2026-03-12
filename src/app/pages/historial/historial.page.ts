import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { 
  globeOutline, notificationsOutline, downloadOutline, 
  documentTextOutline, searchOutline, chevronForwardOutline
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
  records = signal<any[]>([]);
  userInitials = signal('ER');

  constructor() {
    addIcons({ 
      globeOutline, notificationsOutline, downloadOutline, 
      documentTextOutline, searchOutline, chevronForwardOutline
    });
  }

  async ngOnInit() {
    await this.loadHistory();
  }

  async loadHistory() {
    this.isLoading.set(true);
    
    const { data, error } = await (this.supabaseSvc as any).supabase
      .from('registros_conteo')
      .select(`
        id, entradas, salidas, fecha_hora,
        puntos_turisticos ( nombre, ubicacion )
      `)
      .order('fecha_hora', { ascending: false })
      .limit(50); 

    if (!error && data) {
      const formattedData = data.map((item: any) => ({
        id: item.id,
        punto: item.puntos_turisticos?.nombre || 'Desconocido',
        ubicacion: item.puntos_turisticos?.ubicacion || 'Sin zona',
        fecha: new Date(item.fecha_hora).toLocaleDateString(),
        hora: new Date(item.fecha_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        afluencia: item.entradas + item.salidas 
      }));
      this.records.set(formattedData);
    }
    this.isLoading.set(false);
  }

  async handleRefresh(event: any) {
    await Haptics.impact({ style: ImpactStyle.Medium });
    await this.loadHistory();
    event.target.complete();
  }


  async exportGlobalCSV() {
    await Haptics.impact({ style: ImpactStyle.Heavy });
    
    if (this.records().length === 0) {
      this.showToast('No hay datos para exportar', 'warning');
      return;
    }

    const headers = ['Punto de Control', 'Ubicación', 'Fecha', 'Hora', 'Afluencia Total'];
    const rows = this.records().map(r => 
      [r.punto, `"${r.ubicacion}"`, r.fecha, r.hora, r.afluencia].join(',')
    );
    
    const csvContent = headers.join(',') + '\n' + rows.join('\n');
    this.downloadCSV(csvContent, 'Reporte_Global_Turismo.csv');
    this.showToast('Reporte global generado', 'success');
  }

  async exportRow(record: any) {
    await Haptics.impact({ style: ImpactStyle.Light });
    
    const headers = ['Campo', 'Detalle'];
    const rows = [
      ['ID Registro', record.id],
      ['Punto', record.punto],
      ['Ubicación', record.ubicacion],
      ['Fecha', record.fecha],
      ['Hora', record.hora],
      ['Afluencia', record.afluencia]
    ].map(row => row.join(','));

    const csvContent = headers.join(',') + '\n' + rows.join('\n');
    this.downloadCSV(csvContent, `Registro_${record.id}.csv`);
    this.showToast('Registro individual exportado', 'success');
  }


  private async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'bottom',
      mode: 'ios'
    });
    await toast.present();
  }

  private downloadCSV(content: string, fileName: string) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}