import { useTheme } from '@react-navigation/native';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

interface ErrorBoundaryProps {
    children: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Component
 * Catches React errors in component tree and displays fallback UI
 * Prevents white screen of death
 */
class ErrorBoundaryComponent extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error) {
        console.error('[ErrorBoundary] Error caught:', error);
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
        this.setState({
            error,
            errorInfo,
        });
    }

    render() {
        if (this.state.hasError) {
            const fallbackColors = {
                bg: '#FFFFFF',
                text: '#000000',
                error: '#FF6B6B',
                primary: '#6C63FF',
            };

            return (
                <ErrorFallback
                    error={this.state.error}
                    errorInfo={this.state.errorInfo}
                    onReset={() => {
                        this.setState({
                            hasError: false,
                            error: null,
                            errorInfo: null,
                        });
                    }}
                    colors={fallbackColors}
                />
            );
        }

        return this.props.children;
    }
}

// ...existing code...
interface ErrorFallbackProps {
    error: Error | null;
    errorInfo: ErrorInfo | null;
    onReset: () => void;
    colors: {
        bg: string;
        text: string;
        error?: string;
        primary: string;
    };
}

function ErrorFallback({ error, errorInfo, onReset, colors }: ErrorFallbackProps) {
    return (
        <View
            style={{
                flex: 1,
                backgroundColor: colors.bg,
                justifyContent: 'center',
                alignItems: 'center',
                padding: 20,
            }}
        >
            <ScrollView
                style={{ flex: 1, width: '100%' }}
                contentContainerStyle={{
                    flexGrow: 1,
                    justifyContent: 'center',
                }}
            >
                <View style={{ alignItems: 'center' }}>
                    <Text
                        style={{
                            fontSize: 24,
                            fontWeight: 'bold',
                            color: colors.error ?? '#FF6B6B',
                            marginBottom: 16,
                            textAlign: 'center',
                        }}
                    >
                        ⚠️ Something Went Wrong
                    </Text>

                    <Text
                        style={{
                            fontSize: 14,
                            color: colors.text,
                            marginBottom: 12,
                            textAlign: 'center',
                            opacity: 0.7,
                        }}
                    >
                        We encountered an unexpected error. Please try again.
                    </Text>

                    {error && (
                        <View
                            style={{
                                backgroundColor: 'rgba(255, 107, 107, 0.1)',
                                borderRadius: 8,
                                padding: 12,
                                marginBottom: 16,
                                width: '100%',
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 12,
                                    color: colors.error ?? '#FF6B6B',
                                    fontFamily: 'monospace',
                                    marginBottom: 8,
                                    fontWeight: '600',
                                }}
                            >
                                Error:
                            </Text>
                            <Text
                                style={{
                                    fontSize: 12,
                                    color: colors.text,
                                    fontFamily: 'monospace',
                                }}
                                numberOfLines={5}
                            >
                                {error.toString()}
                            </Text>
                        </View>
                    )}

                    {errorInfo && (
                        <View
                            style={{
                                backgroundColor: 'rgba(200, 200, 200, 0.1)',
                                borderRadius: 8,
                                padding: 12,
                                marginBottom: 16,
                                width: '100%',
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 12,
                                    color: colors.text,
                                    fontFamily: 'monospace',
                                    marginBottom: 8,
                                    fontWeight: '600',
                                }}
                            >
                                Component Stack:
                            </Text>
                            <Text
                                style={{
                                    fontSize: 11,
                                    color: colors.text,
                                    fontFamily: 'monospace',
                                    opacity: 0.8,
                                }}
                                numberOfLines={10}
                            >
                                {errorInfo.componentStack}
                            </Text>
                        </View>
                    )}
                </View>

                <TouchableOpacity
                    onPress={onReset}
                    style={{
                        backgroundColor: colors.primary,
                        paddingVertical: 12,
                        paddingHorizontal: 24,
                        borderRadius: 8,
                        alignItems: 'center',
                        marginTop: 16,
                    }}
                >
                    <Text
                        style={{
                            color: '#FFFFFF',
                            fontSize: 14,
                            fontWeight: '600',
                        }}
                    >
                        Try Again
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

export function ErrorBoundary({ children }: ErrorBoundaryProps) {
    return <ErrorBoundaryComponent>{children}</ErrorBoundaryComponent>;
}
