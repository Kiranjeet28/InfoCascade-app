import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Header from '../components/Header';

export default function AboutScreen() {
  return (
    <View style={styles.container}>
      <Header title="About" />
      <Text style={styles.text}>timeTableScrap — example app scaffold.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  text: { marginTop: 12, color: '#444' },
});
