import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  get supabaseClient() {
    return this.supabase;
  }

  constructor() {
    const env = environment as any;
    const url = env.supabaseUrl;
    const key = env.supabaseKey;

    if (!url || !key) {
      console.error('Faltan las credenciales de Supabase en environment.ts');
    }

    this.supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storage: window.localStorage, storageKey: 'geotourist-auth-token' }
    });
  }



  async getPerfilUsuario() {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return { data: null, error: 'No autenticado' };
    
    return await this.supabase
      .from('perfiles_usuario')
      .select('*')
      .eq('id', user.id)
      .single();
  }

  async updatePerfil(nombre: string, avatarUrl: string | null) {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return { error: 'No autenticado' };

    const updateData: any = { nombre_completo: nombre };
    if (avatarUrl) updateData.avatar_url = avatarUrl;

    return await this.supabase
      .from('perfiles_usuario')
      .update(updateData)
      .eq('id', user.id);
  }

  async uploadAvatar(filePath: string, file: File) {
    return await this.supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
  }

  getPublicAvatarUrl(path: string) {
    const { data } = this.supabase.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl;
  }

  async updatePassword(newPassword: string) {
    return await this.supabase.auth.updateUser({ password: newPassword });
  }

  
  async getHistorialCompleto() {
    try {
      const { data, error } = await this.supabase.from('registros_conteo').select(`id, entradas, salidas, total_neto, creado_at, puntos_turisticos ( nombre, descripcion )`).order('creado_at', { ascending: false });
      return { data, error };
    } catch (err) { return { data: null, error: err }; }
  }

  async getPuntosTuristicos() {
    try {
      const { data, error } = await this.supabase.from('puntos_turisticos').select('*');
      return { data, error };
    } catch (err) { return { data: null, error: err }; }
  }

  async registrarConteo(puntoId: string, entradas: number, salidas: number) {
    try {
      const { data, error } = await this.supabase.from('registros_conteo').insert([{ punto_id: puntoId, entradas, salidas, creado_at: new Date().toISOString() }]);
      return { data, error };
    } catch (err: any) { return { data: null, error: err }; }
  }

  async getRegistrosPorRango(inicio: string, fin: string) {
    try {
      const { data, error } = await this.supabase.from('registros_conteo').select(`id, entradas, salidas, total_neto, creado_at, puntos_turisticos ( nombre, descripcion )`).gte('creado_at', inicio).lte('creado_at', fin).order('creado_at', { ascending: false });
      return { data, error };
    } catch (err) { return { data: null, error: err }; }
  }

  async signIn(email: string, pass: string) { return await this.supabase.auth.signInWithPassword({ email, password: pass }); }
  async signUp(email: string, pass: string) { return await this.supabase.auth.signUp({ email, password: pass }); }
  async signOut() { return await this.supabase.auth.signOut(); }
}