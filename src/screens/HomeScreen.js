import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Header from '../components/Header';
import PrimaryButton from '../components/PrimaryButton';
import colors from '../constants/colors';
import { useProfile } from '../context/ProfileContext';

export default function HomeScreen({ navigate }) {
  const { profile, hasProfile, getDepartmentLabel } = useProfile();

  return (
    <View style={styles.container}>
      <Header title="Home" />
      
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeText}>
          {hasProfile ? `Welcome, ${profile.name}!` : 'Welcome!'}
        </Text>
        <Text style={styles.subtitleText}>
          {hasProfile 
            ? 'Your timetable is ready to view'
            : 'Set up your profile to view your personalized timetable'
          }
        </Text>
      </View>

      {/* Profile Card */}
      {hasProfile ? (
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <Text style={styles.profileTitle}>Your Profile</Text>
            <TouchableOpacity onPress={() => navigate('student')}>
              <Text style={styles.editLink}>Edit</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.profileDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Name:</Text>
              <Text style={styles.detailValue}>{profile.name}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Department:</Text>
              <View style={styles.deptBadge}>
                <Text style={styles.deptText}>{getDepartmentLabel()}</Text>
              </View>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Group:</Text>
              <View style={styles.groupBadge}>
                <Text style={styles.groupText}>{profile.group}</Text>
              </View>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.setupCard}>
          <Text style={styles.setupIcon}>📋</Text>
          <Text style={styles.setupTitle}>Profile Not Set</Text>
          <Text style={styles.setupText}>
            Please set up your profile with your department, year, section, and subgroup to access your personalized timetable.
          </Text>
          <PrimaryButton title="Set Up Profile" onPress={() => navigate('student')} />
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionSection}>
        {hasProfile && (
          <View style={styles.mainButton}>
            <PrimaryButton 
              title="View My Timetable" 
              onPress={() => navigate('results')} 
            />
          </View>
        )}
        
        <View style={styles.secondaryButtons}>
          <TouchableOpacity 
            style={styles.secondaryButton} 
            onPress={() => navigate('about')}
          >
            <Text style={styles.secondaryButtonText}>About</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f7fa'
  },
  welcomeSection: {
    marginTop: 20,
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 14,
    color: colors.muted,
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 24,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  profileTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  editLink: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  profileDetails: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: colors.muted,
    width: 100,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  deptBadge: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  deptText: {
    color: '#1565c0',
    fontWeight: '600',
    fontSize: 13,
  },
  groupBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  groupText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  setupCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 24,
  },
  setupIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  setupTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  setupText: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  actionSection: {
    marginTop: 'auto',
    paddingBottom: 20,
  },
  mainButton: {
    marginBottom: 16,
  },
  secondaryButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  secondaryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
});
