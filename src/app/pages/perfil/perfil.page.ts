import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, LoadingController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { cameraOutline, lockClosedOutline, personOutline, saveOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import { SupabaseService } from '../../services/supabase';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { HeaderComponent } from '../../components/header/header.component';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, HeaderComponent] // Importamos tu nuevo Header
})
export class PerfilPage implements OnInit {
  private supabaseSvc = inject(SupabaseService);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);

  // Estados reactivos
  isLoading = signal(true);
  isSaving = signal(false);
  
  // Datos del usuario
  userId = signal<string | null>(null);
  nombreCompleto = signal('');
  rolUsuario = signal('');
  avatarUrl = signal<string | null>(null);
  
  // Seguridad
  newPassword = signal('');
  confirmPassword = signal('');

  constructor() {
    addIcons({ cameraOutline, lockClosedOutline, personOutline, saveOutline, shieldCheckmarkOutline });
  }

  async ngOnInit() {
    await this.loadProfile();
  }

  async loadProfile() {
    this.isLoading.set(true);
    const { data, error } = await this.supabaseSvc.getPerfilUsuario();

    if (!error && data) {
      this.userId.set(data.id);
      this.nombreCompleto.set(data.nombre_completo || '');
      this.rolUsuario.set(data.rol || 'Operador');
      this.avatarUrl.set(data.avatar_url || null);
    } else {
      this.showToast('Error al cargar el perfil', 'danger');
    }
    this.isLoading.set(false);
  }

  // Refresher nativo
  async handleRefresh(event: any) {
    await Haptics.impact({ style: ImpactStyle.Medium });
    await this.loadProfile();
    event.target.complete();
  }

  // Lógica para seleccionar y subir la foto
  async onFileSelected(event: any) {
    await Haptics.impact({ style: ImpactStyle.Light });
    const file = event.target.files[0];
    if (!file) return;

    const loading = await this.loadingCtrl.create({ message: 'Subiendo imagen...', spinner: 'crescent' });
    await loading.present();

    try {
      // 1. Crear un nombre único para el archivo
      const fileExt = file.name.split('.').pop();
      const filePath = `${this.userId()}-${Math.random()}.${fileExt}`;

      // 2. Subir al Bucket 'avatars'
      const { error: uploadError } = await this.supabaseSvc.uploadAvatar(filePath, file);
      if (uploadError) throw uploadError;

      // 3. Obtener la URL pública
      const publicUrl = this.supabaseSvc.getPublicAvatarUrl(filePath);
      
      // 4. Actualizar la base de datos y la vista
      await this.supabaseSvc.updatePerfil(this.nombreCompleto(), publicUrl);
      this.avatarUrl.set(publicUrl);
      
      this.showToast('Foto de perfil actualizada', 'success');
      await Haptics.notification({ type: 'success' as any });

    } catch (error: any) {
      this.showToast(error.message || 'Error al subir la imagen', 'danger');
      await Haptics.notification({ type: 'error' as any });
    } finally {
      loading.dismiss();
    }
  }

  // Guardar Cambios (Nombre y Contraseña)
  async saveChanges() {
    await Haptics.impact({ style: ImpactStyle.Heavy });

    // Validar contraseñas si el usuario escribió algo
    if (this.newPassword() || this.confirmPassword()) {
      if (this.newPassword() !== this.confirmPassword()) {
        this.showToast('Las contraseñas no coinciden', 'warning');
        return;
      }
      if (this.newPassword().length < 6) {
        this.showToast('La contraseña debe tener al menos 6 caracteres', 'warning');
        return;
      }
    }

    this.isSaving.set(true);
    const loading = await this.loadingCtrl.create({ message: 'Guardando cambios...' });
    await loading.present();

    try {
      // 1. Actualizar Nombre
      const { error: profileError } = await this.supabaseSvc.updatePerfil(this.nombreCompleto(), this.avatarUrl());
      if (profileError) throw profileError;

      // 2. Actualizar Contraseña (si aplica)
      if (this.newPassword()) {
        const { error: passError } = await this.supabaseSvc.updatePassword(this.newPassword());
        if (passError) throw passError;
        
        // Limpiamos los campos por seguridad
        this.newPassword.set('');
        this.confirmPassword.set('');
        this.showToast('Perfil y contraseña actualizados', 'success');
      } else {
        this.showToast('Perfil actualizado correctamente', 'success');
      }

      await Haptics.notification({ type: 'success' as any });

    } catch (error: any) {
      this.showToast(error.message || 'Error al guardar', 'danger');
      await Haptics.notification({ type: 'error' as any });
    } finally {
      this.isSaving.set(false);
      loading.dismiss();
    }
  }

  async showToast(message: string, color: 'success' | 'warning' | 'danger') {
    const toast = await this.toastCtrl.create({ message, duration: 2500, color, position: 'bottom' });
    await toast.present();
  }
}