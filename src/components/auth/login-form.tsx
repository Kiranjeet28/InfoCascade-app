import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../../context/auth-context';
import { useThemeColors } from '../../context/theme-context';
import * as authService from '../../services/auth-service';
import {
    isPasswordStrong,
    isValidEmail,
    validateLoginForm,
} from '../../utils/validators';

export interface LoginFormProps {
    onLoginSuccess?: () => void;
    onSwitchToSignup?: () => void;
    onSwitchToForgotPassword?: () => void;
}

export default function LoginForm({
    onLoginSuccess,
    onSwitchToSignup,
    onSwitchToForgotPassword,
}: LoginFormProps) {
    const { colors } = useThemeColors();
    const auth = useAuth();

    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const emailInputRef = useRef<TextInput>(null);

    // Auto-focus email input on mount
    useEffect(() => {
        setTimeout(() => emailInputRef.current?.focus(), 300);
    }, []);

    const triggerShake = () => {
        Animated.sequence([
            Animated.timing(shakeAnim, {
                toValue: -10,
                duration: 50,
                useNativeDriver: true,
            }),
            Animated.timing(shakeAnim, {
                toValue: 10,
                duration: 50,
                useNativeDriver: true,
            }),
            Animated.timing(shakeAnim, {
                toValue: -10,
                duration: 50,
                useNativeDriver: true,
            }),
            Animated.timing(shakeAnim, {
                toValue: 0,
                duration: 50,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const handleEmailChange = (text: string) => {
        auth.setEmail(text);
        if (emailError) setEmailError('');
    };

    const handlePasswordChange = (text: string) => {
        auth.setPassword(text);
        if (passwordError) setPasswordError('');
    };

    const handleLogin = async () => {
        try {
            // Validate form
            const errors = validateLoginForm(
                auth.formData.email,
                auth.formData.password
            );

            if (errors.email) {
                setEmailError(errors.email);
                triggerShake();
                return;
            }
            if (errors.password) {
                setPasswordError(errors.password);
                triggerShake();
                return;
            }

            setIsLoading(true);
            auth.setLoading(true);

            // Call login API
            const result = await authService.login(
                auth.formData.email,
                auth.formData.password
            );

            if (result.success && result.token && result.user) {
                // Login successful
                auth.setAuthData(result.user, result.token);
                onLoginSuccess?.();
            } else if (result.code === 'OTP_VERIFICATION_REQUIRED') {
                // OTP required - send OTP and switch to page 2
                auth.recordOTPRequired();

                // Send OTP
                const sendResult = await authService.sendOtp(
                    auth.formData.email
                );
                if (sendResult.success) {
                    auth.setOtpSent(true);
                }
            } else if (
                result.code === 'INVALID_PASSWORD' ||
                result.code === 'USER_NOT_FOUND'
            ) {
                // Wrong credentials or user not found
                const attempts = result.attemptsRemaining || auth.attemptsRemaining;
                const error = authService.mapErrorToUserMessage(
                    result.code,
                    'Login failed'
                );

                // Update attempt counter
                if (result.attemptsRemaining !== undefined) {
                    auth.recordFailedAttempt(result.attemptsRemaining);
                }

                // If max attempts reached, route to OTP
                if (attempts === 0) {
                    auth.recordOTPRequired();
                    // Send OTP
                    const sendResult = await authService.sendOtp(
                        auth.formData.email
                    );
                    if (sendResult.success) {
                        auth.setOtpSent(true);
                    }
                } else {
                    // Show error message
                    auth.setError(error);
                    triggerShake();
                }
            } else {
                // Other error
                const error = authService.mapErrorToUserMessage(
                    result.code || 'LOGIN_FAILED',
                    'Login failed'
                );
                auth.setError(error);
                triggerShake();
            }
        } catch (err) {
            const errorMsg = authService.mapErrorToUserMessage(
                err,
                'Login failed. Please try again.'
            );
            auth.setError(errorMsg);
            triggerShake();
        } finally {
            setIsLoading(false);
            auth.setLoading(false);
        }
    };

    const canSubmit =
        isValidEmail(auth.formData.email) &&
        isPasswordStrong(auth.formData.password) &&
        !isLoading;

    const attemptsText =
        auth.attemptsRemaining > 0
            ? `Attempt ${auth.totalAttempts - auth.attemptsRemaining + 1} of ${auth.totalAttempts} • ${auth.attemptsRemaining} remaining`
            : '';

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
        >
            <ScrollView
                contentContainerStyle={{
                    flexGrow: 1,
                    justifyContent: 'center',
                    paddingHorizontal: 20,
                }}
                showsVerticalScrollIndicator={false}
            >
                <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
                    {/* Header */}
                    <View style={{ marginBottom: 32 }}>
                        <Text
                            style={{
                                fontSize: 28,
                                fontWeight: '700',
                                color: colors.textPrimary,
                                marginBottom: 8,
                            }}
                        >
                            Welcome Back
                        </Text>
                        <Text
                            style={{
                                fontSize: 14,
                                color: colors.textSecondary,
                            }}
                        >
                            Sign in to continue to your account
                        </Text>
                    </View>

                    {/* Error Message */}
                    {auth.error && (
                        <View
                            style={{
                                backgroundColor: colors.error + '20',
                                borderLeftWidth: 4,
                                borderLeftColor: colors.error,
                                paddingVertical: 12,
                                paddingHorizontal: 12,
                                borderRadius: 8,
                                marginBottom: 16,
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 14,
                                    color: colors.error,
                                }}
                            >
                                {auth.error}
                            </Text>
                        </View>
                    )}

                    {/* Attempt Counter */}
                    {auth.attemptsRemaining > 0 && (
                        <View
                            style={{
                                backgroundColor:
                                    auth.attemptsRemaining === 1
                                        ? colors.error + '20'
                                        : colors.warning + '20',
                                borderLeftWidth: 4,
                                borderLeftColor:
                                    auth.attemptsRemaining === 1
                                        ? colors.error
                                        : colors.warning,
                                paddingVertical: 12,
                                paddingHorizontal: 12,
                                borderRadius: 8,
                                marginBottom: 16,
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 13,
                                    color:
                                        auth.attemptsRemaining === 1
                                            ? colors.error
                                            : colors.warning,
                                    fontWeight: '600',
                                }}
                            >
                                {attemptsText}
                            </Text>
                        </View>
                    )}

                    {/* Email Input */}
                    <View style={{ marginBottom: 16 }}>
                        <Text
                            style={{
                                fontSize: 14,
                                fontWeight: '600',
                                color: colors.textPrimary,
                                marginBottom: 8,
                            }}
                        >
                            Email Address
                        </Text>
                        <TextInput
                            ref={emailInputRef}
                            placeholder="you@example.com"
                            placeholderTextColor={colors.textMuted}
                            value={auth.formData.email}
                            onChangeText={handleEmailChange}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            editable={!isLoading}
                            style={{
                                borderWidth: 1,
                                borderColor:
                                    emailError ? colors.error : colors.border,
                                borderRadius: 8,
                                paddingHorizontal: 12,
                                paddingVertical: 12,
                                fontSize: 14,
                                color: colors.textPrimary,
                                backgroundColor: colors.surface,
                            }}
                        />
                        {emailError && (
                            <Text
                                style={{
                                    fontSize: 12,
                                    color: colors.error,
                                    marginTop: 6,
                                }}
                            >
                                {emailError}
                            </Text>
                        )}
                    </View>

                    {/* Password Input */}
                    <View style={{ marginBottom: 24 }}>
                        <View
                            style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 8,
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 14,
                                    fontWeight: '600',
                                    color: colors.textPrimary,
                                }}
                            >
                                Password
                            </Text>
                            <TouchableOpacity
                                onPress={() =>
                                    setShowPassword(!showPassword)
                                }
                                disabled={isLoading}
                            >
                                <Text
                                    style={{
                                        fontSize: 12,
                                        color: colors.primary,
                                    }}
                                >
                                    {showPassword ? 'Hide' : 'Show'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <TextInput
                            placeholder="••••••••"
                            placeholderTextColor={colors.textMuted}
                            value={auth.formData.password}
                            onChangeText={handlePasswordChange}
                            secureTextEntry={!showPassword}
                            editable={!isLoading}
                            style={{
                                borderWidth: 1,
                                borderColor:
                                    passwordError ? colors.error : colors.border,
                                borderRadius: 8,
                                paddingHorizontal: 12,
                                paddingVertical: 12,
                                fontSize: 14,
                                color: colors.textPrimary,
                                backgroundColor: colors.surface,
                            }}
                        />
                        {passwordError && (
                            <Text
                                style={{
                                    fontSize: 12,
                                    color: colors.error,
                                    marginTop: 6,
                                }}
                            >
                                {passwordError}
                            </Text>
                        )}
                    </View>

                    {/* Login Button */}
                    <TouchableOpacity
                        onPress={handleLogin}
                        disabled={!canSubmit}
                        activeOpacity={0.8}
                        style={{
                            height: 44,
                            backgroundColor: canSubmit
                                ? colors.primary
                                : colors.primary + '50',
                            borderRadius: 8,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            marginBottom: 16,
                        }}
                    >
                        {isLoading ? (
                            <ActivityIndicator size={20} color="white" />
                        ) : null}
                        <Text
                            style={{
                                fontSize: 16,
                                fontWeight: '600',
                                color: 'white',
                            }}
                        >
                            {isLoading ? 'Signing in...' : 'Sign In'}
                        </Text>
                    </TouchableOpacity>

                    {/* Links */}
                    <View
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 24,
                        }}
                    >
                        <TouchableOpacity
                            onPress={onSwitchToForgotPassword}
                            disabled={isLoading}
                        >
                            <Text
                                style={{
                                    fontSize: 14,
                                    color: colors.primary,
                                }}
                            >
                                Forgot password?
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={onSwitchToSignup}
                            disabled={isLoading}
                        >
                            <Text
                                style={{
                                    fontSize: 14,
                                    color: colors.primary,
                                }}
                            >
                                Create account
                            </Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
