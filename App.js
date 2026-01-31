import React, { useState } from 'react';
import { StyleSheet, Text, View, Button } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  const [showApp, setShowApp] = useState(false);

  if (showApp) return <AppNavigator />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>timeTableScrap</Text>
      <Text style={styles.subtitle}>A minimal Expo React Native app</Text>
      <View style={styles.button}>
        <Button title="Tap me" onPress={() => setShowApp(true)} />
      </View>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    width: '60%'
  }
});
