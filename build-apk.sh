#!/bin/bash
# APK Build & Export Commands
# Copy and run these commands in terminal

# ═══════════════════════════════════════════════════════════════════════
# QUICK START: Build APK in 1 Command
# ═══════════════════════════════════════════════════════════════════════

# Build and wait for completion
eas build --platform android --profile production --wait


# ═══════════════════════════════════════════════════════════════════════
# DETAILED COMMANDS
# ═══════════════════════════════════════════════════════════════════════

# 1. LOGIN TO EXPO (First time only)
eas login

# 2. BUILD PRODUCTION APK
eas build --platform android --profile production --wait

# 3. BUILD PREVIEW APK (for testing)
eas build --platform android --profile preview --wait

# 4. CHECK BUILDS
eas build:list --platform android

# 5. VIEW SPECIFIC BUILD
eas build:view <BUILD_ID>

# 6. DOWNLOAD APK (after build complete)
# Link provided automatically, or visit https://expo.dev/


# ═══════════════════════════════════════════════════════════════════════
# ADVANCED: BUILD WITH SPECIFIC API URL
# ═══════════════════════════════════════════════════════════════════════

# Production APK with remote API
EXPO_PUBLIC_API_URL=https://infocascade-backend.onrender.com \
eas build --platform android --profile production --wait

# Development APK with local API
EXPO_PUBLIC_API_URL=http://192.168.1.100:5000 \
eas build --platform android --profile preview --wait


# ═══════════════════════════════════════════════════════════════════════
# INSTALL & TEST
# ═══════════════════════════════════════════════════════════════════════

# Install APK on connected device
adb install ~/Downloads/Infocascade-production.apk

# Uninstall old version first
adb uninstall com.kiranjeet28.Infocascade
adb install ~/Downloads/Infocascade-production.apk


# ═══════════════════════════════════════════════════════════════════════
# EXPORT WEB + BUILD APK
# ═══════════════════════════════════════════════════════════════════════

# Export web for Vercel
expo export --platform web

# Build APK
eas build --platform android --profile production --wait


# ═══════════════════════════════════════════════════════════════════════
# SHARING & DISTRIBUTION
# ═══════════════════════════════════════════════════════════════════════

# Build provides shareable download link automatically
# Share the link from EAS dashboard or terminal output
# Users can install directly from link


# ═══════════════════════════════════════════════════════════════════════
# TROUBLESHOOTING
# ═══════════════════════════════════════════════════════════════════════

# Clear cache and rebuild
eas build --platform android --clear-cache --profile production

# View build logs
eas build:view <BUILD_ID>

# Install dependencies
npm install

# Check configuration
cat app.json | grep -A 10 '"android"'
