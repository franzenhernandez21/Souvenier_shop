import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Image,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCart } from "../context/CartContext";
import { useRouter } from "expo-router";
// import { db } from "../config/firebase";
// import { doc, updateDoc, increment } from "firebase/firestore";

type Product = {
  id: string;
  name: string;
  price: string;
  image: string;
  category: string;
  rating: string;
  stock: number;
};

type Props = {
  visible: boolean;
  product: Product | null;
  onClose: () => void;
  mode: "cart" | "buynow";
};

export default function BottomModal({ visible, product, onClose, mode }: Props) {
  const [quantity, setQuantity] = useState(1);
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { addToCart } = useCart();
  const router = useRouter();

  useEffect(() => {
    if (visible) {
      setQuantity(1);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, fadeAnim]);

  if (!product) return null;

  const unitPrice = parseInt(product.price.replace("₱", "").replace(",", ""));
  const totalPrice = unitPrice * quantity;

  // ── Decrement stock in Firestore ─────────────────────────────────────────

  const handleConfirm = async () => {
  // Validate stock before doing anything
  if (quantity > product.stock) {
    Alert.alert("Sorry!", "Not enough stock available.");
    return;
  }

  if (mode === "cart") {
    // ── Add to Cart: just add to cart, DON'T touch stock yet ──
    for (let i = 0; i < quantity; i++) {
      addToCart(product);
    }
    onClose();
    Alert.alert(
      "Added to Cart! 🛒",
      `${product.name} (x${quantity}) has been added to your cart!`
    );
  } else {
    // ── Buy Now: add to cart then go to checkout ──
    for (let i = 0; i < quantity; i++) {
      addToCart(product);
    }
    onClose();
    router.push("/checkout");
  }
};

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      {/* Modal Content */}
      <Animated.View
        style={[
          styles.modalContainer,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Handle Bar */}
        <View style={styles.handleBar} />

        {/* Product Info */}
        <View style={styles.productRow}>
          <Image source={{ uri: product.image }} style={styles.productImage} />
          <View style={styles.productDetails}>
            <Text style={styles.productName} numberOfLines={2}>
              {product.name}
            </Text>
            <Text style={styles.productPrice}>₱{unitPrice.toLocaleString()}</Text>
            <Text style={styles.stockText}>Stock: {product.stock} available</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Quantity Selector */}
        <View style={styles.quantitySection}>
          <Text style={styles.quantityLabel}>Quantity</Text>
          <View style={styles.quantityControls}>
            <TouchableOpacity
              style={[styles.quantityButton, quantity <= 1 && styles.quantityButtonDisabled]}
              onPress={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
            >
              <Ionicons name="remove" size={20} color={quantity <= 1 ? "#ccc" : "#5C4033"} />
            </TouchableOpacity>

            <Text style={styles.quantityText}>{quantity}</Text>

            <TouchableOpacity
              style={[
                styles.quantityButton,
                quantity >= product.stock && styles.quantityButtonDisabled,
              ]}
              onPress={() => setQuantity((q) => Math.min(product.stock, q + 1))}
              disabled={quantity >= product.stock}
            >
              <Ionicons
                name="add"
                size={20}
                color={quantity >= product.stock ? "#ccc" : "#5C4033"}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Total */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Price</Text>
          <Text style={styles.totalPrice}>₱{totalPrice.toLocaleString()}</Text>
        </View>

        {/* Confirm Button */}
        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
          <Text style={styles.confirmButtonText}>
            {mode === "cart" ? "Add to Cart" : "Buy Now"}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: "#E0D5CF",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
  },
  productImage: {
    width: 90,
    height: 90,
    borderRadius: 14,
    resizeMode: "cover",
  },
  productDetails: {
    flex: 1,
    gap: 4,
  },
  productName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  productPrice: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#5C4033",
  },
  stockText: {
    fontSize: 12,
    color: "#999",
  },
  divider: {
    height: 1,
    backgroundColor: "#F0E8E0",
    marginBottom: 16,
  },
  quantitySection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  quantityLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  quantityButton: {
    backgroundColor: "#F5EDE8",
    borderRadius: 10,
    width: 38,
    height: 38,
    justifyContent: "center",
    alignItems: "center",
  },
  quantityButtonDisabled: {
    backgroundColor: "#F5F5F5",
  },
  quantityText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    minWidth: 30,
    textAlign: "center",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FDF6F0",
    padding: 14,
    borderRadius: 14,
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 15,
    color: "#666",
    fontWeight: "600",
  },
  totalPrice: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#5C4033",
  },
  confirmButton: {
    backgroundColor: "#5C4033",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});