import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { notificationsOutline, menuOutline, pieChartOutline } from 'ionicons/icons';
import { SupabaseService } from '../../services/supabase';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { HeaderComponent } from '../../components/header/header.component';
import { 
  NgApexchartsModule, ApexChart, ApexNonAxisChartSeries, 
  ApexPlotOptions, ApexDataLabels, ApexLegend, ApexStroke 
} from 'ng-apexcharts';

export type ChartOptions = {
  series: ApexNonAxisChartSeries; chart: ApexChart; labels: any;
  colors: string[]; plotOptions: ApexPlotOptions; dataLabels: ApexDataLabels;
  legend: ApexLegend; stroke: ApexStroke;
};

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, NgApexchartsModule, HeaderComponent]
})
export class DashboardPage implements OnInit {
  private supabaseSvc = inject(SupabaseService);

  isLoading = signal(true);
  locations = signal<any[]>([]);
  timeFilter = signal('Hoy');
  public chartOptions: Partial<ChartOptions>;

  constructor() {
    addIcons({ notificationsOutline, menuOutline, pieChartOutline });

    this.chartOptions = {
      chart: { type: 'donut' as const, height: 260, fontFamily: 'inherit', animations: { enabled: true } },
      colors: ['#006b44', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0'],
      plotOptions: {
        pie: {
          donut: {
            size: '75%',
            labels: {
              show: true,
              name: { show: true, fontSize: '12px', color: '#64748b', offsetY: -5 },
              value: { show: true, fontSize: '24px', fontWeight: 800, color: '#0f172a', offsetY: 5, formatter: (val) => val.toString() },
              total: {
                show: true, showAlways: true, label: 'TOTAL', color: '#64748b', fontSize: '10px', fontWeight: 700,
                formatter: (w) => {
                  const total = w.globals.seriesTotals.reduce((a: any, b: any) => a + b, 0);
                  return total >= 1000 ? (total / 1000).toFixed(1) + 'k' : total.toString(); 
                }
              }
            }
          }
        }
      },
      dataLabels: { enabled: false }, legend: { show: false }, stroke: { show: false, width: 0 }
    };
  }

  async ngOnInit() {
    await this.loadDashboardData();
  }

  async loadDashboardData() {
    this.isLoading.set(true);
    const { data: puntos, error: errorPuntos } = await this.supabaseSvc.getPuntosTuristicos();
    
    if (errorPuntos) {
      this.isLoading.set(false);
      return;
    }

    if (puntos) {
      const { actualInicio, actualFin, pasadoInicio, pasadoFin } = this.getRangeDates();
      const [resActual, resPasado] = await Promise.all([
        this.supabaseSvc.getRegistrosPorRango(actualInicio, actualFin),
        this.supabaseSvc.getRegistrosPorRango(pasadoInicio, pasadoFin)
      ]);

      const puntosCalculados = puntos.map(punto => {
        const regActual = (resActual.data || []).filter((r: any) => r.punto_id === punto.id);
        const regPasado = (resPasado.data || []).filter((r: any) => r.punto_id === punto.id);

        const totalActual = regActual.reduce((s: number, r: any) => s + (r.entradas || 0), 0);
        const totalPasado = regPasado.reduce((s: number, r: any) => s + (r.entradas || 0), 0);

        let tendencia = 0;
        if (totalPasado > 0) tendencia = Math.round(((totalActual - totalPasado) / totalPasado) * 100);
        else if (totalActual > 0) tendencia = 100;

        const ultimoRegistro = regActual.length > 0 ? regActual[regActual.length - 1] : null;
        const aforoActual = ultimoRegistro ? ultimoRegistro.total_neto : 0;
        
        let ocupacion = 0;
        if (punto.capacidad_maxima > 0) ocupacion = Math.min(Math.round((aforoActual / punto.capacidad_maxima) * 100), 100);

        return { 
          ...punto, totalVisitantes: totalActual, porcentajeOcupacion: ocupacion,
          tendenciaValor: Math.abs(tendencia), tendenciaPositiva: tendencia >= 0
        };
      });

      const granTotal = puntosCalculados.reduce((acc, curr) => acc + curr.totalVisitantes, 0);
      puntosCalculados.forEach(p => {
        p.porcentajeDistribucion = granTotal > 0 ? Math.round((p.totalVisitantes / granTotal) * 100) : 0;
      });

      this.chartOptions.series = puntosCalculados.map(p => p.totalVisitantes);
      this.chartOptions.labels = puntosCalculados.map(p => p.nombre);
      this.locations.set(puntosCalculados);
    }
    this.isLoading.set(false);
  }

  private getRangeDates() {
    const ahora = new Date();
    const filtro = this.timeFilter();
    let actualInicio, actualFin, pasadoInicio, pasadoFin;

    if (filtro === 'Hoy') {
      actualInicio = new Date(new Date().setHours(0,0,0,0)).toISOString();
      actualFin = new Date().toISOString();
      pasadoInicio = new Date(new Date(actualInicio).setDate(new Date(actualInicio).getDate() - 1)).toISOString();
      pasadoFin = actualInicio;
    } else if (filtro === 'Semana') {
      actualInicio = new Date(new Date().setDate(ahora.getDate() - 7)).toISOString();
      actualFin = new Date().toISOString();
      pasadoInicio = new Date(new Date(actualInicio).setDate(new Date(actualInicio).getDate() - 7)).toISOString();
      pasadoFin = actualInicio;
    } else {
      actualInicio = new Date(new Date().setMonth(ahora.getMonth() - 1)).toISOString();
      actualFin = new Date().toISOString();
      pasadoInicio = new Date(new Date(actualInicio).setMonth(new Date(actualInicio).getMonth() - 1)).toISOString();
      pasadoFin = actualInicio;
    }
    return { actualInicio, actualFin, pasadoInicio, pasadoFin };
  }

  async setFilter(filter: string) {
    await Haptics.impact({ style: ImpactStyle.Light });
    this.timeFilter.set(filter);
    await this.loadDashboardData(); 
  }

  async handleRefresh(event: any) {
    await Haptics.impact({ style: ImpactStyle.Light });
    await this.loadDashboardData();
    event.target.complete();
  }
}