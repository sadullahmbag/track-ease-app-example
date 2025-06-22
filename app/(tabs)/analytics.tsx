import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrendingUp, PieChart, Calendar, DollarSign } from 'lucide-react-native';
import { useData } from '@/contexts/DataContext';

const { width } = Dimensions.get('window');

export default function AnalyticsTab() {
  const { subscriptions, getTotalMonthly, getSpendingByCategory, getMonthlyTrends } = useData();

  const totalMonthly = getTotalMonthly();
  const totalYearly = totalMonthly * 12;
  const categorySpending = getSpendingByCategory();
  const monthlyTrends = getMonthlyTrends();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const activeSubscriptions = subscriptions.filter(sub => sub.frequency !== 'one-time').length;
  const warranties = subscriptions.filter(sub => sub.type === 'warranty').length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Analytics</Text>
          <Text style={styles.headerSubtitle}>Your spending insights</Text>
        </View>

        {/* Overview Cards */}
        <View style={styles.overviewContainer}>
          <View style={styles.overviewCard}>
            <View style={styles.cardHeader}>
              <DollarSign size={24} color="#14B8A6" />
              <Text style={styles.cardTitle}>Monthly Spending</Text>
            </View>
            <Text style={styles.cardValue}>{formatCurrency(totalMonthly)}</Text>
            <Text style={styles.cardSubtext}>
              {formatCurrency(totalYearly)} per year
            </Text>
          </View>

          <View style={styles.overviewCard}>
            <View style={styles.cardHeader}>
              <Calendar size={24} color="#3B82F6" />
              <Text style={styles.cardTitle}>Active Items</Text>
            </View>
            <Text style={styles.cardValue}>{subscriptions.length}</Text>
            <Text style={styles.cardSubtext}>
              {activeSubscriptions} subscriptions, {warranties} warranties
            </Text>
          </View>
        </View>

        {/* Spending by Category */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <PieChart size={24} color="#111827" />
            <Text style={styles.sectionTitle}>Spending by Category</Text>
          </View>
          
          {categorySpending.length === 0 ? (
            <View style={styles.emptyState}>
              <PieChart size={48} color="#D1D5DB" />
              <Text style={styles.emptyStateText}>No spending data available</Text>
            </View>
          ) : (
            <View style={styles.categoryList}>
              {categorySpending.map((category, index) => (
                <View key={index} style={styles.categoryItem}>
                  <View style={styles.categoryInfo}>
                    <View 
                      style={[styles.categoryDot, { backgroundColor: category.color }]} 
                    />
                    <Text style={styles.categoryName}>{category.category}</Text>
                  </View>
                  <View style={styles.categoryStats}>
                    <Text style={styles.categoryAmount}>
                      {formatCurrency(category.amount)}
                    </Text>
                    <Text style={styles.categoryPercentage}>
                      {category.percentage}%
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Monthly Trends */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={24} color="#111827" />
            <Text style={styles.sectionTitle}>Monthly Trends</Text>
          </View>
          
          <View style={styles.trendsContainer}>
            {monthlyTrends.map((trend, index) => {
              const maxAmount = Math.max(...monthlyTrends.map(t => t.amount));
              const barHeight = maxAmount > 0 ? (trend.amount / maxAmount) * 120 : 0;
              
              return (
                <View key={index} style={styles.trendItem}>
                  <View style={styles.trendBar}>
                    <View 
                      style={[
                        styles.trendBarFill, 
                        { height: barHeight }
                      ]} 
                    />
                  </View>
                  <Text style={styles.trendAmount}>
                    {formatCurrency(trend.amount)}
                  </Text>
                  <Text style={styles.trendMonth}>{trend.month}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Insights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Insights</Text>
          <View style={styles.insightsList}>
            <View style={styles.insightItem}>
              <Text style={styles.insightTitle}>Average Monthly Cost</Text>
              <Text style={styles.insightValue}>
                {subscriptions.length > 0 
                  ? formatCurrency(totalMonthly / subscriptions.length)
                  : formatCurrency(0)
                }
              </Text>
            </View>
            
            <View style={styles.insightItem}>
              <Text style={styles.insightTitle}>Most Expensive Category</Text>
              <Text style={styles.insightValue}>
                {categorySpending.length > 0 
                  ? categorySpending[0].category
                  : 'No data'
                }
              </Text>
            </View>
            
            <View style={styles.insightItem}>
              <Text style={styles.insightTitle}>Yearly Projection</Text>
              <Text style={styles.insightValue}>
                {formatCurrency(totalYearly)}
              </Text>
            </View>
          </View>
        </View>

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
    paddingBottom: 24,
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
  overviewContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 16,
    marginBottom: 32,
  },
  overviewCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  cardValue: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 4,
  },
  cardSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 16,
  },
  categoryList: {
    gap: 12,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  categoryName: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#111827',
  },
  categoryStats: {
    alignItems: 'flex-end',
  },
  categoryAmount: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 2,
  },
  categoryPercentage: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  trendsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    backgroundColor: '#F9FAFB',
    padding: 20,
    borderRadius: 16,
    height: 200,
  },
  trendItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  trendBar: {
    width: 24,
    height: 120,
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  trendBarFill: {
    width: '100%',
    backgroundColor: '#14B8A6',
    borderRadius: 12,
  },
  trendAmount: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  trendMonth: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  insightsList: {
    gap: 16,
  },
  insightItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
  },
  insightTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  insightValue: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  bottomSpacing: {
    height: 20,
  },
});