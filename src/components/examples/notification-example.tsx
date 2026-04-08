import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { usePushNotifications } from '../../hooks/use-push-notifications';
import { sendTestNotification, sendClassReminderNotification } from '../../utils/push-notifications';
import { useThemeColors } from '../../context/theme-context';

/**
 * Example component demonstrating push notifications usage
 * Shows how to:
 * - Request permissions
 * - Send notifications
 * - Display status
 */
export function NotificationExample() {
  const { colors } = useThemeColors();
  const {
    isPushEnabled,
    pushToken,
    showNotification,
    showClassReminder,
    showInfo,
    requestPermissions,
    clearInAppNotifications,
  } = usePushNotifications();

  const [isLoading, setIsLoading] = useState(false);

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    try {
      const granted = await requestPermissions();
      if (granted) {
        Alert.alert('Success', 'Push notifications enabled!');
      } else {
        Alert.alert('Failed', 'Could not enable notifications');
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Failed to request permissions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestNotification = async () => {
    setIsLoading(true);
    try {
      await sendTestNotification();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClassReminder = async () => {
    setIsLoading(true);
    try {
      await showClassReminder('Data Structures', '10:30 AM', 5);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignmentNotification = async () => {
    setIsLoading(true);
    try {
      await showNotification({
        title: 'Assignment Due',
        body: 'DSA assignment is due in 2 hours',
        type: 'reminder',
        data: { assignmentId: '123' },
        showInApp: true,
        sound: true,
      });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInfoNotification = async () => {
    setIsLoading(true);
    try {
      await showInfo('Schedule Updated', 'Your timetable has been updated for next week');
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const Button = ({ title, onPress, variant = 'primary' }: any) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={isLoading}
      style={{
        backgroundColor: variant === 'primary' ? colors.primary : colors.surface,
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        opacity: isLoading ? 0.6 : 1,
        borderWidth: variant === 'secondary' ? 1 : 0,
        borderColor: variant === 'secondary' ? colors.primary : undefined,
      }}
    >
      {isLoading ? (
        <ActivityIndicator color={variant === 'secondary' ? colors.primary : '#fff'} />
      ) : (
        <Text
          style={{
            color: variant === 'secondary' ? colors.primary : '#fff',
            fontWeight: '600',
            textAlign: 'center',
          }}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
    >
      <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 20 }}>
        Push Notifications Demo
      </Text>

      {/* Status Section */}
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 }}>
          Status
        </Text>
        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.textSecondary }}>
            Push Enabled: <Text style={{ fontWeight: '600', color: colors.text }}>{isPushEnabled ? '✓ Yes' : '✗ No'}</Text>
          </Text>
          {pushToken && (
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              Token: {pushToken.substring(0, 20)}...
            </Text>
          )}
        </View>
      </View>

      {/* Permissions */}
      {!isPushEnabled && (
        <View style={{ marginBottom: 20 }}>
          <Button title="📱 Enable Push Notifications" onPress={handleEnableNotifications} />
        </View>
      )}

      {/* Test Buttons */}
      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 }}>
        Test Notifications
      </Text>

      <Button title="📢 Test Notification" onPress={handleTestNotification} variant="primary" />
      <Button title="📋 Class Reminder (5 min)" onPress={handleClassReminder} variant="secondary" />
      <Button title="📝 Assignment Due Notice" onPress={handleAssignmentNotification} variant="secondary" />
      <Button title="ℹ️ Info: Schedule Updated" onPress={handleInfoNotification} variant="secondary" />
      <Button title="🗑️ Clear In-App Notifications" onPress={clearInAppNotifications} variant="secondary" />

      {/* Info Section */}
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 12,
          padding: 16,
          marginTop: 20,
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 12 }}>
          About This Demo
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
          This example demonstrates the complete push notification system. Test different notification types and see how they appear both as push notifications (in device panel) and in-app toasts (at top of screen).
        </Text>
      </View>
    </ScrollView>
  );
}
