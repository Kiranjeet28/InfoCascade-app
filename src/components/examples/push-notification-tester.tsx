import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Clipboard } from 'react-native';
import { usePushNotifications } from '../../hooks/use-push-notifications';
import { useThemeColors } from '../../context/theme-context';

/**
 * Push Notification Tester Component
 *
 * This component helps you:
 * 1. Get your device's push token
 * 2. Test push notifications from backend
 * 3. Understand push notification setup
 * 4. Debug notification issues
 */
export function PushNotificationTester() {
  const { colors } = useThemeColors();
  const {
    isPushEnabled,
    pushToken,
    requestPermissions,
  } = usePushNotifications();

  const [isLoading, setIsLoading] = useState(false);
  const [backendUrl, setBackendUrl] = useState('https://infocascade-backend.onrender.com');
  const [testMessage, setTestMessage] = useState('Test notification from backend');
  const [copiedToken, setCopiedToken] = useState(false);

  const handleCopyToken = async () => {
    if (pushToken) {
      await Clipboard.setString(pushToken);
      setCopiedToken(true);
      Alert.alert('Copied', 'Push token copied to clipboard');
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  const handleRequestPermissions = async () => {
    setIsLoading(true);
    try {
      const granted = await requestPermissions();
      if (granted) {
        Alert.alert('Success', 'Push notifications enabled! Your token is now available.');
      } else {
        Alert.alert('Failed', 'Could not enable push notifications.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to request permissions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendTestFromBackend = async () => {
    if (!pushToken) {
      Alert.alert('Error', 'Push token not available. Enable notifications first.');
      return;
    }

    if (!backendUrl.trim()) {
      Alert.alert('Error', 'Please enter backend URL');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/notifications/send-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pushToken,
          title: 'Backend Test',
          body: testMessage || 'Test notification from backend',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', 'Test notification sent to backend!\n\nCheck your device notification panel.');
      } else {
        Alert.alert('Error', data.message || 'Failed to send notification');
      }
    } catch (error) {
      Alert.alert('Error', `Backend connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const Card = ({ title, children }: any) => (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: colors.primary,
      }}
    >
      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 }}>
        {title}
      </Text>
      {children}
    </View>
  );

  const Button = ({ title, onPress, variant = 'primary', disabled = false }: any) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || isLoading}
      style={{
        backgroundColor:
          variant === 'primary'
            ? colors.primary
            : variant === 'success'
            ? '#10B981'
            : variant === 'danger'
            ? '#EF4444'
            : colors.surface,
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginBottom: 8,
        opacity: disabled || isLoading ? 0.5 : 1,
        borderWidth: variant === 'secondary' ? 1 : 0,
        borderColor: variant === 'secondary' ? colors.primary : undefined,
      }}
    >
      {isLoading && variant === 'primary' ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text
          style={{
            color: variant === 'secondary' ? colors.primary : '#fff',
            fontWeight: '600',
            textAlign: 'center',
            fontSize: 14,
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
      <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 8 }}>
        🔔 Push Notifications
      </Text>
      <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 20 }}>
        Tester & Setup Guide
      </Text>

      {/* Status Card */}
      <Card title="📊 Status">
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: colors.textSecondary }}>Push Enabled:</Text>
            <View
              style={{
                backgroundColor: isPushEnabled ? '#10B981' : '#EF4444',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 6,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
                {isPushEnabled ? '✓ Enabled' : '✗ Disabled'}
              </Text>
            </View>
          </View>

          {!isPushEnabled && (
            <Button
              title="📱 Enable Push Notifications"
              onPress={handleRequestPermissions}
              variant="primary"
            />
          )}
        </View>
      </Card>

      {/* Push Token Card */}
      {pushToken && (
        <Card title="🔑 Your Push Token">
          <View
            style={{
              backgroundColor: colors.border || '#F3F4F6',
              padding: 12,
              borderRadius: 8,
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                color: colors.text,
                fontSize: 11,
                fontFamily: 'monospace',
                lineHeight: 16,
              }}
            >
              {pushToken}
            </Text>
          </View>
          <Button title="📋 Copy Token" onPress={handleCopyToken} variant="secondary" />
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 8 }}>
            💡 Share this token with your backend developer to send you notifications
          </Text>
        </Card>
      )}

      {/* Backend Test Card */}
      {isPushEnabled && pushToken && (
        <Card title="🔗 Test Backend Push">
          <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 12 }}>
            Send a test notification from your backend:
          </Text>

          <Text style={{ color: colors.text, fontWeight: '600', marginBottom: 4, fontSize: 12 }}>
            Backend URL:
          </Text>
          <TextInput
            placeholder="Enter backend URL"
            value={backendUrl}
            onChangeText={setBackendUrl}
            style={{
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 8,
              padding: 10,
              color: colors.text,
              marginBottom: 12,
              fontSize: 12,
            }}
            placeholderTextColor={colors.textSecondary}
          />

          <Text style={{ color: colors.text, fontWeight: '600', marginBottom: 4, fontSize: 12 }}>
            Test Message:
          </Text>
          <TextInput
            placeholder="Enter test message"
            value={testMessage}
            onChangeText={setTestMessage}
            style={{
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 8,
              padding: 10,
              color: colors.text,
              marginBottom: 12,
              fontSize: 12,
              minHeight: 60,
            }}
            placeholderTextColor={colors.textSecondary}
            multiline
          />

          <Button
            title="📤 Send Test Notification"
            onPress={handleSendTestFromBackend}
            variant="primary"
          />

          <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 8 }}>
            ℹ️ This sends your token to the backend, which will then push a notification back to your device.
          </Text>
        </Card>
      )}

      {/* How It Works */}
      <Card title="⚙️ How Backend Push Works">
        <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginBottom: 8 }}>
          1. App gets push token (above)
          2. Send token to backend & save it
          3. Backend uses token to send notifications
          4. Notification appears in device panel
          5. User taps notification to open app
        </Text>
      </Card>

      {/* Backend Code Example */}
      <Card title="💻 Backend Example (Node.js)">
        <View
          style={{
            backgroundColor: colors.border || '#F3F4F6',
            padding: 12,
            borderRadius: 8,
            marginBottom: 8,
          }}
        >
          <Text
            style={{
              color: colors.text,
              fontSize: 10,
              fontFamily: 'monospace',
              lineHeight: 14,
            }}
          >
            {`const expo = new Expo();\n\nasync function sendPush(token) {\n  await expo.sendPushNotificationsAsync([\n    {\n      to: token,\n      sound: 'default',\n      title: 'Hello',\n      body: 'Test notification'\n    }\n  ]);\n}`}
          </Text>
        </View>
      </Card>

      {/* Step by Step Guide */}
      <Card title="📋 Setup Steps">
        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.text, fontWeight: '600', fontSize: 13 }}>
            For Developers:
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 18 }}>
            1. User opens app and enables notifications above
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 18 }}>
            2. Copy the push token from above
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 18 }}>
            3. Send token to your backend API
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 18 }}>
            4. Backend stores token in database
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 18 }}>
            5. When event happens, backend sends push via token
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 18 }}>
            6. Notification appears in device panel
          </Text>
        </View>
      </Card>

      {/* Important Notes */}
      <Card title="⚠️ Important Notes">
        <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 18 }}>
          • Push notifications only work on physical devices
          {'\n'}• Simulator won't receive push notifications
          {'\n'}• Device must have internet connection
          {'\n'}• User must grant notification permission
          {'\n'}• Backend needs Expo credentials to send
          {'\n'}• Token valid for ~1 year
        </Text>
      </Card>

      {/* Troubleshooting */}
      <Card title="🔧 Troubleshooting">
        <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 18 }}>
          No notifications? Check:
          {'\n'}✓ Using physical device (not simulator)
          {'\n'}✓ Notifications enabled above
          {'\n'}✓ Device connected to internet
          {'\n'}✓ Backend is sending correctly
          {'\n'}✓ Notification permissions granted
          {'\n'}✓ Token is valid and matches
        </Text>
      </Card>

      {/* Resources */}
      <Card title="📚 Resources">
        <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 18 }}>
          Expo Push Notifications:
          {'\n'}https://docs.expo.dev/push-notifications/overview/
          {'\n\n'}
          Expo Push API:
          {'\n'}https://docs.expo.dev/push-notifications/push-api/
        </Text>
      </Card>
    </ScrollView>
  );
}
