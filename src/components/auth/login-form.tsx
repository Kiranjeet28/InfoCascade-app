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
import { useAuthEmailExists } from '../../hooks/use-auth-email-exists';
import * as authService from '../../services/auth-service';
import { isValidGNDECEmail } from '../../services/otp-service';


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
    const emailCheck = useAuthEmailExists(auth.formData.email, 400);

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
        auth.clearError();
    };

    const handlePasswordChange = (text: string) => {
        auth.setPassword(text);
        if (passwordError) setPasswordError('');
        auth.clearError();
    };

    /** When student DB says the email exists but auth login fails, avoid "sign up first" vs "account found". */
    const loginFailureMessage = (err: unknown, fallback: string): string => {
        let msg = authService.mapErrorToUserMessage(err, fallback);
        const lower = msg.toLowerCase();
        const looksLikeMissingUser =
            lower.includes('user not found') ||
            lower.includes('user does not exist') ||
            lower.includes('account not found');
        if (emailCheck.status === 'taken' && looksLikeMissingUser) {
            return 'Couldn\'t sign in with this email.Check your password, or finish registration if you haven\'t set one yet.';
        }
        return msg;
    };

    const handleLogin = async () => {
        try {
            // Validate email
            if (!auth.formData.email || auth.formData.email.trim().length === 0) {
                setEmailError('Email is required');
                triggerShake();
                return;
            }

            // Basic validation - let backend handle detailed checks
            if (!auth.formData.password || auth.formData.password.trim().length === 0) {
                setPasswordError('Password is required');
                triggerShake();
                return;
            }

            auth.clearError();
            setIsLoading(true);
            auth.setLoading(true);

            // Call login API with email and password
            const result = await authService.login(
                auth.formData.email,
                auth.formData.password
            );

            if (result.success && result.token && result.user) {
                auth.setAuthData(result.user, result.token);
                onLoginSuccess?.();
            } else if (result.code === 'OTP_VERIFICATION_REQUIRED') {
                auth.setError(
                    'Too many sign-in attempts. Wait a bit, then try again or use Forgot password.'
                );
                triggerShake();
            } else if (result.code === 'INVALID_PASSWORD') {
                // Wrong password - show attempts remaining
                const attemptsRemaining = result.attemptsRemaining || 0;

                let errorMsg = 'Invalid password. Please try again.';
                if (attemptsRemaining > 0) {
                    errorMsg += ` You have ${attemptsRemaining} attempt(s) remaining.`;
                }

                if (result.attemptsRemaining !== undefined) {
                    auth.recordFailedAttempt(result.attemptsRemaining);
                } else {
                    auth.recordFailedAttempt(auth.attemptsRemaining - 1);
                }

                auth.setError(errorMsg);
                triggerShake();
            } else if (result.code === 'USER_NOT_FOUND') {
                const error = emailCheck.status !== 'taken'
                    ? 'Email not found. Please sign up first.'
                    : 'Account issue. Please try again or reset password.';

                auth.setError(error);
                triggerShake();
            } else {
                // Other error
                const error = authService.mapErrorToUserMessage(
                    result.code || 'LOGIN_FAILED',
                    result.message || 'Login failed'
                );
                auth.setError(error);
                triggerShake();
            }
        } catch (err) {
            const errorMsg = loginFailureMessage(
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
        auth.formData.email.trim().length > 0 &&
        auth.formData.password.trim().length > 0 &&
        isValidGNDECEmail(auth.formData.email) &&
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
                            Sign in with your Gmail and password
                        </Text>
                    </View>

                    {/* Error Message */}
                    {auth.error ? (
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
                    ) : null}

                    {/* Attempt Counter */}
                    {auth.attemptsRemaining > 0 ? (
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
                    ) : null}

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
                            placeholder="yourname@gmail.com"
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
                                    emailError || emailCheck.status === 'error' || emailCheck.status === 'available'
                                        ? colors.error
                                        : emailCheck.status === 'taken'
                                            ? colors.accent
                                            : colors.border,
                                borderRadius: 8,
                                paddingHorizontal: 12,
                                paddingVertical: 12,
                                fontSize: 14,
                                color: colors.textPrimary,
                                backgroundColor: colors.surface,
                            }}
                        />
                        {emailError ? (
                            <Text
                                style={{
                                    fontSize: 12,
                                    color: colors.error,
                                    marginTop: 6,
                                }}
                            >
                                {emailError}
                            </Text>
                        ) : null}
                        {!emailError && emailCheck.message ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                                {emailCheck.isChecking ? (
                                    <ActivityIndicator size={14} color={colors.primary} />
                                ) : null}
                                <Text
                                    style={{
                                        fontSize: 12,
                                        color:
                                            emailCheck.status === 'taken'
                                                ? colors.accent
                                                : emailCheck.status === 'error'
                                                    ? colors.error
                                                    : colors.textSecondary,
                                        marginLeft: emailCheck.isChecking ? 6 : 0,
                                    }}
                                >
                                    {emailCheck.message}
                                </Text>
                            </View>
                        ) : null}
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
                                onPress={() => setShowPassword(!showPassword)}
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
                            editable={!isLoading && !emailCheck.isChecking}
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
                        {passwordError ? (
                            <Text
                                style={{
                                    fontSize: 12,
                                    color: colors.error,
                                    marginTop: 6,
                                }}
                            >
                                {passwordError}
                            </Text>
                        ) : null}
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