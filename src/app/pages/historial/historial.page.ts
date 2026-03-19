import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { 
  globeOutline, notificationsOutline, downloadOutline, 
  documentTextOutline, searchOutline, calendarOutline, barChartOutline 
} from 'ionicons/icons';
import { SupabaseService } from '../../services/supabase';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { HeaderComponent } from '../../components/header/header.component';

@Component({
  selector: 'app-historial',
  templateUrl: './historial.page.html',
  styleUrls: ['./historial.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, HeaderComponent]
})
export class HistorialPage implements OnInit {
  private supabaseSvc = inject(SupabaseService);
  private toastCtrl = inject(ToastController);

  isLoading = signal(true);
  searchQuery = signal('');
  allRecords = signal<any[]>([]); 

  periodoActual = signal<'Hoy' | 'Semana' | 'Mes' | 'Año'>('Mes');
  mesActual = signal(3);
  anioActual = signal(2026);

  meses = [
    { id: 1, nombre: 'Enero' }, { id: 2, nombre: 'Febrero' }, { id: 3, nombre: 'Marzo' },
    { id: 4, nombre: 'Abril' }, { id: 5, nombre: 'Mayo' }, { id: 6, nombre: 'Junio' },
    { id: 7, nombre: 'Julio' }, { id: 8, nombre: 'Agosto' }, { id: 9, nombre: 'Septiembre' },
    { id: 10, nombre: 'Octubre' }, { id: 11, nombre: 'Noviembre' }, { id: 12, nombre: 'Diciembre' }
  ];
  anios = [2025, 2026, 2027];

  filteredRecords = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.allRecords();
    return this.allRecords().filter(r => r.punto.toLowerCase().includes(query));
  });

  totalAfluencia = computed(() => {
    return this.allRecords().reduce((acc, curr) => acc + curr.afluencia, 0);
  });

  periodoTexto = computed(() => {
    const p = this.periodoActual();
    if (p === 'Hoy') return 'Hoy';
    if (p === 'Semana') return 'Últimos 7 Días';
    if (p === 'Año') return `Año ${this.anioActual()}`;
    const nombreMes = this.meses.find(m => m.id === Number(this.mesActual()))?.nombre;
    return `${nombreMes} ${this.anioActual()}`;
  });
  
  exportBtnText = computed(() => {
    return `Exportar ${this.periodoTexto()}`;
  });

  constructor() {
    addIcons({ globeOutline, notificationsOutline, downloadOutline, documentTextOutline, searchOutline, calendarOutline, barChartOutline });
  }

  async ngOnInit() {
    await this.loadDataByFilter();
  }
  
  getFechasFiltro() {
    const p = this.periodoActual();
    let start = new Date();
    let end = new Date();

    if (p === 'Hoy') {
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);
    } else if (p === 'Semana') {
      start.setDate(start.getDate() - 7);
      start.setHours(0,0,0,0);
    } else if (p === 'Mes') {
      start = new Date(Number(this.anioActual()), Number(this.mesActual()) - 1, 1);
      end = new Date(Number(this.anioActual()), Number(this.mesActual()), 0, 23, 59, 59);
    } else if (p === 'Año') {
      start = new Date(Number(this.anioActual()), 0, 1);
      end = new Date(Number(this.anioActual()), 11, 31, 23, 59, 59);
    }
    return { inicio: start.toISOString(), fin: end.toISOString() };
  }

  async loadDataByFilter() {
    this.isLoading.set(true);
    const { inicio, fin } = this.getFechasFiltro();
    const { data, error } = await this.supabaseSvc.getRegistrosPorRango(inicio, fin);

    if (!error && data) {
      const agrupados = data.reduce((acc: any, curr: any) => {
        const nombrePunto = curr.puntos_turisticos?.nombre || 'Punto Desconocido';
        if (!acc[nombrePunto]) {
          acc[nombrePunto] = { id: nombrePunto, punto: nombrePunto, entradas: 0, salidas: 0, afluencia: 0 };
        }
        acc[nombrePunto].entradas += (curr.entradas || 0);
        acc[nombrePunto].salidas += (curr.salidas || 0);
        acc[nombrePunto].afluencia += (curr.entradas || 0) + (curr.salidas || 0);
        return acc;
      }, {});
      this.allRecords.set(Object.values(agrupados));
    } else {
      this.allRecords.set([]);
    }
    this.isLoading.set(false);
  }

  async setPeriod(period: 'Hoy' | 'Semana' | 'Mes' | 'Año') {
    await Haptics.impact({ style: ImpactStyle.Light });
    this.periodoActual.set(period);
    this.loadDataByFilter();
  }

  async onFilterChange() {
    await Haptics.impact({ style: ImpactStyle.Light });
    this.loadDataByFilter();
  }

  async handleRefresh(event: any) {
    await Haptics.impact({ style: ImpactStyle.Medium });
    await this.loadDataByFilter();
    event.target.complete();
  }

  async exportGlobalCSV() {
    await Haptics.impact({ style: ImpactStyle.Heavy });
    if (this.allRecords().length === 0) return;
    
    const headers = ['"Punto de Control"','"Periodo"','"Afluencia Total"','"Entradas"','"Salidas"'];
    const rows = this.allRecords().map(r => `"${r.punto}","${this.periodoTexto()}","${r.afluencia}","${r.entradas}","${r.salidas}"`);
    const csvContent = '\uFEFF' + headers.join('\n') + '\n' + rows.join('\n');
    
    const filename = `GeoTourist_${this.exportBtnText().replace(/ /g, '_')}.csv`;
    this.downloadCSV(csvContent, filename);
  }

  async exportRow(record: any) {
    await Haptics.impact({ style: ImpactStyle.Light });
    const content = `\uFEFF"Punto de Control","Periodo","Afluencia Total","Entradas","Salidas"\n"${record.punto}","${this.periodoTexto()}","${record.afluencia}","${record.entradas}","${record.salidas}"`;
    this.downloadCSV(content, `Reporte_${record.punto.replace(/ /g, '_')}_${this.periodoTexto().replace(/ /g, '_')}.csv`);
  }

  private downloadCSV(content: string, fileName: string) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', fileName);
    link.click();
    this.showToast(`Descarga completada: ${fileName}`);
  }

  async showToast(message: string) {
    const toast = await this.toastCtrl.create({ message, duration: 2500, color: 'success', position: 'bottom' });
    toast.present();
  }
}