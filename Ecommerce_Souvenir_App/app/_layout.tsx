import { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Stack, useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../config/firebase";
import { CartProvider } from "../context/CartContext";
import { FavoritesProvider } from "../context/FavoritesContext";

export default function RootLayout() {
  const router = useRouter();
  const [authResolved, setAuthResolved] = useState(false);

  useEffect(() => {
    // Always use onAuthStateChanged — don't trust auth.currentUser synchronously
    // because AsyncStorage (persistence) loads async
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace("/(tabs)/home" as any);
      } else {
        router.replace("/login" as any);
      }
      setAuthResolved(true);
    });
    return unsubscribe;
  }, [router]);

  return (
    <FavoritesProvider>
      <CartProvider>
        {/* Stack is ALWAYS mounted so router.replace() has a navigator to work with */}
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
          <Stack.Screen name="checkout" options={{ headerShown: false }} />
          <Stack.Screen name="product/[id]" options={{ headerShown: false }} />
        </Stack>

        {/* Splash sits on TOP as an overlay until auth is resolved */}
        {!authResolved && (
          <View style={[StyleSheet.absoluteFill, styles.splash]}>
            <ActivityIndicator size="large" color="#F5C87A" />
          </View>
        )}
      </CartProvider>
    </FavoritesProvider>
  );
  
}
const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: "#3D2314",
    justifyContent: "center",
    alignItems: "center",
  },
});