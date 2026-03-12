import React from 'react';
import { MaterialCommunityIcons, Ionicons, FontAwesome } from '@expo/vector-icons';
import { useThemeColors } from '../context/theme-context';

type IconFamily = 'MaterialCommunityIcons' | 'Ionicons' | 'FontAwesome';

export default function AppIcon({
  family = 'MaterialCommunityIcons',
  name,
  size = 18,
  color,
}: {
  family?: IconFamily;
  name: string;
  size?: number;
  color?: string;
}) {
  const { colors } = useThemeColors();
  const iconColor = color ?? colors.textPrimary;

  if (family === 'Ionicons') return <Ionicons name={name as any} size={size} color={iconColor} />;
  if (family === 'FontAwesome') return <FontAwesome name={name as any} size={size} color={iconColor} />;
  return <MaterialCommunityIcons name={name as any} size={size} color={iconColor} />;
}
