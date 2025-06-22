import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, Alert, Modal, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Calendar, DollarSign, Tag, Repeat, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react-native';
import { useData } from '@/contexts/DataContext';
import { router } from 'expo-router';

type ItemType = 'subscription' | 'warranty';
type Frequency = 'monthly' | 'yearly' | 'one-time';

const categories = [
  { id: 'entertainment', name: 'Entertainment', color: '#A855F7' },
  { id: 'electronics', name: 'Electronics', color: '#14B8A6' },
  { id: 'insurance', name: 'Insurance', color: '#F97316' },
  { id: 'utilities', name: 'Utilities', color: '#3B82F6' },
  { id: 'software', name: 'Software', color: '#EF4444' },
  { id: 'other', name: 'Other', color: '#6B7280' },
];

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const daysInMonth = (month: number, year: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const CalendarPicker = ({ selectedDate, onDateSelect, onClose }: {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onClose: () => void;
}) => {
  const [currentMonth, setCurrentMonth] = useState(selectedDate.getMonth());
  const [currentYear, setCurrentYear] = useState(selectedDate.getFullYear());

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysCount = daysInMonth(currentMonth, currentYear);

  const previousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const selectDate = (day: number) => {
    const newDate = new Date(currentYear, currentMonth, day);
    onDateSelect(newDate);
    onClose();
  };

  const renderCalendarDays = () => {
    const days = [];
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
    }
    
    // Days of the month
    for (let day = 1; day <= daysCount; day++) {
      const isSelected = selectedDate.getDate() === day && 
                        selectedDate.getMonth() === currentMonth && 
                        selectedDate.getFullYear() === currentYear;
      const isToday = new Date().getDate() === day && 
                     new Date().getMonth() === currentMonth && 
                     new Date().getFullYear() === currentYear;
      
      days.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.calendarDay,
            styles.calendarDayButton,
            isSelected && styles.calendarDaySelected,
            isToday && !isSelected && styles.calendarDayToday
          ]}
          onPress={() => selectDate(day)}
        >
          <Text style={[
            styles.calendarDayText,
            isSelected && styles.calendarDayTextSelected,
            isToday && !isSelected && styles.calendarDayTextToday
          ]}>
            {day}
          </Text>
        </TouchableOpacity>
      );
    }
    
    return days;
  };

  return (
    <View style={styles.calendarContainer}>
      <View style={styles.calendarHeader}>
        <TouchableOpacity onPress={previousMonth} style={styles.calendarNavButton}>
          <ChevronLeft size={20} color="#6B7280" />
        </TouchableOpacity>
        <Text style={styles.calendarTitle}>
          {months[currentMonth]} {currentYear}
        </Text>
        <TouchableOpacity onPress={nextMonth} style={styles.calendarNavButton}>
          <ChevronRight size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.calendarWeekDays}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <Text key={day} style={styles.calendarWeekDay}>{day}</Text>
        ))}
      </View>
      
      <View style={styles.calendarGrid}>
        {renderCalendarDays()}
      </View>
      
      <View style={styles.calendarActions}>
        <TouchableOpacity onPress={onClose} style={styles.calendarCancelButton}>
          <Text style={styles.calendarCancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => {
          onDateSelect(new Date());
          onClose();
        }} style={styles.calendarTodayButton}>
          <Text style={styles.calendarTodayText}>Today</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const SuccessAnimation = ({ visible, onComplete }: { visible: boolean; onComplete: () => void }) => {
  const scaleAnim = new Animated.Value(0);
  const opacityAnim = new Animated.Value(0);

  React.useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(1500),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        scaleAnim.setValue(0);
        onComplete();
      });
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none">
      <View style={styles.successOverlay}>
        <Animated.View 
          style={[
            styles.successContainer,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            }
          ]}
        >
          <View style={styles.successIconContainer}>
            <CheckCircle size={64} color="#10B981" />
          </View>
          <Text style={styles.successTitle}>Success!</Text>
          <Text style={styles.successMessage}>Item added successfully</Text>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default function AddTab() {
  const [itemType, setItemType] = useState<ItemType>('subscription');
  const [name, setName] = useState('');
  const [cost, setCost] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [reminderDays, setReminderDays] = useState('7');
  const [nextRenewalDate, setNextRenewalDate] = useState<Date>(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return date;
  });
  const [showCalendar, setShowCalendar] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { addSubscription } = useData();

  // Auto-update next renewal date when frequency changes
  useEffect(() => {
    const today = new Date();
    let newDate = new Date(today);

    switch (frequency) {
      case 'monthly':
        newDate.setMonth(today.getMonth() + 1);
        break;
      case 'yearly':
        newDate.setFullYear(today.getFullYear() + 1);
        break;
      case 'one-time':
        // For one-time items, set to a future date (e.g., warranty expiration)
        newDate.setFullYear(today.getFullYear() + 1);
        break;
    }

    setNextRenewalDate(newDate);
  }, [frequency]);

  const triggerFeedback = () => {
    if (Platform.OS !== 'web') {
      // Only runs on iOS/Android - haptics not available on web
      try {
        // Haptics would be imported here if available
      } catch (error) {
        // Silently fail on web
      }
    }
  };

  const handleSave = async () => {
    triggerFeedback();
    
    if (!name || !cost || !selectedCategory) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }

    const costNumber = parseFloat(cost);
    if (isNaN(costNumber) || costNumber <= 0) {
      Alert.alert('Invalid Cost', 'Please enter a valid cost amount.');
      return;
    }

    const reminderDaysNumber = parseInt(reminderDays) || 7;

    setIsLoading(true);

    try {
      const newItem = {
        name,
        type: itemType,
        cost: costNumber,
        frequency,
        nextDate: nextRenewalDate,
        category: selectedCategory,
        reminderDays: reminderDaysNumber,
      };

      await addSubscription(newItem);
      
      // Show success animation
      setShowSuccess(true);
    } catch (error) {
      console.error('Error adding subscription:', error);
      Alert.alert('Error', 'Failed to add item. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccessComplete = () => {
    setShowSuccess(false);
    
    // Reset form
    setName('');
    setCost('');
    setSelectedCategory('');
    setReminderDays('7');
    const defaultDate = new Date();
    defaultDate.setMonth(defaultDate.getMonth() + 1);
    setNextRenewalDate(defaultDate);
    
    // Navigate to all items page
    router.push('/all-items');
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add New Item</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Type Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Type</Text>
          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                itemType === 'subscription' && styles.typeButtonActive
              ]}
              onPress={() => setItemType('subscription')}
            >
              <Text style={[
                styles.typeButtonText,
                itemType === 'subscription' && styles.typeButtonTextActive
              ]}>
                Subscription
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeButton,
                itemType === 'warranty' && styles.typeButtonActive
              ]}
              onPress={() => setItemType('warranty')}
            >
              <Text style={[
                styles.typeButtonText,
                itemType === 'warranty' && styles.typeButtonTextActive
              ]}>
                Warranty
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Name Input */}
        <View style={styles.section}>
          <Text style={styles.label}>Name *</Text>
          <View style={styles.inputContainer}>
            <Tag size={20} color="#6B7280" />
            <TextInput
              style={styles.input}
              placeholder={`Enter ${itemType} name`}
              value={name}
              onChangeText={setName}
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        {/* Cost Input */}
        <View style={styles.section}>
          <Text style={styles.label}>Cost *</Text>
          <View style={styles.inputContainer}>
            <DollarSign size={20} color="#6B7280" />
            <TextInput
              style={styles.input}
              placeholder="0.00"
              value={cost}
              onChangeText={setCost}
              keyboardType="decimal-pad"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        {/* Frequency Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Payment Frequency</Text>
          <View style={styles.frequencyContainer}>
            {(['monthly', 'yearly', 'one-time'] as Frequency[]).map((freq) => (
              <TouchableOpacity
                key={freq}
                style={[
                  styles.frequencyButton,
                  frequency === freq && styles.frequencyButtonActive
                ]}
                onPress={() => setFrequency(freq)}
              >
                <Repeat size={16} color={frequency === freq ? '#ffffff' : '#6B7280'} />
                <Text style={[
                  styles.frequencyButtonText,
                  frequency === freq && styles.frequencyButtonTextActive
                ]}>
                  {freq === 'one-time' ? 'One-time' : freq.charAt(0).toUpperCase() + freq.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Next Renewal Date */}
        <View style={styles.section}>
          <Text style={styles.label}>
            {frequency === 'one-time' ? 'Expiration Date' : 'Next Renewal Date'}
          </Text>
          <TouchableOpacity 
            style={styles.inputContainer}
            onPress={() => setShowCalendar(true)}
          >
            <Calendar size={20} color="#6B7280" />
            <Text style={styles.dateText}>
              {formatDate(nextRenewalDate)}
            </Text>
          </TouchableOpacity>
          <Text style={styles.helperText}>
            {frequency === 'monthly' && 'Automatically set to next month'}
            {frequency === 'yearly' && 'Automatically set to next year'}
            {frequency === 'one-time' && 'Set expiration or end date'}
          </Text>
        </View>

        {/* Category Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Category *</Text>
          <View style={styles.categoryGrid}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryButton,
                  selectedCategory === category.id && styles.categoryButtonActive,
                  { borderColor: selectedCategory === category.id ? category.color : '#E5E7EB' }
                ]}
                onPress={() => setSelectedCategory(category.id)}
              >
                <View 
                  style={[
                    styles.categoryDot, 
                    { backgroundColor: category.color }
                  ]} 
                />
                <Text style={[
                  styles.categoryButtonText,
                  selectedCategory === category.id && { color: category.color }
                ]}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Reminder Settings */}
        <View style={styles.section}>
          <Text style={styles.label}>Remind me</Text>
          <View style={styles.inputContainer}>
            <Calendar size={20} color="#6B7280" />
            <TextInput
              style={styles.input}
              placeholder="7"
              value={reminderDays}
              onChangeText={setReminderDays}
              keyboardType="number-pad"
              placeholderTextColor="#9CA3AF"
            />
            <Text style={styles.inputSuffix}>days before</Text>
          </View>
        </View>

        {/* Save Button */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={[styles.saveButton, isLoading && styles.saveButtonDisabled]} 
            onPress={handleSave}
            disabled={isLoading}
          >
            <Text style={styles.saveButtonText}>
              {isLoading ? 'Saving...' : `Save ${itemType === 'subscription' ? 'Subscription' : 'Warranty'}`}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Calendar Modal */}
      <Modal
        visible={showCalendar}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCalendar(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <CalendarPicker
              selectedDate={nextRenewalDate}
              onDateSelect={setNextRenewalDate}
              onClose={() => setShowCalendar(false)}
            />
          </View>
        </View>
      </Modal>

      {/* Success Animation */}
      <SuccessAnimation 
        visible={showSuccess} 
        onComplete={handleSuccessComplete}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  placeholder: {
    width: 40,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 12,
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  typeButtonActive: {
    backgroundColor: '#14B8A6',
  },
  typeButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  typeButtonTextActive: {
    color: '#ffffff',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
    marginLeft: 12,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
    marginLeft: 12,
  },
  inputSuffix: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginLeft: 8,
  },
  helperText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 8,
    fontStyle: 'italic',
  },
  frequencyContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  frequencyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  frequencyButtonActive: {
    backgroundColor: '#14B8A6',
    borderColor: '#14B8A6',
  },
  frequencyButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  frequencyButtonTextActive: {
    color: '#ffffff',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
    minWidth: '30%',
  },
  categoryButtonActive: {
    backgroundColor: '#ffffff',
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  categoryButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  saveButton: {
    backgroundColor: '#14B8A6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    margin: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  calendarContainer: {
    padding: 20,
    width: 320,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  calendarNavButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  calendarTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  calendarWeekDays: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  calendarWeekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    paddingVertical: 8,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarDayButton: {
    borderRadius: 8,
  },
  calendarDaySelected: {
    backgroundColor: '#14B8A6',
  },
  calendarDayToday: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#14B8A6',
  },
  calendarDayText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
  },
  calendarDayTextSelected: {
    color: '#ffffff',
    fontFamily: 'Inter-SemiBold',
  },
  calendarDayTextToday: {
    color: '#14B8A6',
    fontFamily: 'Inter-SemiBold',
  },
  calendarActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  calendarCancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  calendarCancelText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  calendarTodayButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#14B8A6',
  },
  calendarTodayText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
});