import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Filter, Calendar, DollarSign, Trash2 } from 'lucide-react-native';
import { useData } from '@/contexts/DataContext';

export default function AllItemsTab() {
  const { subscriptions, removeSubscription } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'subscription' | 'warranty'>('all');

  const filteredSubscriptions = subscriptions.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || item.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      entertainment: '#A855F7',
      electronics: '#14B8A6',
      insurance: '#F97316',
      utilities: '#3B82F6',
      software: '#EF4444',
      other: '#6B7280',
    };
    return colors[category] || '#6B7280';
  };

  const handleDelete = async (id: string) => {
    try {
      await removeSubscription(id);
    } catch (error) {
      console.error('Error deleting subscription:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>All Items</Text>
        <Text style={styles.headerSubtitle}>
          {filteredSubscriptions.length} of {subscriptions.length} items
        </Text>
      </View>

      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search subscriptions..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
        </View>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filterType === 'all' && styles.filterButtonActive
          ]}
          onPress={() => setFilterType('all')}
        >
          <Text style={[
            styles.filterButtonText,
            filterType === 'all' && styles.filterButtonTextActive
          ]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filterType === 'subscription' && styles.filterButtonActive
          ]}
          onPress={() => setFilterType('subscription')}
        >
          <Text style={[
            styles.filterButtonText,
            filterType === 'subscription' && styles.filterButtonTextActive
          ]}>
            Subscriptions
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filterType === 'warranty' && styles.filterButtonActive
          ]}
          onPress={() => setFilterType('warranty')}
        >
          <Text style={[
            styles.filterButtonText,
            filterType === 'warranty' && styles.filterButtonTextActive
          ]}>
            Warranties
          </Text>
        </TouchableOpacity>
      </View>

      {/* Items List */}
      <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
        {filteredSubscriptions.length === 0 ? (
          <View style={styles.emptyState}>
            <Filter size={48} color="#D1D5DB" />
            <Text style={styles.emptyStateTitle}>
              {searchQuery ? 'No items found' : 'No items yet'}
            </Text>
            <Text style={styles.emptyStateText}>
              {searchQuery 
                ? 'Try adjusting your search or filter'
                : 'Add your first subscription to get started'
              }
            </Text>
          </View>
        ) : (
          <View style={styles.itemsList}>
            {filteredSubscriptions.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <View style={styles.itemInfo}>
                    <View style={styles.itemTitleRow}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <View 
                        style={[
                          styles.categoryDot, 
                          { backgroundColor: getCategoryColor(item.category) }
                        ]} 
                      />
                    </View>
                    <Text style={styles.itemType}>
                      {item.type.charAt(0).toUpperCase() + item.type.slice(1)} • {item.category}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(item.id)}
                  >
                    <Trash2 size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>

                <View style={styles.itemDetails}>
                  <View style={styles.itemDetailRow}>
                    <View style={styles.itemDetailItem}>
                      <DollarSign size={16} color="#6B7280" />
                      <Text style={styles.itemDetailText}>
                        {formatCurrency(item.cost)}
                      </Text>
                      <Text style={styles.itemDetailLabel}>
                        {item.frequency === 'one-time' ? 'One-time' : `/${item.frequency.slice(0, -2)}`}
                      </Text>
                    </View>
                    <View style={styles.itemDetailItem}>
                      <Calendar size={16} color="#6B7280" />
                      <Text style={styles.itemDetailText}>
                        {formatDate(item.nextDate)}
                      </Text>
                      <Text style={styles.itemDetailLabel}>
                        {item.frequency === 'one-time' ? 'Expires' : 'Next renewal'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
        
        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterButtonActive: {
    backgroundColor: '#14B8A6',
    borderColor: '#14B8A6',
  },
  filterButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  filterButtonTextActive: {
    color: '#ffffff',
  },
  listContainer: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
  itemsList: {
    paddingHorizontal: 20,
    gap: 16,
  },
  itemCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  itemName: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    flex: 1,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  itemType: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
  },
  itemDetails: {
    marginTop: 8,
  },
  itemDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemDetailText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  itemDetailLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  bottomSpacing: {
    height: 20,
  },
});