import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, NavController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { notificationsOutline, menuOutline, pieChartOutline } from 'ionicons/icons';
import { SupabaseService } from '../../services/supabase';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { 
  NgApexchartsModule, 
  ApexChart, 
  ApexNonAxisChartSeries, 
  ApexPlotOptions, 
  ApexDataLabels, 
  ApexLegend, 
  ApexStroke 
} from 'ng-apexcharts';

// Definimos la interfaz para que TypeScript no se queje
export type ChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: any;
  colors: string[];
  plotOptions: ApexPlotOptions;
  dataLabels: ApexDataLabels;
  legend: ApexLegend;
  stroke: ApexStroke;
};

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, NgApexchartsModule]
})
export class DashboardPage implements OnInit {
  private supabaseSvc = inject(SupabaseService);
  private navCtrl = inject(NavController);

  isLoading = signal(true);
  locations = signal<any[]>([]);
  userInitials = signal('??');
  timeFilter = signal('Hoy');

  // Usamos Partial para inicializar el objeto de opciones
  public chartOptions: Partial<ChartOptions>;

  constructor() {
    addIcons({ notificationsOutline, menuOutline, pieChartOutline });

    // Inicializamos las opciones del gráfico aquí para evitar errores de tipo
    this.chartOptions = {
      chart: { 
        type: 'donut' as const, // El 'as const' soluciona el error TS2322
        height: 260, 
        fontFamily: 'inherit', 
        animations: { enabled: true } 
      },
      colors: ['#006b44', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0'],
      plotOptions: {
        pie: {
          donut: {
            size: '75%',
            labels: {
              show: true,
              name: { show: true, fontSize: '12px', color: '#64748b', offsetY: -5 },
              value: { 
                show: true, fontSize: '24px', fontWeight: 800, color: '#0f172a', offsetY: 5,
                formatter: function (val: any) { return val; }
              },
              total: {
                show: true, 
                showAlways: true, 
                label: 'TOTAL', 
                color: '#64748b', 
                fontSize: '10px', 
                fontWeight: 700,
                formatter: function (w: any) {
                  const total = w.globals.seriesTotals.reduce((a: any, b: any) => a + b, 0);
                  return total > 1000 ? (total / 1000).toFixed(1) + 'k' : total;
                }
              }
            }
          }
        }
      },
      dataLabels: { enabled: false },
      legend: { show: false },
      stroke: { show: false, width: 0 }
    };
  }

  async ngOnInit() {
    await this.loadUserProfile();
    await this.loadDashboardData();
  }

  async loadUserProfile() {
    // Intentamos obtener el usuario de Supabase
    try {
      const { data: { user } } = await (this.supabaseSvc as any).supabase.auth.getUser();
      if (user && user.email) {
        this.userInitials.set(user.email.substring(0, 2).toUpperCase());
      } else {
        this.userInitials.set('AD'); 
      }
    } catch (e) {
      this.userInitials.set('US');
    }
  }

  async loadDashboardData() {
    this.isLoading.set(true);
    
    const { data: puntos, error: errorPuntos } = await this.supabaseSvc.getPuntosTuristicos();
    
    if (!errorPuntos && puntos) {
      let dias = 1; 
      if (this.timeFilter() === 'Semana') dias = 7;
      if (this.timeFilter() === 'Mes') dias = 30;

      // Asumimos que tienes este método en tu servicio para filtrar por días
      const { data: registros } = await (this.supabaseSvc as any).getRegistrosFiltrados?.(dias) || { data: [] };

      const puntosCalculados = puntos.map(punto => {
        const registrosDelLugar = (registros || []).filter((r: any) => r.punto_id === punto.id);
        const totalVisitantes = registrosDelLugar.reduce((suma: number, r: any) => suma + (r.entradas || 0), 0);
        
        // Simulación de aforo (puedes ajustar con tu lógica de DB)
        const aforoActual = registrosDelLugar.length > 0 ? registrosDelLugar[registrosDelLugar.length - 1].total_neto || 0 : 0;
        
        let ocupacion = 0;
        if (punto.capacidad_maxima > 0) {
           ocupacion = Math.round((aforoActual / punto.capacidad_maxima) * 100);
           if (ocupacion > 100) ocupacion = 100;
           if (ocupacion < 0) ocupacion = 0;
        }

        return { ...punto, totalVisitantes, porcentajeOcupacion: ocupacion };
      });

      const granTotal = puntosCalculados.reduce((acc, curr) => acc + curr.totalVisitantes, 0);
      
      puntosCalculados.forEach(p => {
        p.porcentajeDistribucion = granTotal > 0 ? Math.round((p.totalVisitantes / granTotal) * 100) : 0;
      });

      // Actualizamos las series y etiquetas del gráfico
      this.chartOptions.series = puntosCalculados.map(p => p.totalVisitantes);
      this.chartOptions.labels = puntosCalculados.map(p => p.nombre);
      
      this.locations.set(puntosCalculados);
    }
    this.isLoading.set(false);
  }

  async handleRefresh(event: any) {
    await Haptics.impact({ style: ImpactStyle.Light });
    await this.loadDashboardData();
    event.target.complete();
  }

  async setFilter(filter: string) {
    await Haptics.impact({ style: ImpactStyle.Light });
    this.timeFilter.set(filter);
    await this.loadDashboardData(); 
  }

  async openNotifications() {
    await Haptics.impact({ style: ImpactStyle.Medium });
    console.log('Abriendo notificaciones');
  }
}