import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, NavController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { globeOutline, notificationsOutline, menuOutline } from 'ionicons/icons';
import { SupabaseService } from '../../services/supabase';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class HeaderComponent implements OnInit {
  @Input() title: string = 'GeoTourist'; 
  
  private supabaseSvc = inject(SupabaseService);
  private navCtrl = inject(NavController);

  userInitials = signal('AD');
  avatarUrl = signal<string | null>(null);

  constructor() {
    addIcons({ globeOutline, notificationsOutline, menuOutline });
  }

  async ngOnInit() {
    await this.loadUserHeaderData();
  }

  async loadUserHeaderData() {
    const { data, error } = await this.supabaseSvc.getPerfilUsuario();
    if (!error && data) {
      if (data.nombre_completo) {
        const names = data.nombre_completo.split(' ');
        const inits = names.length > 1 ? names[0][0] + names[1][0] : names[0].substring(0, 2);
        this.userInitials.set(inits.toUpperCase());
      }
      if (data.avatar_url) {
        this.avatarUrl.set(data.avatar_url);
      }
    }
  }

  async goToPerfil() {
    await Haptics.impact({ style: ImpactStyle.Medium });
    this.navCtrl.navigateForward('/perfil');
  }
}