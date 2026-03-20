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
import { getOtpError, isValidOtp } from '../../utils/validators';

export interface OTPVerificationProps {
    onVerifySuccess?: () => void;
    onBackToLogin?: () => void;
}

const OTP_RESEND_COOLDOWN_SEC = 30;

export default function OTPVerification({
    onVerifySuccess,
    onBackToLogin,
}: OTPVerificationProps) {
    const { colors } = useThemeColors();
    const auth = useAuth();

    const [isVerifying, setIsVerifying] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [formError, setFormError] = useState<string>('');

    const otpInputRef = useRef<TextInput>(null);
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const successAnim = useRef(new Animated.Value(0)).current;

    // Auto-focus on mount
    useEffect(() => {
        setTimeout(() => {
            otpInputRef.current?.focus();
        }, 100);
    }, []);

    // Shake animation for errors
    const triggerShake = () => {
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();
    };

    // Success animation
    const triggerSuccess = () => {
        Animated.timing(successAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
        }).start();
    };

    const handleVerifyOtp = async () => {
        const error = getOtpError(auth.formData.otp);
        if (error) {
            setFormError(error);
            triggerShake();
            return;
        }

        setFormError('');
        setIsVerifying(true);
        auth.setLoading(true);

        try {
            const result = await authService.verifyOtp(auth.formData.email, auth.formData.otp);

            if (result.success && result.token && result.user) {
                // Show success message
                triggerSuccess();
                setShowSuccess(true);

                // Save auth data
                await auth.setAuthData(result.user, result.token);

                // Redirect after 1 second
                setTimeout(() => {
                    onVerifySuccess?.();
                }, 1000);
            } else if (result.code === 'INVALID_OTP') {
                setFormError('Invalid or expired OTP. Please try again.');
                auth.setOtp('');
                triggerShake();
            } else {
                setFormError(result.message || 'Verification failed. Please try again.');
                triggerShake();
            }
        } catch (err) {
            const errorMsg = authService.mapErrorToUserMessage(err, 'Verification failed. Please try again.');
            setFormError(errorMsg);
            triggerShake();
        } finally {
            setIsVerifying(false);
            auth.setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        setIsResending(true);
        setFormError('');

        try {
            await authService.sendOtp(auth.formData.email);
            auth.setOtpResendCountdown(OTP_RESEND_COOLDOWN_SEC);
            auth.setOtp('');
            otpInputRef.current?.focus();
        } catch (err) {
            const errorMsg = authService.mapErrorToUserMessage(err, 'Failed to resend OTP.');
            setFormError(errorMsg);
        } finally {
            setIsResending(false);
        }
    };

    const handleBack = () => {
        auth.backToLoginPage();
        onBackToLogin?.();
    };

    const isResendDisabled = auth.otpResendCountdown > 0 || isResending || isVerifying;
    const canVerify = isValidOtp(auth.formData.otp);

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
        >
            <ScrollView
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20 }}
                showsVerticalScrollIndicator={false}
            >
                <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
                    {/* Back Button */}
                    <TouchableOpacity
                        onPress={handleBack}
                        disabled={isVerifying}
                        activeOpacity={0.7}
                        style={{ marginBottom: 24 }}
                    >
                        <Text style={{ fontSize: 16, color: colors.primary }}>
                            ← Back to login
                        </Text>
                    </TouchableOpacity>

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
                            Verify with OTP
                        </Text>
                        <Text style={{ fontSize: 14, color: colors.textMuted }}>
                            We sent a 6-digit code to{'\n'}
                            <Text style={{ fontWeight: '600', color: colors.textPrimary }}>
                                {auth.formData.email}
                            </Text>
                        </Text>
                    </View>

                    {/* Success Message */}
                    {showSuccess && (
                        <Animated.View
                            style={{
                                backgroundColor: colors.success + '20',
                                borderLeftWidth: 4,
                                borderLeftColor: colors.success,
                                paddingVertical: 12,
                                paddingHorizontal: 12,
                                borderRadius: 8,
                                marginBottom: 16,
                                opacity: successAnim,
                            }}
                        >
                            <Text style={{ fontSize: 14, color: colors.success }}>
                                ✓ OTP verified successfully! Redirecting...
                            </Text>
                        </Animated.View>
                    )}

                    {/* Error Message */}
                    {formError && (
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
                            <Text style={{ fontSize: 14, color: colors.error }}>
                                {formError}
                            </Text>
                        </View>
                    )}

                    {/* OTP Input */}
                    <View style={{ marginBottom: 24 }}>
                        <Text
                            style={{
                                fontSize: 14,
                                fontWeight: '600',
                                color: colors.textPrimary,
                                marginBottom: 12,
                            }}
                        >
                            Enter OTP Code
                        </Text>

                        <TouchableOpacity
                            activeOpacity={1}
                            onPress={() => otpInputRef.current?.focus()}
                            style={{
                                flexDirection: 'row',
                                justifyContent: 'center',
                                gap: 8,
                                marginBottom: 8,
                            }}
                        >
                            {Array.from({ length: 6 }).map((_, i) => (
                                <View
                                    key={i}
                                    style={{
                                        width: 44,
                                        height: 52,
                                        borderRadius: 12,
                                        backgroundColor: colors.surface,
                                        borderWidth: 2,
                                        borderColor: auth.formData.otp[i]
                                            ? colors.primary
                                            : colors.border,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: 22,
                                            fontWeight: '700',
                                            color: colors.textPrimary,
                                        }}
                                    >
                                        {auth.formData.otp[i] || ''}
                                    </Text>
                                </View>
                            ))}
                        </TouchableOpacity>

                        <TextInput
                            ref={otpInputRef}
                            placeholder="0 0 0 0 0 0"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="number-pad"
                            maxLength={6}
                            autoFocus
                            editable={!isVerifying && !showSuccess}
                            value={auth.formData.otp}
                            onChangeText={(text) => {
                                const otp = text.replace(/[^0-9]/g, '').slice(0, 6);
                                auth.setOtp(otp);
                                if (formError) setFormError('');
                            }}
                            style={{
                                position: 'absolute',
                                opacity: 0,
                                height: 1,
                            }}
                        />
                    </View>

                    {/* Verify Button */}
                    <TouchableOpacity
                        onPress={handleVerifyOtp}
                        disabled={!canVerify || isVerifying || showSuccess}
                        activeOpacity={0.8}
                        style={{
                            height: 44,
                            backgroundColor: !canVerify || isVerifying || showSuccess
                                ? colors.primary + '50'
                                : colors.primary,
                            borderRadius: 8,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            marginBottom: 16,
                        }}
                    >
                        {isVerifying ? (
                            <ActivityIndicator size={20} color="white" />
                        ) : null}
                        <Text
                            style={{
                                fontSize: 16,
                                fontWeight: '600',
                                color: 'white',
                            }}
                        >
                            {isVerifying ? 'Verifying...' : 'Verify OTP'}
                        </Text>
                    </TouchableOpacity>

                    {/* Resend OTP */}
                    <View style={{ alignItems: 'center', marginTop: 16 }}>
                        <Text style={{ fontSize: 14, color: colors.textMuted, marginBottom: 12 }}>
                            Didn&apos;t receive the code?
                        </Text>
                        {auth.otpResendCountdown > 0 ? (
                            <Text style={{ fontSize: 14, color: colors.warning, fontWeight: '600' }}>
                                Resend in {auth.otpResendCountdown}s
                            </Text>
                        ) : (
                            <TouchableOpacity
                                onPress={handleResendOtp}
                                disabled={isResendDisabled}
                                activeOpacity={0.7}
                            >
                                <Text
                                    style={{
                                        fontSize: 14,
                                        color: isResendDisabled ? colors.textMuted : colors.primary,
                                        fontWeight: '600',
                                    }}
                                >
                                    {isResending ? 'Sending...' : 'Resend OTP'}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </Animated.View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
