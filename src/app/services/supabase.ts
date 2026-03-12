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
    
    let url = env.supabaseUrl;
    let key = env.supabaseKey;

    if (!url) {
      url = 'https://mfpuvlmqvnesxwxgjpcu.supabase.co';
      key = 'sb_publishable__hIPYDA3IJViV6nU2n90Rg_V-8xVvek';
    }

    this.supabase = createClient(url, key);
    console.log('inicio correctamente');
  }

  // Obtener puntos turísticos
  async getPuntosTuristicos() {
    try {
      const { data, error } = await this.supabase
        .from('puntos_turisticos')
        .select('*');
      return { data, error };
    } catch (err) {
      return { data: null, error: err };
    }
  }

  // Obtener los registros de conteo filtrados por tiempo
  async getRegistrosFiltrados(rangoDias: number) {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - rangoDias);
    const fechaIso = fechaLimite.toISOString();

    try {
      const { data, error } = await this.supabase
        .from('registros_conteo')
        .select('punto_id, entradas, salidas, total_neto, creado_at')
        .gte('creado_at', fechaIso);
        
      return { data, error };
    } catch (err) {
      return { data: null, error: err };
    }
  }

  // Registrar un nuevo conteo
  async registrarConteo(puntoId: string, entradas: number, salidas: number) {
    try {
      const { data, error } = await this.supabase
        .from('registros_conteo')
        .insert([
          { 
            punto_id: puntoId, 
            entradas: entradas, 
            salidas: salidas,
            creado_at: new Date().toISOString()
          }
        ]);
      return { data, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }

  // iniciar sesion
  async signIn(email: string, pass: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: email,
      password: pass,
    });
    return { data, error };
  }

  // registrarse
  async signUp(email: string, pass: string) {
    const { data, error } = await this.supabase.auth.signUp({
      email: email,
      password: pass,
    });
    return { data, error };
  }

  // cerrar sesión
  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    return { error };
  }
}