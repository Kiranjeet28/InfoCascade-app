import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import Header from '../components/Header';
import PrimaryButton from '../components/PrimaryButton';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Header title="Home" />
      <Text style={styles.text}>Welcome to timeTableScrap.</Text>
      <View style={styles.buttonWrap}>
        <PrimaryButton title="Say Hello" onPress={() => Alert.alert('Hi', 'This is the Home screen')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff'
  },
  text: {
    fontSize: 16,
    color: '#333',
    marginVertical: 12,
  },
  buttonWrap: {
    marginTop: 16,
    width: '60%'
  }
});
