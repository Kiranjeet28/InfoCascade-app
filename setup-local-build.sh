#!/bin/bash
# Local APK Build Complete Setup Script
# Run this after Android SDK is installed

set -e

echo "🔧 Setting up local APK build..."

# Step 1: Source environment
echo "✅ Step 1: Loading environment variables..."
source ~/.bashrc

# Step 2: Verify SDK download
echo "✅ Step 2: Checking SDK installation..."
if [ -f ~/Android/cmdline-tools/commandlinetools-linux-*_latest.zip ]; then
    echo "   Extracting SDK tools..."
    cd ~/Android/cmdline-tools
    unzip -q commandlinetools-linux-*_latest.zip
    if [ -d cmdline-tools ]; then
        mv cmdline-tools latest
    fi
    rm -f commandlinetools-linux-*_latest.zip*
fi

# Step 3: Accept licenses
echo "✅ Step 3: Accepting Android licenses..."
yes | sdkmanager --licenses 2>/dev/null || true

# Step 4: Install SDK components
echo "✅ Step 4: Installing Android SDK components..."
echo "   This may take 10-20 minutes..."

sdkmanager --install "platform-tools" &
sdkmanager --install "platforms;android-34" &
sdkmanager --install "build-tools;34.0.0" &
sdkmanager --install "ndk;26.0.10792818" &

wait

echo "✅ SDK installation complete!"

# Step 5: Verify installation
echo "✅ Step 5: Verifying installation..."
sdkmanager --list_installed 2>/dev/null | head -10

# Step 6: Build APK
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Setup Complete! Ready to build APK"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "To build your APK, run:"
echo ""
echo "  cd /home/kiranjeet-kour/Desktop/Projects/my-app"
echo "  eas build --platform android --profile production --local"
echo ""
echo "Build will take 5-15 minutes..."
echo ""
