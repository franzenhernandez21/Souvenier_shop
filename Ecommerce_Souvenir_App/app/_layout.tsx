import { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Stack, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CartProvider } from "../context/CartContext";
import { FavoritesProvider } from "../context/FavoritesContext";

export default function RootLayout() {
  const router = useRouter();
  const [authResolved, setAuthResolved] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          router.replace("/(tabs)/home" as any);
        } else {
          router.replace("/login" as any);
        }
      } catch (err) {
        router.replace("/login" as any);
      } finally {
        setAuthResolved(true);
      }
    };
    checkAuth();
  }, []);

  return (
    <FavoritesProvider>
      <CartProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
          <Stack.Screen name="checkout" options={{ headerShown: false }} />
          <Stack.Screen name="product/[id]" options={{ headerShown: false }} />
        </Stack>

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