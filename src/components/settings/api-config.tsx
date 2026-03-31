import { useThemeColors } from '@/context/theme-context';
import {
    clearStoredApiUrl,
    getStoredApiUrl,
    resolveApiBase,
    setApiUrl,
} from '@/utils/api';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface Props {
    onClose?: () => void;
}

export function ApiConfigScreen({ onClose }: Props) {
    const theme = useThemeColors();
    const colors = theme.colors;
    const [customUrl, setCustomUrl] = useState('');
    const [currentUrl, setCurrentUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasOverride, setHasOverride] = useState(false);

    useEffect(() => {
        loadCurrentUrl();
    }, []);

    const loadCurrentUrl = async () => {
        try {
            setLoading(true);
            const storedUrl = await getStoredApiUrl();
            const defaultUrl = resolveApiBase();

            if (storedUrl) {
                setCustomUrl(storedUrl);
                setCurrentUrl(storedUrl);
                setHasOverride(true);
            } else {
                setCurrentUrl(defaultUrl);
                setCustomUrl('');
                setHasOverride(false);
            }
        } catch (error) {
            console.error('Failed to load API URL:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveUrl = async () => {
        if (!customUrl.trim()) {
            Alert.alert('Error', 'Please enter a valid API URL');
            return;
        }

        try {
            setSaving(true);
            await setApiUrl(customUrl);
            setCurrentUrl(customUrl);
            setHasOverride(true);
            Alert.alert('Success', 'API URL saved! App will use this URL on next restart.');
        } catch (error) {
            Alert.alert('Error', 'Failed to save API URL');
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const handleResetUrl = async () => {
        Alert.alert(
            'Reset API URL',
            'This will reset to the environment configuration. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setSaving(true);
                            await clearStoredApiUrl();
                            const defaultUrl = resolveApiBase();
                            setCurrentUrl(defaultUrl);
                            setCustomUrl('');
                            setHasOverride(false);
                            Alert.alert(
                                'Success',
                                'API URL reset to default configuration.'
                            );
                        } catch (error) {
                            Alert.alert('Error', 'Failed to reset API URL');
                            console.error(error);
                        } finally {
                            setSaving(false);
                        }
                    },
                },
            ]
        );
    };

    const handleTestConnection = async () => {
        const urlToTest = customUrl || currentUrl;
        if (!urlToTest) {
            Alert.alert('Error', 'No URL to test');
            return;
        }

        try {
            setSaving(true);
            const response = await fetch(`${urlToTest}/api/auth/verify`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });

            if (response.ok) {
                Alert.alert('Success', `✓ Connection successful to ${urlToTest}`);
            } else {
                Alert.alert(
                    'Server Error',
                    `Server returned status ${response.status}. URL is reachable but may have issues.`
                );
            }
        } catch (error: any) {
            Alert.alert(
                'Connection Failed',
                `Cannot reach ${urlToTest}\n\nError: ${error.message}`
            );
        } finally {
            setSaving(false);
        }
    };

    // Test root endpoint ("/")
    const handleTestRootEndpoint = async () => {
        const urlToTest = customUrl || currentUrl;
        if (!urlToTest) {
            Alert.alert('Error', 'No URL to test');
            return;
        }
        try {
            setSaving(true);
            const response = await fetch(`${urlToTest}/`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await response.json();
            if (response.ok && data && data.message) {
                Alert.alert('Success', `Root endpoint: ${data.message}`);
            } else {
                Alert.alert(
                    'Server Error',
                    `Status ${response.status}. Response: ${JSON.stringify(data)}`
                );
            }
        } catch (error: any) {
            Alert.alert(
                'Connection Failed',
                `Cannot reach ${urlToTest}/\n\nError: ${error.message}`
            );
        } finally {
            setSaving(false);
        }
    };

    const styles = StyleSheet.create({
        container: {
            padding: 20,
            backgroundColor: colors.bg,
        },
        section: {
            marginBottom: 24,
        },
        label: {
            fontSize: 14,
            fontWeight: '600',
            color: colors.textPrimary,
            marginBottom: 8,
        },
        infoBox: {
            backgroundColor: colors.surface,
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
            borderLeftWidth: 4,
            borderLeftColor: colors.primary,
        },
        infoText: {
            fontSize: 13,
            color: colors.textSecondary,
            lineHeight: 18,
        },
        input: {
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 12,
            fontSize: 14,
            color: colors.textPrimary,
            backgroundColor: colors.surface,
            marginBottom: 12,
        },
        button: {
            height: 44,
            borderRadius: 8,
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'row',
            gap: 8,
            marginBottom: 8,
        },
        primaryButton: {
            backgroundColor: colors.primary,
        },
        secondaryButton: {
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
        },
        dangerButton: {
            backgroundColor: colors.error + '20',
            borderWidth: 1,
            borderColor: colors.error,
        },
        buttonText: {
            fontSize: 16,
            fontWeight: '600',
            color: 'white',
        },
        secondaryButtonText: {
            color: colors.primary,
        },
        dangerButtonText: {
            color: colors.error,
        },
        statusBox: {
            backgroundColor: colors.success + '20',
            borderLeftColor: colors.success,
            borderLeftWidth: 4,
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
        },
        statusText: {
            fontSize: 13,
            color: colors.success,
            fontWeight: '600',
        },
    });

    if (loading) {
        return (
            <View
                style={[
                    styles.container,
                    { justifyContent: 'center', alignItems: 'center', minHeight: 200 },
                ]}
            >
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Current Status */}
            <View style={styles.section}>
                <Text style={styles.label}>Current API Configuration</Text>

                {hasOverride && (
                    <View style={[styles.statusBox, { borderLeftColor: colors.warning }]}>
                        <Text style={[styles.statusText, { color: colors.warning }]}>
                            ⚠ Using custom override (not environment default)
                        </Text>
                    </View>
                )}

                <View style={styles.infoBox}>
                    <Text style={styles.label} numberOfLines={1}>
                        Active URL:
                    </Text>
                    <Text style={[styles.infoText, { fontFamily: 'monospace' }]}>
                        {currentUrl}
                    </Text>
                </View>

                <Text style={styles.label}>How to Change API URL (APK)</Text>
                <View style={styles.infoBox}>
                    <Text style={styles.infoText}>
                        Since the APK embeds the environment URL at build time, you can
                        override it here without rebuilding:
                    </Text>
                    <Text style={[styles.infoText, { marginTop: 8, fontWeight: '600' }]}>
                        1. Enter new URL below{'\n'}
                        2. Tap &quot;Test Connection&quot; to verify{'\n'}
                        3. Tap &quot;Save Override&quot;
                    </Text>
                </View>
            </View>

            {/* URL Input */}
            <View style={styles.section}>
                <Text style={styles.label}>API Base URL</Text>
                <TextInput
                    style={styles.input}
                    placeholder="https://api.example.com"
                    placeholderTextColor={colors.textMuted}
                    value={customUrl}
                    onChangeText={setCustomUrl}
                    editable={!saving}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                />
                <Text style={[styles.infoText, { marginBottom: 12 }]}>
                    Example: https://infocascade-backend.onrender.com
                </Text>

                {/* Action Buttons */}

                <TouchableOpacity
                    style={[styles.button, styles.primaryButton]}
                    onPress={handleTestConnection}
                    disabled={saving}
                    activeOpacity={0.8}
                >
                    {saving ? (
                        <ActivityIndicator size={20} color="white" />
                    ) : (
                        <Text style={styles.buttonText}>🔗 Test /api/auth/verify</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.secondaryButton]}
                    onPress={handleTestRootEndpoint}
                    disabled={saving}
                    activeOpacity={0.8}
                >
                    {saving ? (
                        <ActivityIndicator size={20} color={styles.secondaryButtonText.color} />
                    ) : (
                        <Text style={[styles.buttonText, styles.secondaryButtonText]}>🌐 Test Root Endpoint (/)</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.primaryButton]}
                    onPress={handleSaveUrl}
                    disabled={saving || !customUrl.trim()}
                    activeOpacity={0.8}
                >
                    {saving ? (
                        <ActivityIndicator size={20} color="white" />
                    ) : (
                        <Text style={styles.buttonText}>✓ Save Override</Text>
                    )}
                </TouchableOpacity>

                {hasOverride && (
                    <TouchableOpacity
                        style={[styles.button, styles.dangerButton]}
                        onPress={handleResetUrl}
                        disabled={saving}
                        activeOpacity={0.8}
                    >
                        {saving ? (
                            <ActivityIndicator size={20} color={colors.error} />
                        ) : (
                            <Text style={[styles.buttonText, styles.dangerButtonText]}>
                                ↺ Reset to Default
                            </Text>
                        )}
                    </TouchableOpacity>
                )}
            </View>

            {/* Info */}
            <View style={styles.section}>
                <Text style={styles.label}>About API Configuration</Text>
                <View style={styles.infoBox}>
                    <Text style={styles.infoText}>
                        <Text style={{ fontWeight: 'bold' }}>Environment (.env):</Text>
                        {'\n'}Embedded at APK build time. Cannot change without rebuilding.
                        {'\n\n'}
                        <Text style={{ fontWeight: 'bold' }}>Override:</Text>
                        {'\n'}Stored on device. Persists across app restarts. Takes priority
                        over environment config.
                    </Text>
                </View>
            </View>
        </View>
    );
}
