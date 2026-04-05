import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import api from "../config/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { height } = Dimensions.get("window");

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);

  const router = useRouter();
  const buttonScale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 2,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 6,
    }).start();
  };

  // ✅ UPDATED: MongoDB register
  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert("Missing Fields", "Please fill in all fields.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Password Mismatch", "Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Weak Password", "Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        name,
        email,
        password,
        role: 'user',
      });
      await AsyncStorage.setItem('token', res.data.token || '');
      await AsyncStorage.setItem('user', JSON.stringify(res.data.user || {}));
      Alert.alert("Welcome!", "Your account has been created.");
      router.push("/login");
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      Alert.alert("Registration Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Compact Hero ── */}
        <View style={styles.hero}>
          <View style={styles.dotTL} />
          <View style={styles.dotBR} />

          <Text style={styles.emojiTL}>🧶</Text>
          <Text style={styles.emojiTR}>🎀</Text>
          <Text style={styles.emojiBR}>🌺</Text>

          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>🛍️</Text>
          </View>

          <Text style={styles.heroTitle}>Join Pasalubong</Text>
          <Text style={styles.heroTagline}>Discover authentic Filipino crafts</Text>
        </View>

        {/* ── Form Card ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create account</Text>
          <Text style={styles.cardSubtitle}>Be a member and support your local goods</Text>

          {/* Full Name */}
          <View style={[styles.inputWrapper, nameFocused && styles.inputWrapperFocused]}>
            <Ionicons
              name="person-outline"
              size={18}
              color={nameFocused ? "#5C4033" : "#B0927E"}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Full name"
              placeholderTextColor="#C4A898"
              value={name}
              onChangeText={setName}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
            />
          </View>

          {/* Email */}
          <View style={[styles.inputWrapper, emailFocused && styles.inputWrapperFocused]}>
            <Ionicons
              name="mail-outline"
              size={18}
              color={emailFocused ? "#5C4033" : "#B0927E"}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor="#C4A898"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
            />
          </View>

          {/* Password */}
          <View style={[styles.inputWrapper, passwordFocused && styles.inputWrapperFocused]}>
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color={passwordFocused ? "#5C4033" : "#B0927E"}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#C4A898"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={18}
                color="#B0927E"
              />
            </TouchableOpacity>
          </View>

          {/* Confirm Password */}
          <View style={[styles.inputWrapper, confirmFocused && styles.inputWrapperFocused]}>
            <Ionicons
              name="shield-checkmark-outline"
              size={18}
              color={confirmFocused ? "#5C4033" : "#B0927E"}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm password"
              placeholderTextColor="#C4A898"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirm}
              onFocus={() => setConfirmFocused(true)}
              onBlur={() => setConfirmFocused(false)}
            />
            <TouchableOpacity
              onPress={() => setShowConfirm(!showConfirm)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={showConfirm ? "eye-off-outline" : "eye-outline"}
                size={18}
                color="#B0927E"
              />
            </TouchableOpacity>
          </View>

          {/* Register Button */}
          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity
              style={[styles.registerBtn, loading && styles.registerBtnLoading]}
              onPress={handleRegister}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              activeOpacity={1}
              disabled={loading}
            >
              <Text style={styles.registerBtnText}>
                {loading ? "Creating account..." : "Create Account"}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Back to login */}
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => router.push("/login")}
            activeOpacity={0.8}
          >
            <Text style={styles.loginBtnText}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#3D2314",
  },
  hero: {
    height: height * 0.33,
    backgroundColor: "#3D2314",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  dotTL: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(245,200,122,0.1)",
    top: -40,
    left: -30,
  },
  dotBR: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(245,200,122,0.07)",
    bottom: -60,
    right: -40,
  },
  emojiTL: { position: "absolute", top: 52, left: 32, fontSize: 20, opacity: 0.5 },
  emojiTR: { position: "absolute", top: 48, right: 28, fontSize: 20, opacity: 0.5 },
  emojiBR: { position: "absolute", bottom: 36, right: 36, fontSize: 18, opacity: 0.4 },
  logoCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(245,200,122,0.18)",
    borderWidth: 1.5,
    borderColor: "rgba(245,200,122,0.35)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  logoEmoji: { fontSize: 28 },
  heroTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#F5C87A",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  heroTagline: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    fontWeight: "500",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  card: {
    flex: 1,
    backgroundColor: "#FDF8F5",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 40,
    marginTop: -24,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#2C1810",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#9C7B6B",
    marginBottom: 24,
    fontWeight: "500",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#F0E6E0",
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 12,
  },
  inputWrapperFocused: {
    borderColor: "#5C4033",
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#2C1810",
    paddingVertical: 0,
  },
  registerBtn: {
    backgroundColor: "#3D2314",
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
    shadowColor: "#3D2314",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  registerBtnLoading: { opacity: 0.7 },
  registerBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#F0E6E0",
  },
  dividerText: {
    fontSize: 13,
    color: "#B0927E",
    fontWeight: "500",
  },
  loginBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#D4B8AE",
    backgroundColor: "#fff",
  },
  loginBtnText: {
    color: "#5C4033",
    fontSize: 15,
    fontWeight: "700",
  },
  footerNote: {
    textAlign: "center",
    color: "#C4A898",
    fontSize: 12,
    marginTop: 22,
    fontWeight: "500",
  },
});