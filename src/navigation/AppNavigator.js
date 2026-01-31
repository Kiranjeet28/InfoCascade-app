import React, { useState } from 'react';
import { View } from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import AboutScreen from '../screens/AboutScreen';
import ResultsScreen from '../screens/ResultsScreen';
import StudentForm from '../screens/StudentForm';

// Very small navigator - holds a route name and params and passes a `navigate` function.
export default function AppNavigator() {
  const [routeState, setRouteState] = useState({ name: 'home', params: {} });

  const navigate = (name, params = {}) => setRouteState({ name, params });

  const render = () => {
    if (routeState.name === 'about') return <AboutScreen navigate={navigate} />;
    if (routeState.name === 'student') return <StudentForm navigate={navigate} />;
    if (routeState.name === 'results') return <ResultsScreen route={routeState} navigate={navigate} />;
    return <HomeScreen navigate={navigate} />;
  };

  return (
    <View style={{ flex: 1 }}>
      {render()}
    </View>
  );
}
