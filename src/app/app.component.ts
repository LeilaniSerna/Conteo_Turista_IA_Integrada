import { Component, inject } from '@angular/core';
import { IonicModule, NavController, MenuController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { gridOutline, cameraOutline, listOutline, logOutOutline } from 'ionicons/icons';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { SupabaseService } from './services/supabase';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
})
export class AppComponent {
  private navCtrl = inject(NavController);
  private menuCtrl = inject(MenuController);
  private supabaseSvc = inject(SupabaseService);

  constructor() {
    addIcons({ gridOutline, cameraOutline, listOutline, logOutOutline });
  }

  async navigate(url: string) {
    await Haptics.impact({ style: ImpactStyle.Light });
    await this.menuCtrl.close(); // Cierra el menú al hacer clic
    this.navCtrl.navigateRoot(url);
  }

  async logout() {
    await Haptics.notification({ type: 'warning' as any });
    await this.menuCtrl.close();
    // await this.supabaseSvc.signOut(); // Descomenta cuando agregues signOut a tu servicio
    this.navCtrl.navigateRoot('/login');
  }
}