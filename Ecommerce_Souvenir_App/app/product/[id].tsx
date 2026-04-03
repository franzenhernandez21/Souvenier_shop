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
import { db } from "../../config/firebase";
import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  limit,
} from "firebase/firestore";
import BottomModal from "../../components/BottomModal";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 56) / 2;

// ─── Types ────────────────────────────────────────────────────────────────────
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
  name: string;
  price: string;
  image: string;
  rating: string;
  sold?: number;
  seller?: string;
  stock: number;
}

// ─── Stars helper ─────────────────────────────────────────────────────────────
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

// ─── Review Card ──────────────────────────────────────────────────────────────
function ReviewCard({ review }: { review: Review }) {
  const date =
    review.createdAt?.toDate
      ? review.createdAt.toDate().toLocaleDateString("en-PH", {
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
            <Image source={{ uri: review.userPhoto }} style={styles.reviewAvatarImage} />
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

// ─── Related Product Card ─────────────────────────────────────────────────────
function ProductCard({
  product,
  onPress,
}: {
  product: RelatedProduct;
  onPress: () => void;
}) {
  const priceNum = parseInt(String(product.price).replace("₱", "").replace(",", ""));
  const isLowStock = product.stock > 0 && product.stock <= 5;
  const isOutOfStock = product.stock === 0;
  const soldCount = product.sold ?? 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
      <View style={styles.cardImageContainer}>
        <Image
          source={{ uri: product.image }}
          style={styles.cardImage}
          resizeMode="cover"
        />
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
            <Stars rating={parseFloat(product.rating)} size={10} />
            <Text style={styles.cardRatingNum}>
              {parseFloat(product.rating).toFixed(1)}
            </Text>
          </View>
          <View style={styles.cardPriceRow}>
            <Text style={styles.cardPrice}>₱{priceNum.toLocaleString()}</Text>
            <Text style={styles.cardSold}>{soldCount} sold</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
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
  // ── Product listener ──────────────────────────────────────────────────────
  useEffect(() => {
  if (!id) return;

  console.log("Product ID:", id); // DEBUG

  const docRef = doc(db, "products", id);

  const unsubscribe = onSnapshot(
    docRef,
    (snap) => {
      console.log("Product exists:", snap.exists());

      if (snap.exists()) {
        setProduct({ id: snap.id, ...snap.data() });
      } else {
        setProduct(null);
      }
      setLoading(false);
    },
    (error) => {
      console.error("Product detail error:", error);
      setLoading(false);
    }
  );

  return () => unsubscribe();
}, [id]);

  // ── Reviews listener (reads from top-level `reviews` collection) ──────────
  useEffect(() => {
    if (!id) return;
    const productId = Array.isArray(id) ? id[0] : id;

    const q = query(
      collection(db, "reviews"),
      where("productId", "==", productId),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: Review[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Review, "id">),
        }));
        setReviews(data);
        setReviewsLoading(false);
      },
      () => setReviewsLoading(false)
    );
    return () => unsubscribe();
  }, [id]);

  // ── Related products ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!product || !id) return;
    const fetchRelated = async () => {
      setRelatedLoading(true);
      try {
        let q = query(
          collection(db, "products"),
          where("seller", "==", product.seller),
          limit(7)
        );
        let snap = await getDocs(q);
        let data: RelatedProduct[] = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<RelatedProduct, "id">) }))
          .filter((p) => p.id !== (id as string));

        if (data.length === 0) {
          q = query(
            collection(db, "products"),
            where("category", "==", product.category),
            limit(7)
          );
          snap = await getDocs(q);
          data = snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<RelatedProduct, "id">) }))
            .filter((p) => p.id !== (id as string))
            .slice(0, 6);
        }

        setRelatedProducts(data);
      } catch (e) {
        console.error("Related products error:", e);
      } finally {
        setRelatedLoading(false);
      }
    };
    fetchRelated();
  }, [product, id]);

  // ── Loading / not found ───────────────────────────────────────────────────
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

  // ✅ FIX: always derive rating from actual reviews.
  // product.rating may be undefined/NaN if never set in Firestore.
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : 0;

  // Use avgRating as the display rating everywhere (0 = no reviews yet)
  const ratingNum = avgRating;

  // ── FIX: navigate to related product using params object, not string path ──
  // Using a string like `/product/${id}` inside a tab navigator can match the
  // wrong route (e.g. the profile tab). Using the params object is explicit.
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
        {/* ── Image ─────────────────────────────────────────────────────── */}
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
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#2C1810" />
          </TouchableOpacity>
        </View>

        {/* ── Info Panel ────────────────────────────────────────────────── */}
        <View style={styles.infoPanel}>

          {/* Name + Price */}
          <View style={styles.namePriceRow}>
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.productPrice}>₱{priceNum.toLocaleString()}</Text>
          </View>

          {/* Rating + Sold + Stock */}
          <View style={styles.ratingRow}>
            <Stars rating={ratingNum} size={16} />
            {ratingNum > 0 ? (
              <Text style={styles.ratingText}>{ratingNum.toFixed(1)}</Text>
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
            <TouchableOpacity
              style={styles.sellerCard}
              onPress={() =>
                router.push({
                  pathname: "/seller/[sellerId]",
                  params: { sellerId: product.seller },
                } as any)
              }
              activeOpacity={0.8}
            >
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

          {/* ── Customer Reviews ─────────────────────────────────────────── */}
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
            <ActivityIndicator
              size="small"
              color="#5C4033"
              style={{ marginVertical: 16 }}
            />
          ) : reviews.length === 0 ? (
            <View style={styles.noReviewsBox}>
              <Text style={styles.noReviewsEmoji}>💬</Text>
              <Text style={styles.noReviewsText}>No reviews yet</Text>
              <Text style={styles.noReviewsSub}>
                Be the first to review this product!
              </Text>
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

          {/* ── Related / More Products ───────────────────────────────────── */}
          <Text style={[styles.sectionLabel, { fontSize: 18 }]}>More Products</Text>

          {relatedLoading ? (
            <ActivityIndicator
              size="small"
              color="#5C4033"
              style={{ marginVertical: 16 }}
            />
          ) : relatedProducts.length === 0 ? (
            <View style={styles.noReviewsBox}>
              <Text style={styles.noReviewsText}>No other products found</Text>
            </View>
          ) : (
            <View style={styles.relatedGrid}>
              {relatedProducts.map((rp) => (
                <ProductCard
                  key={rp.id}
                  product={rp}
                  // ✅ FIX: use params object so Expo Router resolves the correct
                  //         dynamic route instead of guessing from the string path
                  onPress={() => goToProduct(rp.id)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Bottom Buttons ────────────────────────────────────────────────── */}
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

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  centerState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    gap: 12,
  },
  centerText: { fontSize: 16, color: "#9C7B6B", fontWeight: "500" },
  backLink: { marginTop: 8 },
  backLinkText: { color: "#5C4033", fontWeight: "700", fontSize: 15 },

  imageContainer: {
    width,
    height: 340,
    position: "relative",
    backgroundColor: "#F5EDE8",
    overflow: "hidden",
  },
  productImage: { width: "100%", height: "100%" },
  outOfStockOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  outOfStockText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 20,
    letterSpacing: 0.5,
  },
  backBtn: {
    position: "absolute",
    top: 52,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.92)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },

  infoPanel: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28,
    padding: 24,
  },

  namePriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
    gap: 12,
  },
  productName: {
    flex: 1,
    fontSize: 20,
    fontWeight: "800",
    color: "#2C1810",
    lineHeight: 26,
    letterSpacing: -0.4,
  },
  productPrice: {
    fontSize: 22,
    fontWeight: "800",
    color: "#5C4033",
    letterSpacing: -0.5,
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  ratingText: {
    fontSize: 14,
    color: "#92400E",
    fontWeight: "700",
  },
  ratingTextEmpty: {
    fontSize: 13,
    color: "#9C7B6B",
    fontWeight: "500",
    fontStyle: "italic",
  },
  soldRight: {
    marginLeft: "auto",
    fontSize: 13,
    color: "#9C7B6B",
    fontWeight: "500",
  },

  stockRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  lowStockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF0EB",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  lowStockText: {
    fontSize: 12,
    color: "#FF6B35",
    fontWeight: "700",
  },
  inStockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  inStockText: {
    fontSize: 12,
    color: "#15803D",
    fontWeight: "600",
  },

  divider: {
    height: 1,
    backgroundColor: "#F0E6E0",
    marginVertical: 18,
  },

  sectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2C1810",
    marginBottom: 10,
    letterSpacing: -0.2,
  },

  description: {
    fontSize: 14,
    color: "#6B4E42",
    lineHeight: 22,
  },
  seeMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  seeMoreText: {
    fontSize: 13,
    color: "#5C4033",
    fontWeight: "700",
  },

  sellerCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 4,
    gap: 12,
  },
  sellerAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F5EDE8",
    justifyContent: "center",
    alignItems: "center",
  },
  sellerCardInfo: { flex: 1 },
  sellerCardLabel: {
    fontSize: 11,
    color: "#9C7B6B",
    fontWeight: "500",
    marginBottom: 1,
  },
  sellerCardName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2C1810",
  },

  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  reviewSummaryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FEF9C3",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  reviewSummaryText: {
    fontSize: 11,
    color: "#92400E",
    fontWeight: "700",
  },

  reviewCard: {
    backgroundColor: "#FDF8F5",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F0E6E0",
    gap: 8,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F0E6E0",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  reviewAvatarImage: { width: 36, height: 36, borderRadius: 18 },
  reviewAvatarText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#5C4033",
  },
  reviewUserName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2C1810",
    marginBottom: 2,
  },
  reviewMeta: { flexDirection: "row", alignItems: "center" },
  reviewDate: { fontSize: 11, color: "#9C7B6B" },
  reviewComment: {
    fontSize: 13,
    color: "#6B4E42",
    lineHeight: 20,
  },

  noReviewsBox: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 4,
  },
  noReviewsEmoji: { fontSize: 32, marginBottom: 4 },
  noReviewsText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2C1810",
  },
  noReviewsSub: { fontSize: 12, color: "#9C7B6B" },

  relatedGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 12,
    columnGap: 12,
    marginTop: 4,
  },

  card: {
    width: CARD_WIDTH,
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(240,230,224,0.8)",
  },
  cardImageContainer: {
    width: "100%",
    height: 130,
    position: "relative",
    backgroundColor: "#F5EDE8",
  },
  cardImage: { width: "100%", height: "100%" },
  cardOutOfStockBadge: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardOutOfStockText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  cardLowStockBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#FF6B35",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  cardLowStockText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
  },
  cardInfo: {
    padding: 10,
    gap: 3,
    flex: 1,
    justifyContent: "space-between",
  },
  cardName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2C1810",
    lineHeight: 18,
  },
  cardSeller: {
    fontSize: 11,
    color: "#9C7B6B",
    fontWeight: "500",
    marginTop: 1,
  },
  cardRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  cardRatingNum: {
    fontSize: 11,
    color: "#9C7B6B",
    fontWeight: "600",
  },
  cardPriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  cardPrice: {
    fontSize: 15,
    fontWeight: "800",
    color: "#5C4033",
    letterSpacing: -0.3,
  },
  cardSold: {
    fontSize: 11,
    color: "#9C7B6B",
    fontWeight: "500",
  },

  bottomButtons: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    flexDirection: "row",
    padding: 16,
    paddingBottom: 28,
    backgroundColor: "#fff",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 10,
  },
  addToCartBtn: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    borderWidth: 2,
    borderColor: "#5C4033",
    borderRadius: 14,
    padding: 14,
    backgroundColor: "#fff",
  },
  addToCartText: {
    color: "#5C4033",
    fontSize: 15,
    fontWeight: "700",
  },
  buyNowBtn: {
    flex: 1.2,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#5C4033",
    borderRadius: 14,
    padding: 14,
    shadowColor: "#5C4033",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buyNowText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  btnDisabled: { opacity: 0.4 },
});