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
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../config/firebase";
import { useRouter } from "expo-router";

const { height } = Dimensions.get("window");

function Dot({ style }: { style: any }) {
  return <View style={[styles.dot, style]} />;
}

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
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

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing Fields", "Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace("/(tabs)/home");
    } catch (error: any) {
      const code = error.code;
      let message = "Something went wrong. Please try again.";

      if (
        code === "auth/user-not-found" ||
        code === "auth/wrong-password" ||
        code === "auth/invalid-credential" ||
        code === "auth/invalid-email"
      ) {
        message = "Invalid email or password. Please try again.";
      } else if (code === "auth/too-many-requests") {
        message = "Too many failed attempts. Please try again later.";
      } else if (code === "auth/network-request-failed") {
        message = "No internet connection. Please check your network.";
      }

      Alert.alert("Login Failed", message);
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
        {/* ── Hero Section ───────────────────────────────────────────── */}
        <View style={styles.hero}>
          <Dot style={styles.dotTL} />
          <Dot style={styles.dotTR} />
          <Dot style={styles.dotBL} />
          <Dot style={styles.dotBR} />
          <Dot style={styles.dotCenter} />

          <View style={styles.weaveRow1} />
          <View style={styles.weaveRow2} />

          <Text style={styles.emojiTL}>🎁</Text>
          <Text style={styles.emojiTR}>🧵</Text>
          <Text style={styles.emojiBL}>🪡</Text>
          <Text style={styles.emojiBR}>🎨</Text>

          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>🛍️</Text>
          </View>

          <Text style={styles.heroTitle}>Pasalubong</Text>
          <Text style={styles.heroTagline}>Authentic Filipino Souvenirs</Text>
        </View>

        {/* ── Form Card ──────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome</Text>
          <Text style={styles.cardSubtitle}>
            Discover authentic Filipino crafts & souvenirs
          </Text>

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

          {/* Login Button */}
          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.loginBtnLoading]}
              onPress={handleLogin}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              activeOpacity={1}
              disabled={loading}
            >
              <Text style={styles.loginBtnText}>
                {loading ? "Signing in..." : "Sign In"}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Register link */}
          <TouchableOpacity
            style={styles.registerBtn}
            onPress={() => router.push("/register")}
            activeOpacity={0.8}
          >
            <Text style={styles.registerBtnText}>Create an account</Text>
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
    height: height * 0.42,
    backgroundColor: "#3D2314",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },

  weaveRow1: {
    position: "absolute",
    top: 30,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "rgba(245,200,122,0.15)",
  },
  weaveRow2: {
    position: "absolute",
    top: 38,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(245,200,122,0.08)",
  },

  dot: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(245,200,122,0.1)",
  },
  dotTL: { width: 120, height: 120, top: -40, left: -40 },
  dotTR: { width: 80, height: 80, top: -20, right: -20 },
  dotBL: { width: 60, height: 60, bottom: 20, left: 20 },
  dotBR: { width: 140, height: 140, bottom: -60, right: -40 },
  dotCenter: {
    width: 200,
    height: 200,
    top: "50%",
    left: "50%",
    marginTop: -100,
    marginLeft: -100,
    backgroundColor: "rgba(255,255,255,0.03)",
  },

  emojiTL: { position: "absolute", top: 48, left: 28, fontSize: 22, opacity: 0.6 },
  emojiTR: { position: "absolute", top: 52, right: 32, fontSize: 20, opacity: 0.5 },
  emojiBL: { position: "absolute", bottom: 44, left: 36, fontSize: 18, opacity: 0.45 },
  emojiBR: { position: "absolute", bottom: 48, right: 28, fontSize: 20, opacity: 0.5 },

  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(245,200,122,0.18)",
    borderWidth: 1.5,
    borderColor: "rgba(245,200,122,0.35)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  logoEmoji: { fontSize: 34 },

  heroTitle: {
    fontSize: 34,
    fontWeight: "800",
    color: "#F5C87A",
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  heroTagline: {
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    fontWeight: "500",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },

  card: {
    flex: 1,
    backgroundColor: "#FDF8F5",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 40,
    marginTop: -24,
  },

  cardTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#2C1810",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#9C7B6B",
    marginBottom: 28,
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
    marginBottom: 14,
  },
  inputWrapperFocused: {
    borderColor: "#5C4033",
    backgroundColor: "#fff",
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#2C1810",
    paddingVertical: 0,
  },

  loginBtn: {
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
  loginBtnLoading: { opacity: 0.7 },
  loginBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 22,
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

  registerBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#D4B8AE",
    backgroundColor: "#fff",
  },
  registerBtnText: {
    color: "#5C4033",
    fontSize: 15,
    fontWeight: "700",
  },

  footerNote: {
    textAlign: "center",
    color: "#C4A898",
    fontSize: 12,
    marginTop: 24,
    fontWeight: "500",
  },
});