import React, { useState } from 'react';
import { View } from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import AboutScreen from '../screens/AboutScreen';

// Minimal navigator: toggles between Home and About without external deps.
export default function AppNavigator() {
  const [route, setRoute] = useState('home');

  const render = () => {
    if (route === 'about') return <AboutScreen />;
    return <HomeScreen />;
  };

  return (
    <View style={{ flex: 1 }}>
      {render()}
    </View>
  );
}
