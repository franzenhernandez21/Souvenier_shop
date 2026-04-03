import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCart } from "../context/CartContext";
import { collection, addDoc, updateDoc, doc, increment } from "firebase/firestore";
import { auth, db } from "../config/firebase";

export default function CheckoutScreen() {
  const router = useRouter();
  const { cartItems, cartCount, clearCart } = useCart();
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [loading, setLoading] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [orderedItems, setOrderedItems] = useState(cartItems);

  // Strip ₱ symbol and parse to number — price is stored as "₱170" in cart
  const parsePrice = (val: string | number | null | undefined): number => {
    if (val == null) return 0;
    if (typeof val === "number") return val;
    return parseFloat(String(val).replace(/[₱,]/g, "")) || 0;
  };

  const totalPrice = cartItems.reduce((sum, item) => {
    return sum + parsePrice(item.price) * item.quantity;
  }, 0);

  const shippingFee = 30;
  const grandTotal = totalPrice + shippingFee;

  const handlePlaceOrder = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;

      // Normalize items: save price as a number, not a ₱-prefixed string
      const normalizedItems = cartItems.map((item) => ({
        ...item,
        price: parsePrice(item.price),       // ← number, e.g. 170
        quantity: typeof item.quantity === "number" ? item.quantity : parseInt(String(item.quantity), 10) || 1,
      }));

      await addDoc(collection(db, "orders"), {
        userId: user?.uid,
        userEmail: user?.email,
        items: normalizedItems,             
        paymentMethod,
        totalPrice,
        shippingFee,
        grandTotal,
        status: "pending",
        createdAt: new Date(),
      });

      await Promise.all(
        normalizedItems.map((item) =>
          updateDoc(doc(db, "products", item.id), {
            stock: increment(-item.quantity),
          })
        )
      );

      setOrderedItems([...cartItems]);
      setLoading(false);
      setSuccessModal(true);
    } catch (error) {
      setLoading(false);
      Alert.alert("Error", (error as Error).message);
    }
  };

  const handleSuccessClose = () => {
    setSuccessModal(false);
    clearCart();
    setTimeout(() => {
      router.replace("/(tabs)/home");
    }, 100);
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={{ width: 38 }} />
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          {cartItems.map((item) => (
            <View key={item.id} style={styles.orderItem}>
              <Image source={{ uri: item.image }} style={styles.orderItemImage} />
              <View style={styles.orderItemDetails}>
                <Text style={styles.orderItemName} numberOfLines={2}>
                  {item.name}
                </Text>
                <View style={styles.orderItemBottom}>
                  <Text style={styles.orderItemPrice}>
                    ₱{(parsePrice(item.price) * item.quantity).toLocaleString()}
                  </Text>
                  <Text style={styles.orderItemQty}>x{item.quantity}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>

          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === "cod" && styles.paymentOptionActive,
            ]}
            onPress={() => setPaymentMethod("cod")}
          >
            <Ionicons
              name="cash-outline"
              size={24}
              color={paymentMethod === "cod" ? "#5C4033" : "#999"}
            />
            <View style={styles.paymentInfo}>
              <Text style={[
                styles.paymentTitle,
                paymentMethod === "cod" && styles.paymentTitleActive,
              ]}>
                Cash on Delivery
              </Text>
              <Text style={styles.paymentSubtitle}>Pay when you receive</Text>
            </View>
            <View style={[
              styles.radioButton,
              paymentMethod === "cod" && styles.radioButtonActive,
            ]}>
              {paymentMethod === "cod" && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === "ewallet" && styles.paymentOptionActive,
            ]}
            onPress={() => setPaymentMethod("ewallet")}
          >
            <Ionicons
              name="phone-portrait-outline"
              size={24}
              color={paymentMethod === "ewallet" ? "#5C4033" : "#999"}
            />
            <View style={styles.paymentInfo}>
              <Text style={[
                styles.paymentTitle,
                paymentMethod === "ewallet" && styles.paymentTitleActive,
              ]}>
                E-Wallet
              </Text>
              <Text style={styles.paymentSubtitle}>Pay via e-wallet</Text>
            </View>
            <View style={[
              styles.radioButton,
              paymentMethod === "ewallet" && styles.radioButtonActive,
            ]}>
              {paymentMethod === "ewallet" && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>
        </View>

        {/* Price Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price Summary</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Subtotal ({cartCount} items)</Text>
            <Text style={styles.priceValue}>₱{totalPrice.toLocaleString()}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Shipping Fee</Text>
            <Text style={styles.priceValue}>₱{shippingFee}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.priceRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₱{grandTotal.toLocaleString()}</Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Place Order Button */}
      <View style={styles.bottomBar}>
        <View style={styles.totalContainer}>
          <Text style={styles.bottomTotalLabel}>Total</Text>
          <Text style={styles.bottomTotalValue}>₱{grandTotal.toLocaleString()}</Text>
        </View>
        <TouchableOpacity
          style={[styles.placeOrderButton, loading && styles.placeOrderButtonDisabled]}
          onPress={handlePlaceOrder}
          disabled={loading}
        >
          <Text style={styles.placeOrderText}>
            {loading ? "Placing Order..." : "Place Order"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Success Modal */}
      <Modal visible={successModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.successModal}>

              <View style={styles.successIconContainer}>
                <Ionicons name="checkmark-circle" size={80} color="#5C4033" />
              </View>
              <Text style={styles.successTitle}>Order Placed!</Text>
              <Text style={styles.successMessage}>
                Your order has been placed successfully. We will notify you once it is confirmed!
              </Text>

              <View style={styles.receiptContainer}>
                {orderedItems.map((item) => (
                  <View key={item.id} style={styles.receiptItem}>
                    <View style={styles.receiptItemDetails}>
                      <Text style={styles.receiptItemName} numberOfLines={1}>
                        {item.name}
                      </Text>
                    </View>
                    <Text style={styles.receiptItemQty}>x{item.quantity}</Text>
                  </View>
                ))}

                <View style={styles.receiptDivider} />

                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Subtotal</Text>
                  <Text style={styles.receiptValue}>₱{totalPrice.toLocaleString()}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Shipping Fee</Text>
                  <Text style={styles.receiptValue}>₱{shippingFee}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Payment</Text>
                  <Text style={styles.receiptValue}>
                    {paymentMethod === "cod" ? "Cash on Delivery" : "E-Wallet"}
                  </Text>
                </View>

                <View style={styles.receiptDivider} />

                <View style={styles.receiptRow}>
                  <Text style={styles.receiptTotalLabel}>Total</Text>
                  <Text style={styles.receiptTotalValue}>₱{grandTotal.toLocaleString()}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.successButton}
                onPress={handleSuccessClose}
              >
                <Text style={styles.successButtonText}>Back to Home</Text>
              </TouchableOpacity>

            </View>
          </ScrollView>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FDF6F0" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 15,
    backgroundColor: "#FDF6F0",
  },
  backButton: { padding: 8, borderRadius: 50, backgroundColor: "#F5EDE8" },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#5C4033" },
  section: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: "#333", marginBottom: 14 },
  orderItem: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
    gap: 12,
    alignItems: "center",
  },
  orderItemImage: { width: 80, height: 80, borderRadius: 12, resizeMode: "cover" },
  orderItemDetails: { flex: 1, justifyContent: "space-between", height: 80, paddingVertical: 4 },
  orderItemName: { fontSize: 14, fontWeight: "600", color: "#333" },
  orderItemBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  orderItemPrice: { fontSize: 15, fontWeight: "bold", color: "#5C4033" },
  orderItemQty: { fontSize: 13, color: "#999", backgroundColor: "#F5F5F5", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  paymentOption: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: "#E0E0E0", marginBottom: 10, gap: 12 },
  paymentOptionActive: { borderColor: "#5C4033", backgroundColor: "#FDF6F0" },
  paymentInfo: { flex: 1 },
  paymentTitle: { fontSize: 15, fontWeight: "600", color: "#999" },
  paymentTitleActive: { color: "#5C4033" },
  paymentSubtitle: { fontSize: 12, color: "#999", marginTop: 2 },
  radioButton: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#ccc", justifyContent: "center", alignItems: "center" },
  radioButtonActive: { borderColor: "#5C4033" },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#5C4033" },
  priceRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  priceLabel: { fontSize: 14, color: "#999" },
  priceValue: { fontSize: 14, color: "#333", fontWeight: "600" },
  divider: { height: 1, backgroundColor: "#F0E8E0", marginVertical: 10 },
  totalLabel: { fontSize: 16, fontWeight: "bold", color: "#333" },
  totalValue: { fontSize: 16, fontWeight: "bold", color: "#5C4033" },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#fff", padding: 16, flexDirection: "row", alignItems: "center", gap: 12, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 10 },
  totalContainer: { flex: 1 },
  bottomTotalLabel: { fontSize: 12, color: "#999" },
  bottomTotalValue: { fontSize: 20, fontWeight: "bold", color: "#5C4033" },
  placeOrderButton: { backgroundColor: "#5C4033", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28 },
  placeOrderButtonDisabled: { backgroundColor: "#ccc" },
  placeOrderText: { color: "#fff", fontSize: 15, fontWeight: "bold" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  modalScroll: { flexGrow: 1, justifyContent: "center", padding: 24 },
  successModal: { backgroundColor: "#fff", borderRadius: 24, padding: 28, alignItems: "center", width: "100%" },
  successIconContainer: { marginBottom: 16 },
  successTitle: { fontSize: 26, fontWeight: "bold", color: "#333", marginBottom: 10 },
  successMessage: { fontSize: 14, color: "#666", textAlign: "center", lineHeight: 22, marginBottom: 16 },
  successButton: { backgroundColor: "#5C4033", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40 },
  successButtonText: { color: "#fff", fontSize: 15, fontWeight: "bold" },
  receiptContainer: { backgroundColor: "#FDF6F0", borderRadius: 16, padding: 16, width: "100%", marginBottom: 20 },
  receiptItem: { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 10 },
  receiptItemDetails: { flex: 1, gap: 4 },
  receiptItemName: { fontSize: 13, fontWeight: "600", color: "#333" },
  receiptItemQty: { fontSize: 13, color: "#999", fontWeight: "600" },
  receiptDivider: { height: 1, backgroundColor: "#E8D5B7", marginVertical: 10 },
  receiptRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  receiptLabel: { fontSize: 13, color: "#999" },
  receiptValue: { fontSize: 13, color: "#333", fontWeight: "600" },
  receiptTotalLabel: { fontSize: 15, fontWeight: "bold", color: "#333" },
  receiptTotalValue: { fontSize: 15, fontWeight: "bold", color: "#5C4033" },
});