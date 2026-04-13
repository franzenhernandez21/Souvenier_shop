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
import api from "../../config/api";
import { io } from "socket.io-client";

const SOCKET_URL = "http://192.168.1.30:5000"; // ✅ same IP as api.js

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

// ✅ FIX: Helper to ensure HTTPS image URLs
const safeImageUrl = (url?: string): string => {
  if (!url) return '';
  return url.startsWith('http://') ? url.replace('http://', 'https://') : url;
};

interface Product {
  id: string;
  _id?: string;
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
  { id: "all", name: "All", icon: "grid-outline" as const },
  { id: "crafts", name: "Crafts", icon: "color-palette-outline" as const },
  { id: "clothing", name: "Clothing", icon: "shirt-outline" as const },
  { id: "food", name: "Food", icon: "restaurant-outline" as const },
  { id: "decor", name: "Decor", icon: "home-outline" as const },
];

function ProductCard({
  product,
  onPress,
}: {
  product: Product;
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [imgError, setImgError] = useState(false);

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

  const priceNum = parseInt(String(product.price).replace("₱", "").replace(",", ""));
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
        <View style={styles.imageContainer}>
          {product.image && !imgError ? (
            <Image
              source={{ uri: safeImageUrl(product.image) }}
              style={styles.productImage}
              resizeMode="cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={{ fontSize: 36 }}>🛍️</Text>
            </View>
          )}
          {isOutOfStock && (
            <View style={styles.outOfStockBadge}>
              <Text style={styles.outOfStockText}>Out of Stock</Text>
            </View>
          )}
          {isLowStock && !isOutOfStock && (
            <View style={styles.lowStockBadge}>
              <Text style={styles.lowStockText}>Only {product.stock} left</Text>
            </View>
          )}
        </View>

        <View style={styles.infoSection}>
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
              <Text style={styles.price}>₱{isNaN(priceNum) ? product.price : priceNum.toLocaleString()}</Text>
              <Text style={styles.soldCount}>{soldCount} sold</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const router = useRouter();

  // ✅ Fetch products — callable anytime para ma-refresh
  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      const data: Product[] = res.data.map((p: any) => ({
        ...p,
        id: p._id || p.id,
        image: safeImageUrl(p.image),
        rating: String(p.rating ?? 0),
        sold: p.sold ?? 0,
      }));
      setProducts(data);
    } catch (err) {
      console.error("Products fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();

    // ✅ Socket — mag-refresh ng products pag may bagong review o order update
    const socket = io(SOCKET_URL, { transports: ["websocket"] });

    // Pag may nag-submit ng review → mag-refresh para makita ang updated stars
    socket.on("review_submitted", () => {
      fetchProducts();
    });

    // Pag nag-complete ang order → mag-refresh para makita ang updated sold count
    socket.on("order_updated", () => {
      fetchProducts();
    });

    return () => { socket.disconnect(); };
  }, []);

  const handleSearch = (text: string) => {
    setSearch(text);
    if (text.length > 0) {
      const filtered = products.filter((p) =>
        p.name.toLowerCase().includes(text.toLowerCase()) ||
        (p.category || "").toLowerCase().includes(text.toLowerCase())
      );
      setSuggestions(filtered.slice(0, 5));
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (product: Product) => {
    setSearch(product.name);
    setShowSuggestions(false);
    router.push(`/product/${product.id}` as any);
  };

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
      contentContainerStyle={{ paddingBottom: 32 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Search */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={16} color="#B0927E" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search souvenirs..."
            placeholderTextColor="#B0927E"
            value={search}
            onChangeText={handleSearch}
            onFocus={() => search.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => {
              setSearch("");
              setSuggestions([]);
              setShowSuggestions(false);
            }}>
              <Ionicons name="close-circle" size={16} color="#B0927E" />
            </TouchableOpacity>
          )}
        </View>

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            {suggestions.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.suggestionItem}
                onPress={() => handleSelectSuggestion(item)}
              >
                <Image source={{ uri: item.image }} style={styles.suggestionImage} />
                <View style={styles.suggestionInfo}>
                  <Text style={styles.suggestionName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.suggestionCategory}>
                    {item.category} · {item.price}
                  </Text>
                </View>
                <Ionicons name="arrow-forward" size={14} color="#B0927E" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Hero Banner */}
      <View style={styles.banner}>
        <View style={styles.bannerTextCol}>
          <View style={styles.bannerBadge}>
            <Text style={styles.bannerBadgeText}>✨ New Arrivals</Text>
          </View>
          <Text style={styles.bannerTitle}>Authentic{"\n"}Filipino Crafts</Text>
          <TouchableOpacity
            style={styles.bannerButton}
            onPress={() => router.push("/(tabs)/shop")}
          >
            <Text style={styles.bannerButtonText}>Shop Now</Text>
            <Ionicons name="arrow-forward" size={14} color="#5C4033" />
          </TouchableOpacity>
        </View>
        <View style={styles.bannerImageCol}>
          <Text style={styles.bannerEmoji}>🎁</Text>
          <View style={styles.bannerCircle1} />
          <View style={styles.bannerCircle2} />
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
              <Ionicons name={cat.icon} size={14} color={active ? "#fff" : "#5C4033"} />
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
  container: { flex: 1, backgroundColor: "#FDF8F5" },
  searchWrapper: { paddingHorizontal: 20, paddingTop: 58, paddingBottom: 16, zIndex: 100 },
  searchContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1.5, borderColor: "#F0E6E0" },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: "#2C1810", paddingVertical: 0 },
  suggestionsContainer: { backgroundColor: "#fff", borderRadius: 12, marginTop: 6, borderWidth: 1, borderColor: "#F0E6E0", overflow: "hidden", shadowColor: "#5C4033", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  suggestionItem: { flexDirection: "row", alignItems: "center", padding: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: "#F9F0EB" },
  suggestionImage: { width: 38, height: 38, borderRadius: 8, backgroundColor: "#F5EDE8" },
  suggestionInfo: { flex: 1 },
  suggestionName: { fontSize: 13, fontWeight: "600", color: "#2C1810" },
  suggestionCategory: { fontSize: 11, color: "#9C7B6B", marginTop: 1, textTransform: "capitalize" },
  banner: { backgroundColor: "#3D2314", marginHorizontal: 20, borderRadius: 20, padding: 24, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20, overflow: "hidden", shadowColor: "#3D2314", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  bannerTextCol: { flex: 1 },
  bannerBadge: { backgroundColor: "rgba(245,200,122,0.2)", borderWidth: 1, borderColor: "rgba(245,200,122,0.4)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start", marginBottom: 10 },
  bannerBadgeText: { color: "#F5C87A", fontSize: 11, fontWeight: "700" },
  bannerTitle: { fontSize: 22, fontWeight: "800", color: "#fff", lineHeight: 28, marginBottom: 16, letterSpacing: -0.5 },
  bannerButton: { backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6 },
  bannerButtonText: { color: "#5C4033", fontWeight: "700", fontSize: 13 },
  bannerImageCol: { alignItems: "center", justifyContent: "center", width: 80, position: "relative" },
  bannerEmoji: { fontSize: 52, zIndex: 2 },
  bannerCircle1: { position: "absolute", width: 70, height: 70, borderRadius: 35, backgroundColor: "rgba(255,255,255,0.06)", top: -10, right: -10 },
  bannerCircle2: { position: "absolute", width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(245,200,122,0.12)", bottom: -5, left: 0 },
  categoriesScroll: { marginBottom: 20 },
  categoriesContent: { paddingHorizontal: 20, gap: 8 },
  categoryChip: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1.5, borderColor: "#F0E6E0" },
  categoryChipActive: { backgroundColor: "#5C4033", borderColor: "#5C4033" },
  categoryText: { fontSize: 12, color: "#5C4033", fontWeight: "600" },
  categoryTextActive: { color: "#fff" },
  productsGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, rowGap: 12, columnGap: 12 },
  cardWrapper: { width: CARD_WIDTH, alignSelf: "stretch" },
  card: { backgroundColor: "#fff", borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "rgba(240,230,224,0.8)", flex: 1 },
  imageContainer: { width: "100%", height: 150, position: "relative", backgroundColor: "#F5EDE8" },
  productImage: { width: "100%", height: "100%" },
  imagePlaceholder: { width: "100%", height: "100%", justifyContent: "center", alignItems: "center", backgroundColor: "#F5EDE8" },
  outOfStockBadge: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center" },
  outOfStockText: { color: "#fff", fontWeight: "700", fontSize: 13, letterSpacing: 0.5 },
  lowStockBadge: { position: "absolute", top: 8, right: 8, backgroundColor: "#FF6B35", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  lowStockText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  infoSection: { padding: 10, gap: 3, flex: 1, justifyContent: "space-between" },
  productName: { fontSize: 13, fontWeight: "700", color: "#2C1810", lineHeight: 18 },
  sellerName: { fontSize: 11, color: "#9C7B6B", fontWeight: "500", marginTop: 1 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  starsContainer: { flexDirection: "row", alignItems: "center" },
  ratingNumber: { fontSize: 11, color: "#9C7B6B", fontWeight: "600" },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 },
  price: { fontSize: 15, fontWeight: "800", color: "#5C4033", letterSpacing: -0.3 },
  soldCount: { fontSize: 11, color: "#9C7B6B", fontWeight: "500" },
  loadingContainer: { padding: 60, alignItems: "center", gap: 12 },
  loadingText: { fontSize: 14, color: "#9C7B6B" },
  emptyContainer: { padding: 60, alignItems: "center", gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#2C1810" },
  emptySubtitle: { fontSize: 13, color: "#9C7B6B", textAlign: "center" },
});