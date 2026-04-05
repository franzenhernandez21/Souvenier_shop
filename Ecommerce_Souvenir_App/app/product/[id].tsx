import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import api from "../../config/api";
import BottomModal from "../../components/BottomModal";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 56) / 2;

interface Review {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  rating: number;
  comment: string;
  createdAt: any;
}

interface RelatedProduct {
  id: string;
  _id?: string;
  name: string;
  price: string | number;
  image: string;
  rating: string;
  sold?: number;
  seller?: string;
  stock: number;
  category?: string;
}

// ✅ FIXED: Helper to ensure HTTPS image URLs (React Native rejects HTTP)
const safeImageUrl = (url?: string): string => {
  if (!url) return '';
  return url.startsWith('http://') ? url.replace('http://', 'https://') : url;
};

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Ionicons
          key={s}
          name={s <= Math.round(rating) ? "star" : "star-outline"}
          size={size}
          color="#F59E0B"
          style={{ marginRight: 1 }}
        />
      ))}
    </View>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const date = review.createdAt
    ? new Date(review.createdAt).toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewAvatar}>
          {review.userPhoto ? (
            <Image
              source={{ uri: safeImageUrl(review.userPhoto) }}
              style={styles.reviewAvatarImage}
            />
          ) : (
            <Text style={styles.reviewAvatarText}>
              {(review.userName || "U")[0].toUpperCase()}
            </Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.reviewUserName}>{review.userName || "Anonymous"}</Text>
          <View style={styles.reviewMeta}>
            <Stars rating={review.rating} size={11} />
            {date ? <Text style={styles.reviewDate}> · {date}</Text> : null}
          </View>
        </View>
      </View>
      {review.comment ? (
        <Text style={styles.reviewComment}>{review.comment}</Text>
      ) : null}
    </View>
  );
}

function ProductCard({
  product,
  onPress,
}: {
  product: RelatedProduct;
  onPress: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const priceNum = parseInt(String(product.price).replace("₱", "").replace(",", ""));
  const isLowStock = product.stock > 0 && product.stock <= 5;
  const isOutOfStock = product.stock === 0;
  const soldCount = product.sold ?? 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
      <View style={styles.cardImageContainer}>
        {/* ✅ FIXED: Safe image with fallback placeholder */}
        {product.image && !imgError ? (
          <Image
            source={{ uri: safeImageUrl(product.image) }}
            style={styles.cardImage}
            resizeMode="cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={{ fontSize: 28 }}>🛍️</Text>
          </View>
        )}
        {isOutOfStock && (
          <View style={styles.cardOutOfStockBadge}>
            <Text style={styles.cardOutOfStockText}>Out of Stock</Text>
          </View>
        )}
        {isLowStock && !isOutOfStock && (
          <View style={styles.cardLowStockBadge}>
            <Text style={styles.cardLowStockText}>Only {product.stock} left</Text>
          </View>
        )}
      </View>
      <View style={styles.cardInfo}>
        <View>
          <Text style={styles.cardName} numberOfLines={2}>
            {product.name}
          </Text>
          {product.seller ? (
            <Text style={styles.cardSeller} numberOfLines={1}>
              {product.seller}
            </Text>
          ) : null}
        </View>
        <View>
          <View style={styles.cardRatingRow}>
            <Stars rating={parseFloat(product.rating as string) || 0} size={10} />
            <Text style={styles.cardRatingNum}>
              {(parseFloat(product.rating as string) || 0).toFixed(1)}
            </Text>
          </View>
          <View style={styles.cardPriceRow}>
            <Text style={styles.cardPrice}>₱{isNaN(priceNum) ? product.price : priceNum.toLocaleString()}</Text>
            <Text style={styles.cardSold}>{soldCount} sold</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function ProductDetailScreen() {
  const params = useLocalSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<"cart" | "buynow">("cart");
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [descExpanded, setDescExpanded] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(true);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [mainImgError, setMainImgError] = useState(false);

  const getId = (p: any) => p._id || p.id;

  // ✅ FIXED: Fetch product and sanitize image URL
  useEffect(() => {
    if (!id) return;
    const fetchProduct = async () => {
      try {
        const res = await api.get(`/products`);
        const found = res.data.find(
          (p: any) => p._id === id || p.id === id
        );
        if (found) {
          // ✅ FIXED: Sanitize image to HTTPS
          found.image = safeImageUrl(found.image);
          console.log('Product image URL:', found.image); // debug
        }
        setProduct(found || null);
      } catch (err) {
        console.error("Product fetch error:", err);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  // Fetch reviews
  useEffect(() => {
    if (!id) return;
    const fetchReviews = async () => {
      try {
        const res = await api.get(`/reviews/${id}`);
        setReviews(res.data);
      } catch (err) {
        console.error("Reviews fetch error:", err);
      } finally {
        setReviewsLoading(false);
      }
    };
    fetchReviews();
  }, [id]);

  // Fetch related products
  useEffect(() => {
    if (!product) return;
    const fetchRelated = async () => {
      setRelatedLoading(true);
      try {
        const res = await api.get('/products');
        const productId = getId(product);
        const related = res.data
          .filter((p: any) =>
            (p._id !== productId && p.id !== productId) &&
            (p.category === product.category || p.seller === product.seller)
          )
          .slice(0, 6)
          .map((p: any) => ({
            ...p,
            id: p._id || p.id,
            rating: String(p.rating ?? 0),
            sold: p.sold ?? 0,
            // ✅ FIXED: Sanitize related product images too
            image: safeImageUrl(p.image),
          }));
        setRelatedProducts(related);
      } catch (err) {
        console.error("Related products error:", err);
      } finally {
        setRelatedLoading(false);
      }
    };
    fetchRelated();
  }, [product]);

  if (loading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator size="large" color="#5C4033" />
        <Text style={styles.centerText}>Loading product...</Text>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.centerState}>
        <Text style={{ fontSize: 48 }}>😕</Text>
        <Text style={styles.centerText}>Product not found</Text>
        <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
          <Text style={styles.backLinkText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const priceNum = parseInt(String(product.price).replace("₱", "").replace(",", ""));
  const isOutOfStock = product.stock === 0;
  const soldCount = product.sold ?? 0;
  const description = product.description || "";

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : 0;

  const goToProduct = (productId: string) => {
    router.push({
      pathname: "/product/[id]",
      params: { id: productId },
    } as any);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {/* ── Main Product Image ── */}
        <View style={styles.imageContainer}>
          {/* ✅ FIXED: Main image with placeholder fallback */}
          {product.image && !mainImgError ? (
            <Image
              source={{ uri: product.image }}
              style={styles.productImage}
              resizeMode="cover"
              onError={() => {
                console.log('Main image load failed:', product.image);
                setMainImgError(true);
              }}
            />
          ) : (
            <View style={styles.mainImagePlaceholder}>
              <Text style={{ fontSize: 72 }}>🛍️</Text>
            </View>
          )}
          {isOutOfStock && (
            <View style={styles.outOfStockOverlay}>
              <Text style={styles.outOfStockText}>Out of Stock</Text>
            </View>
          )}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#2C1810" />
          </TouchableOpacity>
        </View>

        {/* ── Info Panel ── */}
        <View style={styles.infoPanel}>

          {/* Name + Price */}
          <View style={styles.namePriceRow}>
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.productPrice}>
              ₱{isNaN(priceNum) ? product.price : priceNum.toLocaleString()}
            </Text>
          </View>

          {/* Rating + Sold */}
          <View style={styles.ratingRow}>
            <Stars rating={avgRating} size={16} />
            {avgRating > 0 ? (
              <Text style={styles.ratingText}>{avgRating.toFixed(1)}</Text>
            ) : (
              <Text style={styles.ratingTextEmpty}>No ratings yet</Text>
            )}
            <Text style={styles.soldRight}>{soldCount} sold</Text>
          </View>

          {/* Stock indicator */}
          <View style={styles.stockRow}>
            {product.stock > 0 && product.stock <= 5 ? (
              <View style={styles.lowStockBadge}>
                <Ionicons name="alert-circle-outline" size={13} color="#FF6B35" />
                <Text style={styles.lowStockText}>Only {product.stock} left!</Text>
              </View>
            ) : product.stock > 5 ? (
              <View style={styles.inStockBadge}>
                <Ionicons name="checkmark-circle-outline" size={13} color="#15803D" />
                <Text style={styles.inStockText}>{product.stock} in stock</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.divider} />

          {/* Description */}
          <Text style={styles.sectionLabel}>Description</Text>
          <View>
            <ScrollView
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: descExpanded ? 280 : 88 }}
            >
              <Text style={styles.description}>{description}</Text>
            </ScrollView>
            {description.length > 100 && (
              <TouchableOpacity
                onPress={() => setDescExpanded(!descExpanded)}
                style={styles.seeMoreBtn}
              >
                <Text style={styles.seeMoreText}>
                  {descExpanded ? "See less" : "See more"}
                </Text>
                <Ionicons
                  name={descExpanded ? "chevron-up" : "chevron-down"}
                  size={13}
                  color="#5C4033"
                />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.divider} />

          {/* Seller */}
          {product.seller ? (
            <TouchableOpacity style={styles.sellerCard} activeOpacity={0.8}>
              <View style={styles.sellerAvatarCircle}>
                <Ionicons name="storefront" size={20} color="#5C4033" />
              </View>
              <View style={styles.sellerCardInfo}>
                <Text style={styles.sellerCardLabel}>Sold by</Text>
                <Text style={styles.sellerCardName}>{product.seller}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#B0927E" />
            </TouchableOpacity>
          ) : null}

          <View style={styles.divider} />

          {/* ── Customer Reviews ── */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>Customer Reviews</Text>
            {reviews.length > 0 && (
              <View style={styles.reviewSummaryBadge}>
                <Ionicons name="star" size={11} color="#F59E0B" />
                <Text style={styles.reviewSummaryText}>
                  {avgRating.toFixed(1)} ({reviews.length})
                </Text>
              </View>
            )}
          </View>

          {reviewsLoading ? (
            <ActivityIndicator size="small" color="#5C4033" style={{ marginVertical: 16 }} />
          ) : reviews.length === 0 ? (
            <View style={styles.noReviewsBox}>
              <Text style={styles.noReviewsEmoji}>💬</Text>
              <Text style={styles.noReviewsText}>No reviews yet</Text>
              <Text style={styles.noReviewsSub}>Be the first to review this product!</Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {(showAllReviews ? reviews : reviews.slice(0, 5)).map((r) => (
                <ReviewCard key={r.id} review={r} />
              ))}
              {reviews.length > 5 && (
                <TouchableOpacity
                  onPress={() => setShowAllReviews(!showAllReviews)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                    paddingVertical: 10,
                    borderWidth: 1,
                    borderColor: "#F0E6E0",
                    borderRadius: 12,
                    marginTop: 4,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "700", color: "#5C4033" }}>
                    {showAllReviews ? "Show Less" : `See All ${reviews.length} Reviews`}
                  </Text>
                  <Ionicons
                    name={showAllReviews ? "chevron-up" : "chevron-down"}
                    size={14}
                    color="#5C4033"
                  />
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={styles.divider} />

          {/* ── Related Products ── */}
          <Text style={[styles.sectionLabel, { fontSize: 18 }]}>More Products</Text>

          {relatedLoading ? (
            <ActivityIndicator size="small" color="#5C4033" style={{ marginVertical: 16 }} />
          ) : relatedProducts.length === 0 ? (
            <View style={styles.noReviewsBox}>
              <Text style={styles.noReviewsText}>No other products found</Text>
            </View>
          ) : (
            <View style={styles.relatedGrid}>
              {relatedProducts.map((rp) => (
                <ProductCard
                  key={rp._id || rp.id}
                  product={rp}
                  onPress={() => goToProduct(rp._id || rp.id)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Bottom Buttons ── */}
      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={[styles.addToCartBtn, isOutOfStock && styles.btnDisabled]}
          onPress={() => {
            if (!isOutOfStock) {
              setModalMode("cart");
              setModalVisible(true);
            }
          }}
          disabled={isOutOfStock}
        >
          <Ionicons name="cart-outline" size={18} color="#5C4033" />
          <Text style={styles.addToCartText}>Add to Cart</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.buyNowBtn, isOutOfStock && styles.btnDisabled]}
          onPress={() => {
            if (!isOutOfStock) {
              setModalMode("buynow");
              setModalVisible(true);
            }
          }}
          disabled={isOutOfStock}
        >
          <Text style={styles.buyNowText}>
            {isOutOfStock ? "Unavailable" : "Buy Now"}
          </Text>
        </TouchableOpacity>
      </View>

      <BottomModal
        visible={modalVisible}
        product={product}
        onClose={() => setModalVisible(false)}
        mode={modalMode}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  centerState: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff", gap: 12 },
  centerText: { fontSize: 16, color: "#9C7B6B", fontWeight: "500" },
  backLink: { marginTop: 8 },
  backLinkText: { color: "#5C4033", fontWeight: "700", fontSize: 15 },
  imageContainer: { width, height: 340, position: "relative", backgroundColor: "#F5EDE8", overflow: "hidden" },
  productImage: { width: "100%", height: "100%" },
  // ✅ NEW: Main image placeholder
  mainImagePlaceholder: { width: "100%", height: "100%", justifyContent: "center", alignItems: "center", backgroundColor: "#F5EDE8" },
  outOfStockOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
  outOfStockText: { color: "#fff", fontWeight: "800", fontSize: 20, letterSpacing: 0.5 },
  backBtn: { position: "absolute", top: 52, left: 20, width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.92)", justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 4 },
  infoPanel: { backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -28, padding: 24 },
  namePriceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 12 },
  productName: { flex: 1, fontSize: 20, fontWeight: "800", color: "#2C1810", lineHeight: 26, letterSpacing: -0.4 },
  productPrice: { fontSize: 22, fontWeight: "800", color: "#5C4033", letterSpacing: -0.5 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 6 },
  ratingText: { fontSize: 14, color: "#92400E", fontWeight: "700" },
  ratingTextEmpty: { fontSize: 13, color: "#9C7B6B", fontWeight: "500", fontStyle: "italic" },
  soldRight: { marginLeft: "auto", fontSize: 13, color: "#9C7B6B", fontWeight: "500" },
  stockRow: { flexDirection: "row", marginBottom: 4 },
  lowStockBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#FFF0EB", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  lowStockText: { fontSize: 12, color: "#FF6B35", fontWeight: "700" },
  inStockBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#F0FDF4", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  inStockText: { fontSize: 12, color: "#15803D", fontWeight: "600" },
  divider: { height: 1, backgroundColor: "#F0E6E0", marginVertical: 18 },
  sectionLabel: { fontSize: 14, fontWeight: "700", color: "#2C1810", marginBottom: 10, letterSpacing: -0.2 },
  description: { fontSize: 14, color: "#6B4E42", lineHeight: 22 },
  seeMoreBtn: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  seeMoreText: { fontSize: 13, color: "#5C4033", fontWeight: "700" },
  sellerCard: { flexDirection: "row", alignItems: "center", padding: 4, gap: 12 },
  sellerAvatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#F5EDE8", justifyContent: "center", alignItems: "center" },
  sellerCardInfo: { flex: 1 },
  sellerCardLabel: { fontSize: 11, color: "#9C7B6B", fontWeight: "500", marginBottom: 1 },
  sellerCardName: { fontSize: 14, fontWeight: "700", color: "#2C1810" },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  reviewSummaryBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#FEF9C3", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  reviewSummaryText: { fontSize: 11, color: "#92400E", fontWeight: "700" },
  reviewCard: { backgroundColor: "#FDF8F5", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#F0E6E0", gap: 8 },
  reviewHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  reviewAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#F0E6E0", justifyContent: "center", alignItems: "center", overflow: "hidden" },
  reviewAvatarImage: { width: 36, height: 36, borderRadius: 18 },
  reviewAvatarText: { fontSize: 15, fontWeight: "700", color: "#5C4033" },
  reviewUserName: { fontSize: 13, fontWeight: "700", color: "#2C1810", marginBottom: 2 },
  reviewMeta: { flexDirection: "row", alignItems: "center" },
  reviewDate: { fontSize: 11, color: "#9C7B6B" },
  reviewComment: { fontSize: 13, color: "#6B4E42", lineHeight: 20 },
  noReviewsBox: { alignItems: "center", paddingVertical: 24, gap: 4 },
  noReviewsEmoji: { fontSize: 32, marginBottom: 4 },
  noReviewsText: { fontSize: 14, fontWeight: "700", color: "#2C1810" },
  noReviewsSub: { fontSize: 12, color: "#9C7B6B" },
  relatedGrid: { flexDirection: "row", flexWrap: "wrap", rowGap: 12, columnGap: 12, marginTop: 4 },
  card: { width: CARD_WIDTH, backgroundColor: "#fff", borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "rgba(240,230,224,0.8)" },
  cardImageContainer: { width: "100%", height: 130, position: "relative", backgroundColor: "#F5EDE8" },
  cardImage: { width: "100%", height: "100%" },
  // ✅ NEW: Card image placeholder
  imagePlaceholder: { width: "100%", height: "100%", justifyContent: "center", alignItems: "center", backgroundColor: "#F5EDE8" },
  cardOutOfStockBadge: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center" },
  cardOutOfStockText: { color: "#fff", fontWeight: "700", fontSize: 12, letterSpacing: 0.5 },
  cardLowStockBadge: { position: "absolute", top: 8, right: 8, backgroundColor: "#FF6B35", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  cardLowStockText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  cardInfo: { padding: 10, gap: 3, flex: 1, justifyContent: "space-between" },
  cardName: { fontSize: 13, fontWeight: "700", color: "#2C1810", lineHeight: 18 },
  cardSeller: { fontSize: 11, color: "#9C7B6B", fontWeight: "500", marginTop: 1 },
  cardRatingRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  cardRatingNum: { fontSize: 11, color: "#9C7B6B", fontWeight: "600" },
  cardPriceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 },
  cardPrice: { fontSize: 15, fontWeight: "800", color: "#5C4033", letterSpacing: -0.3 },
  cardSold: { fontSize: 11, color: "#9C7B6B", fontWeight: "500" },
  bottomButtons: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", padding: 16, paddingBottom: 28, backgroundColor: "#fff", gap: 12, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 10 },
  addToCartBtn: { flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, borderWidth: 2, borderColor: "#5C4033", borderRadius: 14, padding: 14, backgroundColor: "#fff" },
  addToCartText: { color: "#5C4033", fontSize: 15, fontWeight: "700" },
  buyNowBtn: { flex: 1.2, justifyContent: "center", alignItems: "center", backgroundColor: "#5C4033", borderRadius: 14, padding: 14, shadowColor: "#5C4033", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  buyNowText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  btnDisabled: { opacity: 0.4 },
});