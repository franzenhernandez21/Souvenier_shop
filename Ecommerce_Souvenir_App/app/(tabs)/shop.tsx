import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  Animated,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { db } from "../../config/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
// import BottomModal from "../../components/BottomModal";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

interface Product {
  id: string;
  name: string;
  price: string;
  category: string;
  image: string;
  rating: string;
  description?: string;
  stock: number;
  seller?: string;
  sold?: number;
}

const categories = [
  { id: "all", name: "All" },
  { id: "crafts", name: "Crafts" },
  { id: "clothing", name: "Clothing" },
  { id: "food", name: "Food" },
  { id: "decor", name: "Decor" },
];

function ProductCard({
  product,
  onPress,
}: {
  product: Product;
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 2,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 6,
    }).start();
  };

  const priceNum = parseInt(product.price.replace("₱", "").replace(",", ""));
  const isLowStock = product.stock > 0 && product.stock <= 5;
  const isOutOfStock = product.stock === 0;
  const soldCount = product.sold ?? 0;

  return (
    <Animated.View style={[styles.cardWrapper, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.card}
      >
        {/* Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: product.image }}
            style={styles.productImage}
            resizeMode="cover"
          />
          {isOutOfStock && (
            <View style={styles.outOfStockOverlay}>
              <Text style={styles.outOfStockText}>Out of Stock</Text>
            </View>
          )}
          {isLowStock && !isOutOfStock && (
            <View style={styles.lowStockBadge}>
              <Text style={styles.lowStockText}>Only {product.stock} left</Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.infoSection}>
          {/* Top: name + seller */}
          <View>
            <Text style={styles.productName} numberOfLines={2}>
              {product.name}
            </Text>
            {product.seller ? (
              <Text style={styles.sellerName} numberOfLines={1}>
                {product.seller}
              </Text>
            ) : null}
          </View>

          {/* Bottom: rating + price anchored */}
          <View>
            <View style={styles.ratingRow}>
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name={
                      star <= Math.round(parseFloat(product.rating) || 0)
                        ? "star"
                        : "star-outline"
                    }
                    size={10}
                    color="#F59E0B"
                    style={{ marginRight: 1 }}
                  />
                ))}
              </View>
              <Text style={styles.ratingNumber}>
                {(parseFloat(product.rating) || 0).toFixed(1)}
              </Text>
            </View>

            <View style={styles.priceRow}>
              <Text style={styles.price}>₱{priceNum.toLocaleString()}</Text>
              <Text style={styles.soldCount}>{soldCount} sold</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function ShopScreen() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("name"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: Product[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Product, "id">),
        }));
        setProducts(data);
        setLoading(false);
      },
      (error) => {
        console.error("Real-time products error:", error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      selectedCategory === "all" || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Search bar — same layout as home page */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={16} color="#B0927E" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor="#B0927E"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={16} color="#B0927E" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContent}
        style={styles.categoriesScroll}
      >
        {categories.map((cat) => {
          const active = selectedCategory === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryChip, active && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Text style={[styles.categoryText, active && styles.categoryTextActive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Products Grid */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5C4033" />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      ) : filteredProducts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🛍️</Text>
          <Text style={styles.emptyTitle}>No products found</Text>
          <Text style={styles.emptySubtitle}>
            {search ? "Try a different search term" : "Check back soon!"}
          </Text>
        </View>
      ) : (
        <View style={styles.productsGrid}>
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onPress={() => router.push(`/product/${product.id}` as any)}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDF8F5",
  },

  // Search — mirrors home page exactly
  searchWrapper: {
    paddingHorizontal: 20,
    paddingTop: 58,
    paddingBottom: 16,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1.5,
    borderColor: "#F0E6E0",
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#2C1810",
    paddingVertical: 0,
  },

  // Categories
  categoriesScroll: { marginBottom: 20 },
  categoriesContent: { paddingHorizontal: 20, gap: 8 },
  categoryChip: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1.5,
    borderColor: "#F0E6E0",
  },
  categoryChipActive: {
    backgroundColor: "#5C4033",
    borderColor: "#5C4033",
  },
  categoryText: {
    fontSize: 12,
    color: "#5C4033",
    fontWeight: "600",
  },
  categoryTextActive: { color: "#fff" },

  // Products Grid — balanced
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    rowGap: 12,
    columnGap: 12,
  },

  // Card wrapper — stretch to equal height
  cardWrapper: {
    width: CARD_WIDTH,
    alignSelf: "stretch",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(240,230,224,0.8)",
    flex: 1,
  },
  imageContainer: {
    width: "100%",
    height: 150,
    position: "relative",
    backgroundColor: "#F5EDE8",
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  outOfStockOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  outOfStockText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
    letterSpacing: 0.5,
  },
  lowStockBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#FF6B35",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  lowStockText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
  },

  // Info — flex so price anchors to bottom
  infoSection: {
    padding: 10,
    gap: 3,
    flex: 1,
    justifyContent: "space-between",
  },
  productName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2C1810",
    lineHeight: 18,
  },
  sellerName: {
    fontSize: 11,
    color: "#9C7B6B",
    fontWeight: "500",
    marginTop: 1,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  starsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingNumber: {
    fontSize: 11,
    color: "#9C7B6B",
    fontWeight: "600",
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  price: {
    fontSize: 15,
    fontWeight: "800",
    color: "#5C4033",
    letterSpacing: -0.3,
  },
  soldCount: {
    fontSize: 11,
    color: "#9C7B6B",
    fontWeight: "500",
  },

  // Loading / Empty
  loadingContainer: {
    padding: 60,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#9C7B6B",
  },
  emptyContainer: {
    padding: 60,
    alignItems: "center",
    gap: 8,
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2C1810",
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#9C7B6B",
    textAlign: "center",
  },
});