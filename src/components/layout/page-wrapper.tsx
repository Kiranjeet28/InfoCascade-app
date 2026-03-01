import React from 'react';
import { ScrollView, View, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '../../context/theme-context';
import BgBlobs from './bg-blobs';

interface PageWrapperProps {
    children: React.ReactNode;
    scroll?: boolean;
    keyboard?: boolean;
    paddingTop?: number;
}

export default function PageWrapper({
    children,
    scroll = true,
    keyboard = false,
    paddingTop = 56,
}: PageWrapperProps) {
    const { colors } = useThemeColors();

    const inner = (
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
            <BgBlobs />
            {children}
        </View>
    );

    const wrapped = scroll ? (
        <ScrollView
            style={{ flex: 1, backgroundColor: colors.bg }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
        >
            {inner}
        </ScrollView>
    ) : inner;

    const withKeyboard = keyboard ? (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            {wrapped}
        </KeyboardAvoidingView>
    ) : wrapped;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
            {withKeyboard}
        </SafeAreaView>
    );
}