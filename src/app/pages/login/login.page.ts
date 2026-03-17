import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, LoadingController, ToastController, NavController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { 
  analyticsOutline, 
  fingerPrintOutline, 
  mailOutline, 
  lockClosedOutline, 
  personAddOutline, 
  logInOutline,
  personOutline,
  eyeOutline,
  chevronForwardOutline
} from 'ionicons/icons';
import { SupabaseService } from '../../services/supabase';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class LoginPage {
  
  private supabaseSvc = inject(SupabaseService);
  private loadingCtrl = inject(LoadingController);
  private toastCtrl = inject(ToastController);
  private navCtrl = inject(NavController);


  isLogin = signal(true);
  isLoading = signal(false);
  email = signal('');
  password = signal('');

  constructor() {
    addIcons({ 
      analyticsOutline, 
      fingerPrintOutline, 
      mailOutline, 
      lockClosedOutline, 
      personAddOutline, 
      logInOutline,
      personOutline,
      eyeOutline,
      chevronForwardOutline
    });
  }


  async toggleMode() {
    await Haptics.impact({ style: ImpactStyle.Light });
    this.isLogin.update(val => !val);
  }


  async handleAuth() {
    if (!this.email() || !this.password()) {
      this.showToast('Por favor, completa todos los campos', 'warning');
      return;
    }

    await Haptics.notification({ type: 'success' as any });
    this.isLoading.set(true);
    
    const loading = await this.loadingCtrl.create({
      message: this.isLogin() ? 'Iniciando sesión...' : 'Creando cuenta...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const { data, error } = this.isLogin() 
        ? await this.supabaseSvc.signIn(this.email(), this.password())
        : await this.supabaseSvc.signUp(this.email(), this.password());

      if (error) throw error;

      this.showToast(this.isLogin() ? '¡Bienvenido!' : 'Cuenta creada con éxito', 'success');
      this.navCtrl.navigateRoot('/dashboard'); 

    } catch (error: any) {
      await Haptics.notification({ type: 'error' as any });
      this.showToast(error.message || 'Error en la autenticación', 'danger');
    } finally {
      this.isLoading.set(false);
      await loading.dismiss();
    }
  }

  
  async biometricLogin() {
    await Haptics.impact({ style: ImpactStyle.Medium });
    
    
    console.log('Iniciando sensor biométrico...');
    
    // Simulación de exito por ahora
    this.showToast('Identidad verificada correctamente', 'success');
  }

  // Feedback
  async handleRefresh(event: any) {
    await Haptics.impact({ style: ImpactStyle.Light });
    setTimeout(() => {
      event.target.complete();
    }, 1500);
  }

  
  async showToast(message: string, color: 'success' | 'danger' | 'warning') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}