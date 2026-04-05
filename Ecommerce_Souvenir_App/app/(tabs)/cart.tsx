import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCart } from "../../context/CartContext";
import { router } from "expo-router";

// ✅ Helper para safe ang price parsing
const parsePrice = (price: string | number): number => {
  if (typeof price === "number") return price;
  return parseInt(String(price).replace("₱", "").replace(",", "")) || 0;
};

// ✅ Helper para consistent ang ID
const getItemId = (item: any): string => item._id || item.id || item.name || Math.random().toString();

export default function CartScreen() {
  const { cartItems, removeFromCart, updateQuantity } = useCart();

  const totalPrice = cartItems.reduce((sum, item) => {
    return sum + parsePrice(item.price) * item.quantity;
  }, 0);

  const handleRemove = (id: string, name: string) => {
    Alert.alert(
      "Remove Item",
      `Remove ${name} from cart?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: () => removeFromCart(id) },
      ]
    );
  };

  if (cartItems.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="cart-outline" size={100} color="#D4B8A8" />
        <Text style={styles.emptyTitle}>Your Cart is Empty</Text>
        <Text style={styles.emptySubtitle}>
          Add some products to your cart first!
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Cart</Text>
      </View>

      {/* Cart Items */}
      <ScrollView showsVerticalScrollIndicator={false} style={styles.cartList}>
        {cartItems.map((item) => {
          const itemId = getItemId(item); // ✅ FIXED: safe ID
          return (
            <View key={itemId} style={styles.cartItem}> {/* ✅ FIXED: key */}
              <Image source={{ uri: item.image }} style={styles.itemImage} />
              <View style={styles.itemDetails}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.name}
                </Text>

                {/* Quantity Controls */}
                <View style={styles.quantityRow}>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => updateQuantity(itemId, item.quantity - 1)}
                  >
                    <Ionicons name="remove" size={16} color="#5C4033" />
                  </TouchableOpacity>
                  <Text style={styles.quantityText}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => updateQuantity(itemId, item.quantity + 1)}
                  >
                    <Ionicons name="add" size={16} color="#5C4033" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Subtotal and Remove */}
              <View style={styles.itemRight}>
                <TouchableOpacity onPress={() => handleRemove(itemId, item.name)}>
                  <Ionicons name="trash-outline" size={20} color="#E53935" />
                </TouchableOpacity>
                <Text style={styles.subtotal}>
                  ₱{(parsePrice(item.price) * item.quantity).toLocaleString()}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Order Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>₱{totalPrice.toLocaleString()}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Shipping</Text>
          <Text style={styles.summaryValue}>₱30</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>₱{(totalPrice + 30).toLocaleString()}</Text>
        </View>
        <TouchableOpacity
          style={styles.checkoutButton}
          onPress={() => router.push("/checkout")}
        >
          <Text style={styles.checkoutButtonText}>Checkout</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FDF6F0" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FDF6F0", padding: 40 },
  emptyTitle: { fontSize: 22, fontWeight: "bold", color: "#5C4033", marginTop: 20, marginBottom: 10 },
  emptySubtitle: { fontSize: 14, color: "#999", textAlign: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 55, paddingBottom: 15 },
  headerTitle: { fontSize: 26, fontWeight: "bold", color: "#5C4033" },
  cartList: { flex: 1, paddingHorizontal: 20 },
  cartItem: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 16, padding: 12, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3, alignItems: "center" },
  itemImage: { width: 80, height: 80, borderRadius: 12, resizeMode: "cover" },
  itemDetails: { flex: 1, paddingHorizontal: 12, justifyContent: "center", gap: 10 },
  itemName: { fontSize: 15, fontWeight: "600", color: "#333" },
  quantityRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  quantityButton: { backgroundColor: "#F5EDE8", borderRadius: 8, padding: 4, width: 28, height: 28, justifyContent: "center", alignItems: "center" },
  quantityText: { fontSize: 15, fontWeight: "bold", color: "#333", minWidth: 20, textAlign: "center" },
  itemRight: { alignItems: "flex-end", justifyContent: "space-between", height: 80 },
  subtotal: { fontSize: 15, fontWeight: "bold", color: "#5C4033" },
  summary: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 10 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  summaryLabel: { fontSize: 14, color: "#999" },
  summaryValue: { fontSize: 14, color: "#333", fontWeight: "600" },
  divider: { height: 1, backgroundColor: "#F0E8E0", marginVertical: 10 },
  totalLabel: { fontSize: 18, fontWeight: "bold", color: "#5C4033" },
  totalValue: { fontSize: 18, fontWeight: "bold", color: "#5C4033" },
  checkoutButton: { backgroundColor: "#5C4033", borderRadius: 16, padding: 16, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 16 },
  checkoutButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});