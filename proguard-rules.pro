# ProGuard Rules for Android Optimization
# This file should be referenced in app.json buildProperties.proguardFiles
# Enables aggressive minification and code removal for non-essential code

# ── Optimization passes ────────────────────────────────────────────────────
-optimizationpasses 5
-verbose
-dontusemixedcaseclassnames
-allowaccessmodification
-mergeinterfacesaggressively

# ── Remove logging code from production ────────────────────────────────────
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
    public static *** isLoggable(...);
    public static *** println(...);
}

# ── Keep essential classes ─────────────────────────────────────────────────
# Native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Lifecycle and activity-related
-keepclasseswithmembernames class * {
    public <init>(android.content.Context, android.util.AttributeSet);
}

# R classes (resources)
-keepclassmembers class **.R$* {
    public static <fields>;
}

# ── React Native ───────────────────────────────────────────────────────────
-keep public class com.facebook.react.**
-keep public class com.facebook.react.bridge.** { *; }
-keep public class com.facebook.react.shell.** { *; }
-keep public class com.facebook.reactnative.** { *; }

# Hermes engine
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }

# ── Expo modules ───────────────────────────────────────────────────────────
-keep class expo.** { *; }
-keep class com.facebook.react.** { *; }

# ── Remove unused code ────────────────────────────────────────────────────
# Strip attributes
-stripattributes SourceFile,LineNumberTable,LocalVariableTable,LocalVariableTypeTable

# Remove unused classes and methods
-dontnote
-dontwarn

# ── Size optimization ────────────────────────────────────────────────────
# Inline simple methods
-allowaccessmodification

# Class merging
-mergeinterfacesaggressively

# ── Preserve Serializable classes ──────────────────────────────────────────
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# ── Annotations ────────────────────────────────────────────────────────────
-keepattributes *Annotation*,Signature,InnerClasses

# ── JavaScript Engine ────────────────────────────────────────────────────
# Ensure Hermes bytecode is properly compiled
-keep class com.facebook.hermes.** { *; }
