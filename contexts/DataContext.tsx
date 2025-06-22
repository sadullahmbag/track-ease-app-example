import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform, Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { supabase, supabaseHelpers, Database } from '@/lib/supabase';
import { useAuth } from './AuthContext';

export interface SubscriptionItem {
  id: string;
  name: string;
  type: 'subscription' | 'warranty';
  cost: number;
  frequency: 'monthly' | 'yearly' | 'one-time';
  nextDate: Date;
  category: string;
  reminderDays: number;
  createdAt: Date;
  isActive: boolean;
}

interface DataContextType {
  subscriptions: SubscriptionItem[];
  loading: boolean;
  syncing: boolean;
  addSubscription: (item: Omit<SubscriptionItem, 'id' | 'createdAt' | 'isActive'>) => Promise<void>;
  removeSubscription: (id: string) => Promise<void>;
  updateSubscription: (id: string, updates: Partial<SubscriptionItem>) => Promise<void>;
  getUpcomingRenewals: (limit?: number) => SubscriptionItem[];
  getTotalMonthly: () => number;
  getSpendingByCategory: () => { category: string; amount: number; percentage: number; color: string }[];
  getMonthlyTrends: () => { month: string; amount: number }[];
  createBackup: () => Promise<void>;
  restoreFromBackup: (backupId: string) => Promise<void>;
  getBackups: () => Promise<any[]>;
  syncWithCloud: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Storage adapter for cross-platform compatibility
const storage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};

const categoryColors: { [key: string]: string } = {
  entertainment: '#A855F7',
  electronics: '#14B8A6',
  insurance: '#F97316',
  utilities: '#3B82F6',
  software: '#EF4444',
  other: '#6B7280',
};

// Generate a simple UUID v4
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Convert database row to SubscriptionItem
const dbRowToSubscriptionItem = (row: Database['public']['Tables']['subscriptions']['Row']): SubscriptionItem => ({
  id: row.id,
  name: row.name,
  type: row.type,
  cost: row.cost,
  frequency: row.frequency,
  nextDate: new Date(row.next_date),
  category: row.category,
  reminderDays: row.reminder_days,
  createdAt: new Date(row.created_at),
  isActive: row.is_active,
});

// Convert SubscriptionItem to database insert
const subscriptionItemToDbInsert = (item: Omit<SubscriptionItem, 'id' | 'createdAt' | 'isActive'>): Omit<Database['public']['Tables']['subscriptions']['Insert'], 'user_id'> => ({
  name: item.name,
  type: item.type,
  cost: item.cost,
  frequency: item.frequency,
  next_date: item.nextDate.toISOString().split('T')[0],
  category: item.category,
  reminder_days: item.reminderDays,
});

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user, session, profile } = useAuth();
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Get user-specific storage key
  const getUserStorageKey = (userId?: string) => {
    if (userId) {
      return `trackease_subscriptions_${userId}`;
    }
    return 'trackease_subscriptions_guest';
  };

  // Clear data when user changes
  useEffect(() => {
    // Clear subscriptions when user changes or logs out
    setSubscriptions([]);
    setLoading(true);
  }, [user?.id]);

  // Load data on mount and when user changes
  useEffect(() => {
    if (session && user && profile) {
      loadDataFromCloud();
      
      // Setup real-time subscription and return cleanup function
      const unsubscribe = setupRealtimeSubscription();
      return unsubscribe;
    } else {
      loadDataFromLocal();
    }
  }, [session, user, profile]);

  // Setup real-time subscription for live updates
  const setupRealtimeSubscription = () => {
    if (!user) return () => {};

    const subscription = supabaseHelpers.subscribeToSubscriptions(user.id, (payload) => {
      // Refresh data when changes occur
      loadDataFromCloud();
    });

    // Return cleanup function
    return () => {
      subscription.unsubscribe();
    };
  };

  const ensureUserProfileExists = async () => {
    if (!user) return false;

    try {
      // Check if profile exists
      const { data: existingProfile, error } = await supabaseHelpers.getProfile(user.id);
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error checking profile:', error);
        return false;
      }

      // If profile doesn't exist, create it
      if (!existingProfile) {
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            id: user.id,
            full_name: user.user_metadata?.full_name || '',
          });

        if (insertError) {
          console.error('Error creating profile:', insertError);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error ensuring profile exists:', error);
      return false;
    }
  };

  const loadDataFromCloud = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Ensure user profile exists before loading subscriptions
      const profileExists = await ensureUserProfileExists();
      if (!profileExists) {
        console.error('Failed to ensure user profile exists');
        await loadDataFromLocal();
        return;
      }

      const { data, error } = await supabaseHelpers.getSubscriptions(user.id);
      
      if (error) {
        console.error('Error loading from cloud:', error);
        // Fallback to local data
        await loadDataFromLocal();
        return;
      }

      const items = data?.map(dbRowToSubscriptionItem) || [];
      setSubscriptions(items);
      
      // Also save to user-specific local storage as backup
      await saveDataToLocal(items);
    } catch (error) {
      console.error('Error loading from cloud:', error);
      await loadDataFromLocal();
    } finally {
      setLoading(false);
    }
  };

  const loadDataFromLocal = async () => {
    try {
      setLoading(true);
      const storageKey = getUserStorageKey(user?.id);
      const stored = await storage.getItem(storageKey);
      
      if (stored) {
        const parsed = JSON.parse(stored);
        const withDates = parsed.map((item: any) => ({
          ...item,
          nextDate: new Date(item.nextDate),
          createdAt: new Date(item.createdAt),
        }));
        setSubscriptions(withDates);
      } else {
        // No local data found, start with empty array
        setSubscriptions([]);
      }
    } catch (error) {
      console.error('Error loading local data:', error);
      setSubscriptions([]);
    } finally {
      setLoading(false);
    }
  };

  const saveDataToLocal = async (data: SubscriptionItem[]) => {
    try {
      const storageKey = getUserStorageKey(user?.id);
      await storage.setItem(storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving local data:', error);
    }
  };

  const clearLocalData = async () => {
    try {
      // Clear current user's data
      const storageKey = getUserStorageKey(user?.id);
      await storage.removeItem(storageKey);
      
      // Also clear guest data if switching from guest to authenticated
      if (user) {
        const guestKey = getUserStorageKey();
        await storage.removeItem(guestKey);
      }
    } catch (error) {
      console.error('Error clearing local data:', error);
    }
  };

  const addSubscription = async (item: Omit<SubscriptionItem, 'id' | 'createdAt' | 'isActive'>) => {
    try {
      setSyncing(true);
      
      if (user && profile) {
        // Ensure user profile exists before adding subscription
        const profileExists = await ensureUserProfileExists();
        if (!profileExists) {
          throw new Error('Failed to ensure user profile exists');
        }

        // Add to cloud
        const { data, error } = await supabaseHelpers.addSubscription(subscriptionItemToDbInsert(item));
        
        if (error) {
          console.error('Error adding subscription:', error);
          throw error;
        }

        if (data) {
          const newItem = dbRowToSubscriptionItem(data);
          const updatedSubscriptions = [...subscriptions, newItem];
          setSubscriptions(updatedSubscriptions);
          await saveDataToLocal(updatedSubscriptions);
        }
      } else {
        // Add locally only with proper UUID
        const newItem: SubscriptionItem = {
          ...item,
          id: generateUUID(),
          createdAt: new Date(),
          isActive: true,
        };
        const updatedSubscriptions = [...subscriptions, newItem];
        setSubscriptions(updatedSubscriptions);
        await saveDataToLocal(updatedSubscriptions);
      }
    } catch (error) {
      console.error('Error adding subscription:', error);
      Alert.alert('Error', 'Failed to add subscription. Please try again.');
      throw error;
    } finally {
      setSyncing(false);
    }
  };

  const removeSubscription = async (id: string) => {
    try {
      setSyncing(true);
      
      if (user) {
        // Check if this is a valid UUID (from cloud) or local ID
        const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
        
        if (isValidUUID) {
          // Remove from cloud (soft delete by setting is_active to false)
          const { error } = await supabase
            .from('subscriptions')
            .update({ is_active: false })
            .eq('id', id)
            .eq('user_id', user.id);
          
          if (error) {
            console.error('Error removing subscription from cloud:', error);
            throw error;
          }
        }

        // Update local state regardless
        const updatedSubscriptions = subscriptions.filter(item => item.id !== id);
        setSubscriptions(updatedSubscriptions);
        await saveDataToLocal(updatedSubscriptions);
      } else {
        // Remove locally
        const updatedSubscriptions = subscriptions.filter(item => item.id !== id);
        setSubscriptions(updatedSubscriptions);
        await saveDataToLocal(updatedSubscriptions);
      }
    } catch (error) {
      console.error('Error removing subscription:', error);
      Alert.alert('Error', 'Failed to remove subscription. Please try again.');
      throw error;
    } finally {
      setSyncing(false);
    }
  };

  const updateSubscription = async (id: string, updates: Partial<SubscriptionItem>) => {
    try {
      setSyncing(true);
      
      if (user) {
        // Check if this is a valid UUID (from cloud) or local ID
        const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
        
        if (isValidUUID) {
          // Update in cloud
          const dbUpdates: Database['public']['Tables']['subscriptions']['Update'] = {};
          
          if (updates.name) dbUpdates.name = updates.name;
          if (updates.type) dbUpdates.type = updates.type;
          if (updates.cost !== undefined) dbUpdates.cost = updates.cost;
          if (updates.frequency) dbUpdates.frequency = updates.frequency;
          if (updates.nextDate) dbUpdates.next_date = updates.nextDate.toISOString().split('T')[0];
          if (updates.category) dbUpdates.category = updates.category;
          if (updates.reminderDays !== undefined) dbUpdates.reminder_days = updates.reminderDays;

          const { data, error } = await supabase
            .from('subscriptions')
            .update(dbUpdates)
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single();
          
          if (error) {
            console.error('Error updating subscription in cloud:', error);
            throw error;
          }

          if (data) {
            const updatedItem = dbRowToSubscriptionItem(data);
            const updatedSubscriptions = subscriptions.map(item => item.id === id ? updatedItem : item);
            setSubscriptions(updatedSubscriptions);
            await saveDataToLocal(updatedSubscriptions);
            return;
          }
        }

        // Update locally (for local items or if cloud update failed)
        const updatedSubscriptions = subscriptions.map(item => 
          item.id === id ? { ...item, ...updates } : item
        );
        setSubscriptions(updatedSubscriptions);
        await saveDataToLocal(updatedSubscriptions);
      } else {
        // Update locally
        const updatedSubscriptions = subscriptions.map(item => 
          item.id === id ? { ...item, ...updates } : item
        );
        setSubscriptions(updatedSubscriptions);
        await saveDataToLocal(updatedSubscriptions);
      }
    } catch (error) {
      console.error('Error updating subscription:', error);
      Alert.alert('Error', 'Failed to update subscription. Please try again.');
      throw error;
    } finally {
      setSyncing(false);
    }
  };

  const syncWithCloud = async () => {
    if (!user) return;

    try {
      setSyncing(true);
      
      // Get local items that might not be synced
      const localItems = subscriptions.filter(item => 
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(item.id)
      );

      // Sync local items to cloud
      for (const localItem of localItems) {
        try {
          const { data, error } = await supabaseHelpers.addSubscription(subscriptionItemToDbInsert(localItem));
          
          if (error) {
            console.error('Error syncing local item to cloud:', error);
            continue;
          }

          if (data) {
            // Replace local item with cloud item
            const cloudItem = dbRowToSubscriptionItem(data);
            setSubscriptions(prev => prev.map(item => 
              item.id === localItem.id ? cloudItem : item
            ));
          }
        } catch (error) {
          console.error('Error syncing individual item:', error);
        }
      }

      // Reload all data from cloud to ensure consistency
      await loadDataFromCloud();
      Alert.alert('Success', 'Data synced with cloud successfully!');
    } catch (error) {
      console.error('Error syncing with cloud:', error);
      Alert.alert('Error', 'Failed to sync with cloud. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  const createBackup = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to create backups.');
      return;
    }

    try {
      setSyncing(true);
      const { data, error } = await supabaseHelpers.createBackup('manual');
      
      if (error) {
        throw error;
      }

      Alert.alert('Success', 'Backup created successfully!');
    } catch (error) {
      console.error('Error creating backup:', error);
      Alert.alert('Error', 'Failed to create backup. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  const restoreFromBackup = async (backupId: string) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to restore backups.');
      return;
    }

    try {
      setSyncing(true);
      const { data, error } = await supabaseHelpers.restoreBackup(backupId);
      
      if (error) {
        throw error;
      }

      // Reload data after restore
      await loadDataFromCloud();
      Alert.alert('Success', 'Data restored from backup successfully!');
    } catch (error) {
      console.error('Error restoring backup:', error);
      Alert.alert('Error', 'Failed to restore backup. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  const getBackups = async () => {
    if (!user) return [];

    try {
      const { data, error } = await supabaseHelpers.getBackups();
      
      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting backups:', error);
      return [];
    }
  };

  const getUpcomingRenewals = (limit?: number) => {
    const sorted = [...subscriptions]
      .filter(item => item.isActive)
      .sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime());
    return limit ? sorted.slice(0, limit) : sorted;
  };

  const getTotalMonthly = () => {
    return subscriptions
      .filter(item => item.isActive)
      .reduce((sum, item) => {
        if (item.frequency === 'monthly') return sum + item.cost;
        if (item.frequency === 'yearly') return sum + item.cost / 12;
        return sum;
      }, 0);
  };

  const getSpendingByCategory = () => {
    const categoryTotals: { [key: string]: number } = {};
    
    subscriptions
      .filter(item => item.isActive)
      .forEach(item => {
        const monthlyAmount = item.frequency === 'monthly' ? item.cost : 
                             item.frequency === 'yearly' ? item.cost / 12 : 0;
        categoryTotals[item.category] = (categoryTotals[item.category] || 0) + monthlyAmount;
      });

    const total = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);
    
    return Object.entries(categoryTotals).map(([category, amount]) => ({
      category: category.charAt(0).toUpperCase() + category.slice(1),
      amount,
      percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
      color: categoryColors[category] || '#6B7280',
    })).sort((a, b) => b.amount - a.amount);
  };

  const getMonthlyTrends = () => {
    const now = new Date();
    const trends = [];
    
    for (let i = 3; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      
      // Calculate spending for this month (with some variation for demo)
      const baseAmount = getTotalMonthly();
      const variation = (Math.random() - 0.5) * 20; // ±10 variation
      const amount = Math.max(0, baseAmount + variation);
      
      trends.push({ month: monthName, amount });
    }
    
    return trends;
  };

  return (
    <DataContext.Provider
      value={{
        subscriptions: subscriptions.filter(item => item.isActive),
        loading,
        syncing,
        addSubscription,
        removeSubscription,
        updateSubscription,
        getUpcomingRenewals,
        getTotalMonthly,
        getSpendingByCategory,
        getMonthlyTrends,
        createBackup,
        restoreFromBackup,
        getBackups,
        syncWithCloud,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}