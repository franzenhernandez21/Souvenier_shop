import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
  Modal, TextInput, Image, ActivityIndicator, FlatList, Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../config/api";
import * as ImagePicker from "expo-image-picker";
import { io } from "socket.io-client";

const SOCKET_URL = "http://192.168.1.30:5000";

interface OrderItem {
  id: string;
  productId?: string;
  name: string;
  quantity: number;
  reviewed?: boolean;
}
interface Order {
  id: string; _id?: string; userId: string; status: string;
  items: OrderItem[]; shippingFee: number; grandTotal?: number;
  totalPrice?: number; createdAt?: string; dateReceived?: string;
}

const getProductId = (item: OrderItem): string =>
  (item as any).product_id || item.productId || item.id || (item as any)._id || "";

const getOrderId = (order: Order): string => order._id || order.id || "";

function StarRating({ rating, onRate, size = 32 }: { rating: number; onRate: (s: number) => void; size?: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <TouchableOpacity key={s} onPress={() => onRate(s)} activeOpacity={0.7}>
          <Text style={{ fontSize: size, color: s <= rating ? "#F59E0B" : "#E5E7EB" }}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function ProfileScreen() {
  const [userName, setUserName]   = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPhoto, setUserPhoto] = useState("");
  const [userId, setUserId]       = useState("");
  const router = useRouter();

  const [manageProfileModal, setManageProfileModal] = useState(false);
  const [passwordModal, setPasswordModal]           = useState(false);
  const [trackOrdersModal, setTrackOrdersModal]     = useState(false);
  const [orderHistoryModal, setOrderHistoryModal]   = useState(false);

  const [editName, setEditName]   = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [activeOrders, setActiveOrders]       = useState<Order[]>([]);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);

  const [reviewModal, setReviewModal]         = useState(false);
  const [reviewOrder, setReviewOrder]         = useState<Order | null>(null);
  const [reviewItem, setReviewItem]           = useState<OrderItem | null>(null);
  const [reviewRating, setReviewRating]       = useState(0);
  const [reviewComment, setReviewComment]     = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const [reviewNotif, setReviewNotif] = useState(false);
  const bannerAnim  = useRef(new Animated.Value(-100)).current;
  const userIdRef   = useRef("");

  const unreviewedOrderCount = completedOrders.filter((o) =>
    o.items?.some((i) => !i.reviewed)
  ).length;

  useEffect(() => {
    if (reviewNotif) {
      Animated.spring(bannerAnim, { toValue: 0, useNativeDriver: true, speed: 14, bounciness: 5 }).start();
    } else {
      Animated.timing(bannerAnim, { toValue: -100, duration: 200, useNativeDriver: true }).start();
    }
  }, [reviewNotif]);

  const fetchUser = async () => {
    try {
      const userStr = await AsyncStorage.getItem("user");
      if (!userStr) return;
      const user = JSON.parse(userStr);
      const id = user._id || user.id;
      setUserName(user.name || "");
      setUserEmail(user.email || "");
      setUserPhoto(user.photo || "");
      setUserId(id || "");
      userIdRef.current = id || "";
    } catch (e) { console.error("fetchUser error:", e); }
  };

  const fetchOrders = useCallback(async () => {
    try {
      const userStr = await AsyncStorage.getItem("user");
      if (!userStr) return;
      const user = JSON.parse(userStr);
      const id = user._id || user.id;
      const res = await api.get("/orders");
      const allOrders: Order[] = res.data
        .filter((o: Order) => o.userId === id)
        .map((o: Order) => ({ ...o, id: o._id || o.id }));
      setActiveOrders(allOrders.filter((o) => ["pending", "processing"].includes(o.status))
        .sort((a, b) => (a.status === "processing" ? -1 : b.status === "processing" ? 1 : 0)));
      setCompletedOrders(allOrders.filter((o) => o.status === "completed"));
    } catch (e) { console.error("fetchOrders error:", e); }
  }, []);

  useEffect(() => {
    fetchUser();
    fetchOrders();

    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on("connect", () => console.log("🟢 Profile socket connected:", socket.id));
    socket.on("connect_error", (err) => console.log("⚠️ Socket error:", err.message));
    socket.on("disconnect", () => console.log("🔴 Profile socket disconnected"));

    socket.on("order_updated", async (updatedOrder: any) => {
      await fetchOrders();
      if (updatedOrder?.status === "completed" && updatedOrder?.userId === userIdRef.current) {
        setReviewNotif(true);
      }
    });

    socket.on("new_order",    () => fetchOrders());
    socket.on("order_deleted", () => fetchOrders());

    return () => { socket.disconnect(); };
  }, [fetchOrders]);

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: async () => {
        await AsyncStorage.multiRemove(["token", "user"]);
        router.replace("/login");
      }},
    ]);
  };

  const openManageProfile = () => {
    setEditName(userName);
    setEditEmail(userEmail);
    setManageProfileModal(true);
  };

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission Denied", "Need photo library access."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.7, base64: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      const { base64, uri } = result.assets[0];
      setUserPhoto(base64 ? `data:image/jpeg;base64,${base64}` : uri);
    }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) { Alert.alert("Error", "Name cannot be empty."); return; }
    setProfileLoading(true);
    try {
      const updatedUser = { name: editName.trim(), email: editEmail.trim(), photo: userPhoto };
      await api.put(`/users/${userId}`, updatedUser);
      const userStr = await AsyncStorage.getItem("user");
      if (userStr) await AsyncStorage.setItem("user", JSON.stringify({ ...JSON.parse(userStr), ...updatedUser }));
      setUserName(editName.trim()); setUserEmail(editEmail.trim());
      setManageProfileModal(false);
      Alert.alert("Success", "Profile updated!");
    } catch (e) { Alert.alert("Error", (e as Error).message); }
    finally { setProfileLoading(false); }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) { Alert.alert("Error", "Fill in all fields."); return; }
    if (newPassword !== confirmPassword) { Alert.alert("Error", "New passwords do not match."); return; }
    if (newPassword.length < 6) { Alert.alert("Error", "Password must be at least 6 characters."); return; }
    setPasswordLoading(true);
    try {
      await api.put(`/users/${userId}`, { password: newPassword });
      setPasswordModal(false);
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      Alert.alert("Success", "Password changed!");
    } catch (e) { Alert.alert("Error", (e as Error).message); }
    finally { setPasswordLoading(false); }
  };

  const handleConfirmReceived = async (order: Order) => {
    Alert.alert("Confirm Receipt", "Have you received your order?", [
      { text: "Cancel", style: "cancel" },
      { text: "Yes, Received!", onPress: async () => {
        try {
          await api.put(`/orders/${getOrderId(order)}`, {
            status: "completed",
            dateReceived: new Date().toISOString(),
          });
          await fetchOrders();
          setReviewNotif(true);
          Alert.alert("🎉 Thank you!", "Order marked as received! Go to Order History to rate your items.");
        } catch (e) { Alert.alert("Error", (e as Error).message); }
      }},
    ]);
  };

  const openReview = (order: Order, item: OrderItem) => {
    setReviewOrder(order); setReviewItem(item);
    setReviewRating(0); setReviewComment("");
    setReviewModal(true);
  };

  const handleSubmitReview = async () => {
    if (reviewRating === 0) { Alert.alert("Rating required", "Please select a star rating."); return; }
    if (!reviewItem || !reviewOrder) return;

    console.log("🔍 Review item fields:", JSON.stringify(reviewItem));

    const productId = getProductId(reviewItem);
    if (!productId) {
      Alert.alert("Error", `Could not find product ID. Fields found: ${Object.keys(reviewItem).join(", ")}`);
      return;
    }

    setReviewSubmitting(true);
    try {
      const orderId = getOrderId(reviewOrder);
      await api.post("/reviews", {
        productId, userId, userName, userPhoto, orderId,
        rating: reviewRating, comment: reviewComment.trim(),
      });

      const updatedItems = reviewOrder.items.map((i) =>
        getProductId(i) === productId ? { ...i, reviewed: true } : i
      );
      await api.put(`/orders/${orderId}`, { items: updatedItems });

      // ✅ FIX: Auto-hide banner if no more unreviewed items remain
      setCompletedOrders((prev) => {
        const updated = prev.map((o) =>
          getOrderId(o) === orderId ? { ...o, items: updatedItems } : o
        );
        const stillHasUnreviewed = updated.some((o) =>
          o.items?.some((i) => !i.reviewed)
        );
        if (!stillHasUnreviewed) setReviewNotif(false);
        return updated;
      });

      setReviewModal(false);
      setTimeout(() => Alert.alert("⭐ Review Submitted!", "Thank you! Your review is now live."), 300);
    } catch (e) {
      Alert.alert("Error", "Failed to submit review. Try again.");
      console.error("Review submit error:", e);
    } finally { setReviewSubmitting(false); }
  };

  interface MenuItemProps {
    icon: keyof typeof Ionicons.glyphMap;
    label: string; onPress: () => void; color?: string; badge?: string | number;
  }
  const MenuItem = ({ icon, label, onPress, color = "#333", badge }: MenuItemProps) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.menuLeft}>
        <Ionicons name={icon} size={20} color={color} />
        <Text style={[styles.menuLabel, { color }]}>{label}</Text>
      </View>
      <View style={styles.menuRight}>
        {badge !== undefined && <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View>}
        <Ionicons name="chevron-forward" size={16} color="#ccc" />
      </View>
    </TouchableOpacity>
  );

  const getTotal = (o: Order) => o.grandTotal ?? o.totalPrice ?? 0;
  const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) : "";
  const ratingLabels = ["", "Poor 😞", "Fair 😐", "Good 😊", "Very Good 😄", "Excellent 🌟"];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          {userPhoto ? <Image source={{ uri: userPhoto }} style={styles.avatarImage} />
            : <Text style={styles.avatarText}>{userName ? userName[0].toUpperCase() : "?"}</Text>}
        </View>
        <Text style={styles.userName}>{userName || "User"}</Text>
        <Text style={styles.userEmail}>{userEmail}</Text>
      </View>

      <View style={styles.bodyCard}>

        {/* ── Notification Banner (animated slide down) ── */}
        {reviewNotif && (
          <Animated.View style={[styles.reviewNotifBanner, { transform: [{ translateY: bannerAnim }] }]}>
            <TouchableOpacity style={styles.reviewNotifInner} activeOpacity={0.85}
              onPress={() => { setReviewNotif(false); setOrderHistoryModal(true); }}>
              <View style={styles.reviewNotifIconWrap}>
                <Ionicons name="star" size={22} color="#F59E0B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.reviewNotifTitle}>Order completed! 🎉</Text>
                <Text style={styles.reviewNotifSub}>Tap to go to Order History and rate your items.</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setReviewNotif(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={18} color="#92400E" />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ── Account ── */}
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.section}>
          <MenuItem icon="person-outline" label="Manage Profile" onPress={openManageProfile} />
          <View style={styles.separator} />
          <MenuItem icon="lock-closed-outline" label="Password & Security" onPress={() => setPasswordModal(true)} />
        </View>

        {/* ── Orders ── */}
        <Text style={styles.sectionLabel}>Orders</Text>
        <View style={styles.section}>
          <TouchableOpacity style={styles.menuItem} onPress={() => setTrackOrdersModal(true)} activeOpacity={0.7}>
            <View style={styles.menuLeft}>
              <View>
                <Ionicons name="time-outline" size={20} color="#333" />
                {activeOrders.length > 0 && (
                  <View style={styles.notifBadge}>
                    <Text style={styles.notifBadgeText}>{activeOrders.length > 99 ? "99+" : activeOrders.length}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.menuLabel}>Track Orders</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#ccc" />
          </TouchableOpacity>
          <View style={styles.separator} />
          <TouchableOpacity style={styles.menuItem} onPress={() => setOrderHistoryModal(true)} activeOpacity={0.7}>
            <View style={styles.menuLeft}>
              <View>
                <Ionicons name="receipt-outline" size={20} color="#333" />
                {unreviewedOrderCount > 0 && (
                  <View style={styles.notifBadge}>
                    <Text style={styles.notifBadgeText}>{unreviewedOrderCount > 99 ? "99+" : unreviewedOrderCount}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.menuLabel}>Order History</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#ccc" />
          </TouchableOpacity>
        </View>

        {/* ── Logout ── */}
        <View style={styles.section}>
          <MenuItem icon="log-out-outline" label="Logout" onPress={handleLogout} color="#E53935" />
        </View>
        <View style={{ height: 40 }} />
      </View>

      {/* ════ Manage Profile Modal ════ */}
      <Modal visible={manageProfileModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manage Profile</Text>
              <TouchableOpacity onPress={() => setManageProfileModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.avatarPicker} onPress={handlePickPhoto} activeOpacity={0.8}>
              {userPhoto
                ? <Image source={{ uri: userPhoto }} style={styles.avatarLarge} />
                : <View style={styles.avatarLargePlaceholder}><Text style={styles.avatarLargeText}>{editName ? editName[0].toUpperCase() : "?"}</Text></View>}
              <View style={styles.cameraIcon}><Ionicons name="camera" size={16} color="#fff" /></View>
            </TouchableOpacity>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput style={styles.input} value={editName} onChangeText={setEditName} placeholder="Enter your name" placeholderTextColor="#ccc" />
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput style={styles.input} value={editEmail} onChangeText={setEditEmail} placeholder="Enter your email" placeholderTextColor="#ccc" keyboardType="email-address" autoCapitalize="none" />
            <TouchableOpacity style={[styles.saveButton, profileLoading && styles.buttonDisabled]} onPress={handleSaveProfile} disabled={profileLoading}>
              {profileLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ════ Password Modal ════ */}
      <Modal visible={passwordModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={() => { setPasswordModal(false); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            {[
              { label: "Current Password", value: currentPassword, set: setCurrentPassword, show: showCurrent, toggle: () => setShowCurrent(v => !v) },
              { label: "New Password",     value: newPassword,     set: setNewPassword,     show: showNew,     toggle: () => setShowNew(v => !v) },
              { label: "Confirm New",      value: confirmPassword, set: setConfirmPassword, show: showConfirm, toggle: () => setShowConfirm(v => !v) },
            ].map(({ label, value, set, show, toggle }) => (
              <View key={label}>
                <Text style={styles.inputLabel}>{label}</Text>
                <View style={styles.passwordRow}>
                  <TextInput style={styles.passwordInput} value={value} onChangeText={set} placeholder={`Enter ${label.toLowerCase()}`} placeholderTextColor="#ccc" secureTextEntry={!show} />
                  <TouchableOpacity onPress={toggle}><Ionicons name={show ? "eye-off-outline" : "eye-outline"} size={20} color="#999" /></TouchableOpacity>
                </View>
              </View>
            ))}
            <TouchableOpacity style={[styles.saveButton, passwordLoading && styles.buttonDisabled]} onPress={handleChangePassword} disabled={passwordLoading}>
              {passwordLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Change Password</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ════ Track Orders Modal ════ */}
      <Modal visible={trackOrdersModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, styles.modalSheetTall]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Track Orders</Text>
              <TouchableOpacity onPress={() => setTrackOrdersModal(false)}><Ionicons name="close" size={24} color="#333" /></TouchableOpacity>
            </View>
            {activeOrders.length === 0 ? (
              <View style={styles.emptyOrders}>
                <Ionicons name="time-outline" size={60} color="#D4B8A8" />
                <Text style={styles.emptyOrdersText}>No active orders</Text>
                <Text style={styles.emptyOrdersSub}>Active orders appear here</Text>
              </View>
            ) : (
              <FlatList data={activeOrders} keyExtractor={getOrderId} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}
                renderItem={({ item }) => {
                  const isProcessing = item.status === "processing";
                  return (
                    <View style={styles.orderCard}>
                      <View style={styles.orderCardHeader}>
                        {isProcessing ? (
                          <View style={styles.shippingBadge}><View style={styles.shippingDot} /><Text style={styles.shippingBadgeText}>Being Shipped</Text></View>
                        ) : (
                          <View style={styles.processingBadge}><View style={styles.processingDot} /><Text style={styles.processingBadgeText}>Waiting Confirmation</Text></View>
                        )}
                        <Text style={styles.orderDate}>{isProcessing ? "On its way! 📦" : "Waiting for seller..."}</Text>
                      </View>
                      {item.items?.map((p, i) => (
                        <View key={i} style={styles.orderItemRow}>
                          <Text style={styles.orderItemName} numberOfLines={1}>{p.name}</Text>
                          <Text style={styles.orderItemQty}>x{p.quantity}</Text>
                        </View>
                      ))}
                      <View style={styles.orderCardDivider} />
                      <View style={styles.orderTotalsRow}><Text style={styles.orderTotalLabel}>Shipping</Text><Text style={styles.orderTotalValue}>₱{item.shippingFee}</Text></View>
                      <View style={styles.orderTotalsRow}><Text style={styles.orderGrandLabel}>Total</Text><Text style={styles.orderGrandValue}>₱{getTotal(item)}</Text></View>
                      {isProcessing && (
                        <TouchableOpacity style={styles.receivedButton} onPress={() => handleConfirmReceived(item)} activeOpacity={0.85}>
                          <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                          <Text style={styles.receivedButtonText}>Confirm Received</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* ════ Order History Modal ════ */}
      <Modal visible={orderHistoryModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, styles.modalSheetTall]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Order History</Text>
              <TouchableOpacity onPress={() => setOrderHistoryModal(false)}><Ionicons name="close" size={24} color="#333" /></TouchableOpacity>
            </View>
            {unreviewedOrderCount > 0 && (
              <View style={styles.reviewBanner}>
                <Ionicons name="star" size={15} color="#D97706" />
                <Text style={styles.reviewBannerText}>
                  You have {unreviewedOrderCount} item{unreviewedOrderCount > 1 ? "s" : ""} to review! Rate them below.
                </Text>
              </View>
            )}
            {completedOrders.length === 0 ? (
              <View style={styles.emptyOrders}>
                <Ionicons name="receipt-outline" size={60} color="#D4B8A8" />
                <Text style={styles.emptyOrdersText}>No completed orders yet</Text>
                <Text style={styles.emptyOrdersSub}>Completed orders appear here</Text>
              </View>
            ) : (
              <FlatList data={completedOrders} keyExtractor={getOrderId} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}
                renderItem={({ item }) => {
                  const hasUnreviewed = item.items?.some((i) => !i.reviewed);
                  return (
                    <View style={[styles.orderCard, hasUnreviewed && styles.orderCardHighlight]}>
                      <View style={styles.orderCardHeader}>
                        <View style={styles.completedBadge}>
                          <Ionicons name="checkmark-circle" size={12} color="#155724" />
                          <Text style={styles.completedBadgeText}>Completed</Text>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={styles.orderDate}>Ordered: {formatDate(item.createdAt)}</Text>
                          {item.dateReceived && <Text style={styles.orderDate}>Received: {formatDate(item.dateReceived)}</Text>}
                        </View>
                      </View>
                      {item.items?.map((product, index) => (
                        <View key={index} style={styles.itemWithReview}>
                          <View style={styles.orderItemRow}>
                            <Text style={styles.orderItemName} numberOfLines={1}>{product.name}</Text>
                            <Text style={styles.orderItemQty}>x{product.quantity}</Text>
                          </View>
                          {product.reviewed ? (
                            <View style={styles.reviewedTag}>
                              <Ionicons name="checkmark-circle" size={13} color="#15803D" />
                              <Text style={styles.reviewedTagText}>Reviewed ✓</Text>
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={styles.reviewButton}
                              onPress={() => openReview(item, product)}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="star" size={13} color="#F59E0B" />
                              <Text style={styles.reviewButtonText}>Leave a Review</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      ))}
                      <View style={styles.orderCardDivider} />
                      <View style={styles.orderTotalsRow}><Text style={styles.orderTotalLabel}>Shipping</Text><Text style={styles.orderTotalValue}>₱{item.shippingFee}</Text></View>
                      <View style={styles.orderTotalsRow}><Text style={styles.orderGrandLabel}>Total</Text><Text style={styles.orderGrandValue}>₱{getTotal(item)}</Text></View>
                    </View>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* ════ Review Modal ════ */}
      <Modal visible={reviewModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Write a Review</Text>
              <TouchableOpacity onPress={() => setReviewModal(false)} disabled={reviewSubmitting}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <View style={styles.reviewProductTag}>
              <Ionicons name="bag-outline" size={16} color="#5C4033" />
              <Text style={styles.reviewProductName} numberOfLines={2}>{reviewItem?.name}</Text>
            </View>
            <Text style={styles.inputLabel}>Your Rating *</Text>
            <View style={{ marginBottom: 4 }}>
              <StarRating rating={reviewRating} onRate={setReviewRating} size={38} />
              <Text style={styles.ratingLabel}>
                {reviewRating > 0 ? ratingLabels[reviewRating] : "Tap a star to rate"}
              </Text>
            </View>
            <Text style={[styles.inputLabel, { marginTop: 16 }]}>Comment (optional)</Text>
            <TextInput
              style={[styles.input, { height: 100, textAlignVertical: "top" }]}
              value={reviewComment} onChangeText={setReviewComment}
              placeholder="Share your experience with this product..."
              placeholderTextColor="#ccc" multiline maxLength={300}
            />
            <Text style={styles.charCount}>{reviewComment.length}/300</Text>
            <TouchableOpacity
              style={[styles.saveButton, (reviewSubmitting || reviewRating === 0) && styles.buttonDisabled]}
              onPress={handleSubmitReview} disabled={reviewSubmitting || reviewRating === 0} activeOpacity={0.85}
            >
              {reviewSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Submit Review ⭐</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#5C4033" },
  header: { alignItems: "center", paddingTop: 60, paddingBottom: 50, backgroundColor: "#5C4033" },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#fff", justifyContent: "center", alignItems: "center", marginBottom: 12, overflow: "hidden", borderWidth: 3, borderColor: "rgba(255,255,255,0.6)" },
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
  avatarText: { fontSize: 32, fontWeight: "bold", color: "#5C4033" },
  userName: { fontSize: 20, fontWeight: "bold", color: "#fff", marginBottom: 4 },
  userEmail: { fontSize: 13, color: "rgba(255,255,255,0.7)" },
  bodyCard: { backgroundColor: "#FDF6F0", borderTopLeftRadius: 30, borderTopRightRadius: 30, marginTop: -24, paddingTop: 28, flexGrow: 1 },
  sectionLabel: { fontSize: 13, fontWeight: "600", color: "#999", paddingHorizontal: 20, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 },
  section: { backgroundColor: "#fff", marginHorizontal: 20, borderRadius: 16, marginBottom: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  menuItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 },
  menuLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  menuLabel: { fontSize: 15, color: "#333" },
  menuRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  badge: { backgroundColor: "#FDF6F0", borderWidth: 1, borderColor: "#D4B8A8", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: "600", color: "#5C4033" },
  separator: { height: 1, backgroundColor: "#F5F5F5", marginHorizontal: 16 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  modalSheetTall: { maxHeight: "88%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#333" },
  avatarPicker: { alignSelf: "center", marginBottom: 24, position: "relative" },
  avatarLarge: { width: 90, height: 90, borderRadius: 45 },
  avatarLargePlaceholder: { width: 90, height: 90, borderRadius: 45, backgroundColor: "#5C4033", justifyContent: "center", alignItems: "center" },
  avatarLargeText: { fontSize: 36, fontWeight: "bold", color: "#fff" },
  cameraIcon: { position: "absolute", bottom: 0, right: 0, backgroundColor: "#5C4033", borderRadius: 16, padding: 6, borderWidth: 2, borderColor: "#fff" },
  inputLabel: { fontSize: 13, fontWeight: "600", color: "#999", marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: "#F5F0EC", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, color: "#333", marginBottom: 14 },
  passwordRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#F5F0EC", borderRadius: 12, paddingHorizontal: 16, marginBottom: 14 },
  passwordInput: { flex: 1, paddingVertical: 13, fontSize: 15, color: "#333" },
  saveButton: { backgroundColor: "#5C4033", borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 8 },
  buttonDisabled: { backgroundColor: "#ccc" },
  saveButtonText: { color: "#fff", fontSize: 15, fontWeight: "bold" },
  emptyOrders: { alignItems: "center", paddingVertical: 60, gap: 8 },
  emptyOrdersText: { fontSize: 15, color: "#999", fontWeight: "600" },
  emptyOrdersSub: { fontSize: 13, color: "#ccc" },
  reviewBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14 },
  reviewBannerText: { fontSize: 13, color: "#D97706", fontWeight: "600", flex: 1 },
  orderCard: { backgroundColor: "#FDF6F0", borderRadius: 16, padding: 16, marginBottom: 14 },
  orderCardHighlight: { borderWidth: 1.5, borderColor: "#FDE68A" },
  orderCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  processingBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#F1F5F9", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  processingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#94A3B8" },
  processingBadgeText: { fontSize: 12, fontWeight: "600", color: "#64748B" },
  shippingBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FFF7ED", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  shippingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#F97316" },
  shippingBadgeText: { fontSize: 12, fontWeight: "600", color: "#C2410C" },
  completedBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#D4EDDA", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  completedBadgeText: { fontSize: 12, fontWeight: "600", color: "#155724" },
  orderDate: { fontSize: 12, color: "#999" },
  itemWithReview: { marginBottom: 8 },
  orderItemRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  orderItemName: { fontSize: 14, color: "#333", fontWeight: "500", flex: 1, marginRight: 8 },
  orderItemQty: { fontSize: 13, color: "#999" },
  orderCardDivider: { height: 1, backgroundColor: "#E8D5B7", marginVertical: 10 },
  orderTotalsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  orderTotalLabel: { fontSize: 13, color: "#999" },
  orderTotalValue: { fontSize: 13, color: "#333", fontWeight: "600" },
  orderGrandLabel: { fontSize: 15, fontWeight: "bold", color: "#333" },
  orderGrandValue: { fontSize: 15, fontWeight: "bold", color: "#5C4033" },
  receivedButton: { backgroundColor: "#5C4033", borderRadius: 12, paddingVertical: 12, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 12 },
  receivedButtonText: { color: "#fff", fontSize: 14, fontWeight: "bold" },
  reviewButton: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignSelf: "flex-start", marginBottom: 2 },
  reviewButtonText: { fontSize: 12, fontWeight: "700", color: "#D97706" },
  reviewedTag: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4, alignSelf: "flex-start" },
  reviewedTagText: { fontSize: 12, color: "#15803D", fontWeight: "600" },
  reviewProductTag: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#FDF6F0", borderRadius: 10, padding: 12, marginBottom: 20, borderWidth: 1, borderColor: "#EDD9CC" },
  reviewProductName: { fontSize: 14, fontWeight: "700", color: "#5C4033", flex: 1, lineHeight: 20 },
  ratingLabel: { fontSize: 13, color: "#F59E0B", fontWeight: "700", marginTop: 8, minHeight: 20 },
  charCount: { fontSize: 11, color: "#94A3B8", textAlign: "right", marginTop: -10, marginBottom: 14 },
  notifBadge: { position: "absolute", top: -5, right: -6, backgroundColor: "#E53935", borderRadius: 10, minWidth: 16, height: 16, justifyContent: "center", alignItems: "center", paddingHorizontal: 3 },
  notifBadgeText: { color: "#fff", fontSize: 9, fontWeight: "bold" },
  reviewNotifBanner: { flexDirection: "row", alignItems: "center", backgroundColor: "#FEF3C7", borderWidth: 1.5, borderColor: "#F59E0B", borderRadius: 16, marginHorizontal: 20, marginBottom: 20, padding: 14, gap: 10 },
  reviewNotifInner: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  reviewNotifIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#FDE68A", justifyContent: "center", alignItems: "center", flexShrink: 0 },
  reviewNotifTitle: { fontSize: 13, fontWeight: "800", color: "#92400E", marginBottom: 2 },
  reviewNotifSub: { fontSize: 11, color: "#B45309", lineHeight: 15 },
});