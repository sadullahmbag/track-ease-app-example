import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Database type definitions
export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: 'subscription' | 'warranty';
          cost: number;
          frequency: 'monthly' | 'yearly' | 'one-time';
          next_date: string;
          category: string;
          reminder_days: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type: 'subscription' | 'warranty';
          cost: number;
          frequency: 'monthly' | 'yearly' | 'one-time';
          next_date: string;
          category: string;
          reminder_days?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          type?: 'subscription' | 'warranty';
          cost?: number;
          frequency?: 'monthly' | 'yearly' | 'one-time';
          next_date?: string;
          category?: string;
          reminder_days?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      data_backups: {
        Row: {
          id: string;
          user_id: string;
          backup_data: any;
          backup_type: 'manual' | 'automatic';
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          backup_data: any;
          backup_type?: 'manual' | 'automatic';
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          backup_data?: any;
          backup_type?: 'manual' | 'automatic';
          created_at?: string;
        };
      };
    };
    Functions: {
      create_user_backup: {
        Args: { backup_type_param?: string };
        Returns: string;
      };
      restore_user_backup: {
        Args: { backup_id_param: string };
        Returns: boolean;
      };
    };
  };
}

// For web, we'll use localStorage as a fallback
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    if (Platform.OS === 'web') {
      return Promise.resolve(localStorage.getItem(key));
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return Promise.resolve();
    }
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return Promise.resolve();
    }
    return SecureStore.deleteItemAsync(key);
  },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Create the Supabase client first
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Custom fetch function to handle refresh token errors
const customFetch = async (url: string, options: RequestInit = {}) => {
  const response = await fetch(url, options);
  
  // Check if this is a refresh token error
  if (response.status === 400 && url.includes('/auth/v1/token')) {
    try {
      const responseBody = await response.clone().text();
      const errorData = JSON.parse(responseBody);
      
      if (errorData.code === 'refresh_token_not_found') {
        // Force a complete logout to clear all auth state
        await supabase.auth.signOut();
      }
    } catch (error) {
      // If we can't parse the response, continue with the original response
      console.warn('Failed to parse error response:', error);
    }
  }
  
  return response;
};

// Update the client with the custom fetch
supabase.realtime.setAuth(supabaseAnonKey);

// Helper functions for common operations
export const supabaseHelpers = {
  // Profile operations
  async getProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId);
      
      if (error) {
        console.error('Profile query error:', error);
        return { data: null, error };
      }
      
      // Return the first item or null if no results
      return { data: data && data.length > 0 ? data[0] : null, error: null };
    } catch (error) {
      console.error('Profile query exception:', error);
      return { data: null, error };
    }
  },

  async updateProfile(userId: string, updates: Database['public']['Tables']['user_profiles']['Update']) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', userId)
        .select();
      
      if (error) {
        console.error('Profile update error:', error);
        return { data: null, error };
      }
      
      return { data: data && data.length > 0 ? data[0] : null, error: null };
    } catch (error) {
      console.error('Profile update exception:', error);
      return { data: null, error };
    }
  },

  // Subscription operations
  async getSubscriptions(userId: string) {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('next_date', { ascending: true });
      
      if (error) {
        console.error('Subscriptions query error:', error);
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Subscriptions query exception:', error);
      return { data: null, error };
    }
  },

  async addSubscription(subscription: Omit<Database['public']['Tables']['subscriptions']['Insert'], 'user_id'>) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('subscriptions')
        .insert({ ...subscription, user_id: user.id })
        .select();
      
      if (error) {
        console.error('Add subscription error:', error);
        return { data: null, error };
      }
      
      return { data: data && data.length > 0 ? data[0] : null, error: null };
    } catch (error) {
      console.error('Add subscription exception:', error);
      return { data: null, error };
    }
  },

  async updateSubscription(id: string, updates: Database['public']['Tables']['subscriptions']['Update']) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('subscriptions')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id) // Ensure user can only update their own data
        .select();
      
      if (error) {
        console.error('Update subscription error:', error);
        return { data: null, error };
      }
      
      return { data: data && data.length > 0 ? data[0] : null, error: null };
    } catch (error) {
      console.error('Update subscription exception:', error);
      return { data: null, error };
    }
  },

  async deleteSubscription(id: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('subscriptions')
        .update({ is_active: false })
        .eq('id', id)
        .eq('user_id', user.id); // Ensure user can only delete their own data
      
      return { data, error };
    } catch (error) {
      console.error('Delete subscription exception:', error);
      return { data: null, error };
    }
  },

  // Backup operations
  async createBackup(type: 'manual' | 'automatic' = 'manual') {
    try {
      const { data, error } = await supabase.rpc('create_user_backup', {
        backup_type_param: type
      });
      
      return { data, error };
    } catch (error) {
      console.error('Create backup exception:', error);
      return { data: null, error };
    }
  },

  async getBackups() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('data_backups')
        .select('id, backup_type, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      return { data, error };
    } catch (error) {
      console.error('Get backups exception:', error);
      return { data: null, error };
    }
  },

  async restoreBackup(backupId: string) {
    try {
      const { data, error } = await supabase.rpc('restore_user_backup', {
        backup_id_param: backupId
      });
      
      return { data, error };
    } catch (error) {
      console.error('Restore backup exception:', error);
      return { data: null, error };
    }
  },

  // Real-time subscriptions
  subscribeToSubscriptions(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`subscriptions_changes_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `user_id=eq.${userId}`,
        },
        callback
      )
      .subscribe();
  },

  subscribeToProfile(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`profile_changes_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_profiles',
          filter: `id=eq.${userId}`,
        },
        callback
      )
      .subscribe();
  }
};