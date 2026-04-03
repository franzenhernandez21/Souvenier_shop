import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  Image,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../../config/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  increment,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  getDocs,
  Unsubscribe,
} from "firebase/firestore";
import {
  signOut,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  User,
} from "firebase/auth";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";

/* ─── Types ──────────────────────────────────────────────── */
interface OrderItem {
  id: string;
  productId?: string;
  name: string;
  quantity: number;
  reviewed?: boolean;
}

interface Order {
  id: string;
  userId: string;
  status: string;
  items: OrderItem[];
  shippingFee: number;
  grandTotal?: number;
  totalPrice?: number;
  createdAt?: { toDate: () => Date };
  dateReceived?: { toDate: () => Date };
}

const getProductId = (item: OrderItem): string =>
  item.productId || item.id || "";

/* ─── Star Rating Component ─────────────────────────────── */
interface StarRatingProps {
  rating: number;
  onRate: (star: number) => void;
  size?: number;
}

function StarRating({ rating, onRate, size = 32 }: StarRatingProps) {
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <TouchableOpacity key={s} onPress={() => onRate(s)}>
          <Text style={{ fontSize: size, color: s <= rating ? "#F59E0B" : "#E5E7EB" }}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function ProfileScreen() {
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [userPhoto, setUserPhoto] = useState<string>("");
  const router = useRouter();

  const [manageProfileModal, setManageProfileModal] = useState(false);
  const [passwordModal, setPasswordModal] = useState(false);
  const [trackOrdersModal, setTrackOrdersModal] = useState(false);
  const [orderHistoryModal, setOrderHistoryModal] = useState(false);

  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // ✅ activeOrders = pending + processing combined
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [completedLoading, setCompletedLoading] = useState(false);

  /* ─── Review State ─── */
  const [reviewModal, setReviewModal] = useState(false);
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [reviewItem, setReviewItem] = useState<OrderItem | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const completedUnsub = React.useRef<Unsubscribe | null>(null);

  const unreviewedOrderCount = completedOrders.filter((o) =>
    o.items?.some((i) => !i.reviewed && getProductId(i))
  ).length;

  useEffect(() => {
    fetchUser();
    const user = auth.currentUser;
    if (!user) return;

    // ✅ Listen to both pending AND processing orders
    const activeQ = query(
      collection(db, "orders"),
      where("userId", "==", user.uid),
      where("status", "in", ["pending", "processing"])
    );
    const unsubActive = onSnapshot(activeQ, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
      // Sort: processing first, then pending
      data.sort((a, b) => {
        if (a.status === "processing" && b.status === "pending") return -1;
        if (a.status === "pending" && b.status === "processing") return 1;
        return 0;
      });
      setActiveOrders(data);
    });

    const completedQ = query(
      collection(db, "orders"),
      where("userId", "==", user.uid),
      where("status", "==", "completed")
    );
    const unsubCompleted = onSnapshot(completedQ, (snap) => {
      setCompletedOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order)));
    });

    return () => {
      unsubActive();
      unsubCompleted();
    };
  }, []);

  const fetchUser = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      setUserEmail(user.email ?? "");
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserName(data.name ?? "");
        setUserPhoto(data.photoURL ?? "");
      }
    } catch (e) {
      console.log("fetchUser error:", (e as Error).message);
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await signOut(auth);
          router.replace("/login");
        },
      },
    ]);
  };

  const openManageProfile = () => {
    setEditName(userName);
    setEditEmail(userEmail);
    setManageProfileModal(true);
  };

  const handlePickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "Please allow access to your photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) setUserPhoto(result.assets[0].uri);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert("Error", "Name cannot be empty.");
      return;
    }
    setProfileLoading(true);
    try {
      const user = auth.currentUser as User;
      await updateDoc(doc(db, "users", user.uid), {
        name: editName.trim(),
        email: editEmail.trim(),
        photoURL: userPhoto,
      });
      setUserName(editName.trim());
      setUserEmail(editEmail.trim());
      setManageProfileModal(false);
      Alert.alert("Success", "Profile updated successfully!");
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    }
    setProfileLoading(false);
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters.");
      return;
    }
    setPasswordLoading(true);
    try {
      const user = auth.currentUser as User;
      const credential = EmailAuthProvider.credential(user.email as string, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setPasswordModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      Alert.alert("Success", "Password changed successfully!");
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    }
    setPasswordLoading(false);
  };

  /* ─── Confirm received (only for processing orders) ─────── */
  const handleConfirmReceived = async (order: Order) => {
    Alert.alert("Confirm Receipt", "Have you received your order?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Yes, Received",
        onPress: async () => {
          try {
            await updateDoc(doc(db, "orders", order.id), {
              status: "completed",
              dateReceived: serverTimestamp(),
            });
            await Promise.all(
              (order.items ?? []).map((item) => {
                const pid = getProductId(item);
                if (!pid) return Promise.resolve();
                return updateDoc(doc(db, "products", pid), {
                  sold: increment(item.quantity),
                });
              })
            );
            Alert.alert(
              "Thank you!",
              "Order marked as received. You can now leave a review in Order History!"
            );
          } catch (e) {
            Alert.alert("Error", (e as Error).message);
          }
        },
      },
    ]);
  };

  const openReview = (order: Order, item: OrderItem) => {
    setReviewOrder(order);
    setReviewItem(item);
    setReviewRating(0);
    setReviewComment("");
    setReviewModal(true);
  };

  const handleSubmitReview = async () => {
    if (reviewRating === 0) {
      Alert.alert("Rating required", "Please select a star rating before submitting.");
      return;
    }
    if (!reviewItem || !reviewOrder) return;
    const productId = getProductId(reviewItem);
    if (!productId) {
      Alert.alert("Error", "Could not identify the product.");
      return;
    }
    setReviewSubmitting(true);
    try {
      const user = auth.currentUser as User;
      await addDoc(collection(db, "reviews"), {
        productId,
        userId: user.uid,
        userName: userName || user.email,
        userPhoto: userPhoto || "",
        orderId: reviewOrder.id,
        rating: reviewRating,
        comment: reviewComment.trim(),
        createdAt: serverTimestamp(),
      });
      const reviewsSnap = await getDocs(
        query(collection(db, "reviews"), where("productId", "==", productId))
      );
      const allRatings = reviewsSnap.docs.map((d) => d.data().rating as number);
      const avgRating = allRatings.reduce((a, b) => a + b, 0) / allRatings.length;
      await updateDoc(doc(db, "products", productId), {
        rating: parseFloat(avgRating.toFixed(1)),
      });
      const updatedItems: OrderItem[] = reviewOrder.items.map((i) =>
        getProductId(i) === productId ? { ...i, reviewed: true } : i
      );
      await updateDoc(doc(db, "orders", reviewOrder.id), { items: updatedItems });
      setCompletedOrders((prev) =>
        prev.map((o) =>
          o.id === reviewOrder.id ? { ...o, items: updatedItems } : o
        )
      );
      setReviewModal(false);
      Alert.alert("Thank you!", "Your review has been submitted.");
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    }
    setReviewSubmitting(false);
  };

  /* ─── MenuItem ───────────────────────────────────────────── */
  interface MenuItemProps {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
    color?: string;
    badge?: string | number;
  }

  const MenuItem = ({ icon, label, onPress, color = "#333", badge }: MenuItemProps) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuLeft}>
        <Ionicons name={icon} size={20} color={color} />
        <Text style={[styles.menuLabel, { color }]}>{label}</Text>
      </View>
      <View style={styles.menuRight}>
        {badge !== undefined && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={16} color="#ccc" />
      </View>
    </TouchableOpacity>
  );

  const getTotal = (order: Order) => order.grandTotal ?? order.totalPrice ?? 0;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ flexGrow: 1 }}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          {userPhoto ? (
            <Image source={{ uri: userPhoto }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>
              {userName ? userName.charAt(0).toUpperCase() : "?"}
            </Text>
          )}
        </View>
        <Text style={styles.userName}>{userName || "User"}</Text>
        <Text style={styles.userEmail}>{userEmail}</Text>
      </View>

      <View style={styles.bodyCard}>
        {/* Account */}
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.section}>
          <MenuItem icon="person-outline" label="Manage Profile" onPress={openManageProfile} />
          <View style={styles.separator} />
          <MenuItem
            icon="lock-closed-outline"
            label="Password & Security"
            onPress={() => setPasswordModal(true)}
          />
        </View>

        {/* Orders */}
        <Text style={styles.sectionLabel}>Orders</Text>
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setTrackOrdersModal(true)}
          >
            <View style={styles.menuLeft}>
              <View>
                <Ionicons name="time-outline" size={20} color="#333" />
                {activeOrders.length > 0 && (
                  <View style={styles.notifBadge}>
                    <Text style={styles.notifBadgeText}>
                      {activeOrders.length > 99 ? "99+" : activeOrders.length}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.menuLabel}>Track Orders</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#ccc" />
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setOrderHistoryModal(true)}
          >
            <View style={styles.menuLeft}>
              <View>
                <Ionicons name="receipt-outline" size={20} color="#333" />
                {unreviewedOrderCount > 0 && (
                  <View style={styles.notifBadge}>
                    <Text style={styles.notifBadgeText}>
                      {unreviewedOrderCount > 99 ? "99+" : unreviewedOrderCount}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.menuLabel}>Order History</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#ccc" />
          </TouchableOpacity>
        </View>

        {/* Logout */}
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
            <TouchableOpacity style={styles.avatarPicker} onPress={handlePickPhoto}>
              {userPhoto ? (
                <Image source={{ uri: userPhoto }} style={styles.avatarLarge} />
              ) : (
                <View style={styles.avatarLargePlaceholder}>
                  <Text style={styles.avatarLargeText}>
                    {editName ? editName.charAt(0).toUpperCase() : "?"}
                  </Text>
                </View>
              )}
              <View style={styles.cameraIcon}>
                <Ionicons name="camera" size={16} color="#fff" />
              </View>
            </TouchableOpacity>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              placeholder="Enter your name"
              placeholderTextColor="#ccc"
            />
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={editEmail}
              onChangeText={setEditEmail}
              placeholder="Enter your email"
              placeholderTextColor="#ccc"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[styles.saveButton, profileLoading && styles.buttonDisabled]}
              onPress={handleSaveProfile}
              disabled={profileLoading}
            >
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
            <Text style={styles.inputLabel}>Current Password</Text>
            <View style={styles.passwordRow}>
              <TextInput style={styles.passwordInput} value={currentPassword} onChangeText={setCurrentPassword} placeholder="Enter current password" placeholderTextColor="#ccc" secureTextEntry={!showCurrent} />
              <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)}>
                <Ionicons name={showCurrent ? "eye-off-outline" : "eye-outline"} size={20} color="#999" />
              </TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>New Password</Text>
            <View style={styles.passwordRow}>
              <TextInput style={styles.passwordInput} value={newPassword} onChangeText={setNewPassword} placeholder="Enter new password" placeholderTextColor="#ccc" secureTextEntry={!showNew} />
              <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                <Ionicons name={showNew ? "eye-off-outline" : "eye-outline"} size={20} color="#999" />
              </TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>Confirm New Password</Text>
            <View style={styles.passwordRow}>
              <TextInput style={styles.passwordInput} value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirm new password" placeholderTextColor="#ccc" secureTextEntry={!showConfirm} />
              <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={20} color="#999" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.saveButton, passwordLoading && styles.buttonDisabled]}
              onPress={handleChangePassword}
              disabled={passwordLoading}
            >
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
              <TouchableOpacity onPress={() => setTrackOrdersModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {activeOrders.length === 0 ? (
              <View style={styles.emptyOrders}>
                <Ionicons name="time-outline" size={60} color="#D4B8A8" />
                <Text style={styles.emptyOrdersText}>No active orders</Text>
              </View>
            ) : (
              <FlatList
                data={activeOrders}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
                renderItem={({ item }) => {
                  const isProcessing = item.status === "processing";
                  return (
                    <View style={styles.orderCard}>
                      <View style={styles.orderCardHeader}>
                        {/* ✅ Dynamic status badge */}
                        {isProcessing ? (
                          <View style={styles.shippingBadge}>
                            <View style={styles.shippingDot} />
                            <Text style={styles.shippingBadgeText}>Being Shipped</Text>
                          </View>
                        ) : (
                          <View style={styles.processingBadge}>
                            <View style={styles.processingDot} />
                            <Text style={styles.processingBadgeText}>Waiting Confirmation</Text>
                          </View>
                        )}
                        <Text style={styles.orderDate}>
                          {isProcessing ? "On its way!" : "Waiting for seller..."}
                        </Text>
                      </View>

                      {item.items?.map((product, index) => (
                        <View key={index} style={styles.orderItemRow}>
                          <Text style={styles.orderItemName} numberOfLines={1}>{product.name}</Text>
                          <Text style={styles.orderItemQty}>x{product.quantity}</Text>
                        </View>
                      ))}

                      <View style={styles.orderCardDivider} />
                      <View style={styles.orderTotalsRow}>
                        <Text style={styles.orderTotalLabel}>Shipping</Text>
                        <Text style={styles.orderTotalValue}>₱{item.shippingFee}</Text>
                      </View>
                      <View style={styles.orderTotalsRow}>
                        <Text style={styles.orderGrandLabel}>Total</Text>
                        <Text style={styles.orderGrandValue}>₱{getTotal(item)}</Text>
                      </View>

                      {/* ✅ Confirm Received only shows when processing */}
                      {isProcessing && (
                        <TouchableOpacity
                          style={styles.receivedButton}
                          onPress={() => handleConfirmReceived(item)}
                        >
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
              <TouchableOpacity onPress={() => { setOrderHistoryModal(false); completedUnsub.current?.(); completedUnsub.current = null; }}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {unreviewedOrderCount > 0 && (
              <View style={styles.reviewBanner}>
                <Ionicons name="star" size={15} color="#D97706" />
                <Text style={styles.reviewBannerText}>
                  {unreviewedOrderCount} order{unreviewedOrderCount > 1 ? "s" : ""} waiting for your review!
                </Text>
              </View>
            )}

            {completedOrders.length === 0 ? (
              <View style={styles.emptyOrders}>
                <Ionicons name="receipt-outline" size={60} color="#D4B8A8" />
                <Text style={styles.emptyOrdersText}>No completed orders yet</Text>
              </View>
            ) : (
              <FlatList
                data={completedOrders}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
                renderItem={({ item }) => {
                  const hasUnreviewed = item.items?.some(
                    (i) => !i.reviewed && getProductId(i)
                  );
                  return (
                    <View style={[styles.orderCard, hasUnreviewed && styles.orderCardHighlight]}>
                      <View style={styles.orderCardHeader}>
                        <View style={styles.completedBadge}>
                          <Text style={styles.completedBadgeText}>Completed</Text>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={styles.orderDate}>
                            Ordered: {item.createdAt?.toDate?.().toLocaleDateString("en-PH")}
                          </Text>
                          {item.dateReceived?.toDate && (
                            <Text style={styles.orderDate}>
                              Received: {item.dateReceived.toDate().toLocaleDateString("en-PH")}
                            </Text>
                          )}
                        </View>
                      </View>

                      {item.items?.map((product, index) => {
                        const pid = getProductId(product);
                        return (
                          <View key={index} style={styles.itemWithReview}>
                            <View style={styles.orderItemRow}>
                              <Text style={styles.orderItemName} numberOfLines={1}>
                                {product.name}
                              </Text>
                              <Text style={styles.orderItemQty}>x{product.quantity}</Text>
                            </View>
                            {product.reviewed ? (
                              <View style={styles.reviewedTag}>
                                <Ionicons name="checkmark-circle" size={13} color="#15803D" />
                                <Text style={styles.reviewedTagText}>Reviewed</Text>
                              </View>
                            ) : pid ? (
                              <TouchableOpacity
                                style={styles.reviewButton}
                                onPress={() => openReview(item, product)}
                              >
                                <Ionicons name="star" size={13} color="#F59E0B" />
                                <Text style={styles.reviewButtonText}>Leave a Review</Text>
                              </TouchableOpacity>
                            ) : null}
                          </View>
                        );
                      })}

                      <View style={styles.orderCardDivider} />
                      <View style={styles.orderTotalsRow}>
                        <Text style={styles.orderTotalLabel}>Shipping</Text>
                        <Text style={styles.orderTotalValue}>₱{item.shippingFee}</Text>
                      </View>
                      <View style={styles.orderTotalsRow}>
                        <Text style={styles.orderGrandLabel}>Total</Text>
                        <Text style={styles.orderGrandValue}>₱{getTotal(item)}</Text>
                      </View>
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
              <TouchableOpacity onPress={() => setReviewModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <View style={styles.reviewProductTag}>
              <Ionicons name="bag-outline" size={16} color="#5C4033" />
              <Text style={styles.reviewProductName} numberOfLines={1}>
                {reviewItem?.name}
              </Text>
            </View>
            <Text style={styles.inputLabel}>Your Rating *</Text>
            <View style={{ marginBottom: 20 }}>
              <StarRating rating={reviewRating} onRate={setReviewRating} size={36} />
              {reviewRating > 0 && (
                <Text style={styles.ratingLabel}>
                  {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][reviewRating]}
                </Text>
              )}
            </View>
            <Text style={styles.inputLabel}>Comment (optional)</Text>
            <TextInput
              style={[styles.input, { height: 100, textAlignVertical: "top" }]}
              value={reviewComment}
              onChangeText={setReviewComment}
              placeholder="Share your experience with this product..."
              placeholderTextColor="#ccc"
              multiline
              maxLength={300}
            />
            <Text style={styles.charCount}>{reviewComment.length}/300</Text>
            <TouchableOpacity
              style={[styles.saveButton, (reviewSubmitting || reviewRating === 0) && styles.buttonDisabled]}
              onPress={handleSubmitReview}
              disabled={reviewSubmitting || reviewRating === 0}
            >
              {reviewSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Submit Review</Text>}
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
  modalSheetTall: { maxHeight: "85%" },
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
  emptyOrders: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyOrdersText: { fontSize: 15, color: "#999" },
  reviewBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14 },
  reviewBannerText: { fontSize: 13, color: "#D97706", fontWeight: "600", flex: 1 },
  orderCard: { backgroundColor: "#FDF6F0", borderRadius: 16, padding: 16, marginBottom: 14 },
  orderCardHighlight: { borderWidth: 1.5, borderColor: "#FDE68A" },
  orderCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  // Pending — gray/blue: waiting for seller confirmation
  processingBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#F1F5F9", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  processingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#94A3B8" },
  processingBadgeText: { fontSize: 12, fontWeight: "600", color: "#64748B" },
  // Processing — orange: being shipped
  shippingBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FFF7ED", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  shippingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#F97316" },
  shippingBadgeText: { fontSize: 12, fontWeight: "600", color: "#C2410C" },
  completedBadge: { backgroundColor: "#D4EDDA", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  completedBadgeText: { fontSize: 12, fontWeight: "600", color: "#155724" },
  orderDate: { fontSize: 12, color: "#999" },
  itemWithReview: { marginBottom: 6 },
  orderItemRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
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
  reviewButton: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignSelf: "flex-start", marginBottom: 4 },
  reviewButtonText: { fontSize: 12, fontWeight: "700", color: "#D97706" },
  reviewedTag: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4, alignSelf: "flex-start" },
  reviewedTagText: { fontSize: 12, color: "#15803D", fontWeight: "600" },
  reviewProductTag: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FDF6F0", borderRadius: 10, padding: 12, marginBottom: 20, borderWidth: 1, borderColor: "#EDD9CC" },
  reviewProductName: { fontSize: 14, fontWeight: "700", color: "#5C4033", flex: 1 },
  ratingLabel: { fontSize: 13, color: "#F59E0B", fontWeight: "700", marginTop: 6 },
  charCount: { fontSize: 11, color: "#94A3B8", textAlign: "right", marginTop: -10, marginBottom: 14 },
  notifBadge: { position: "absolute", top: -5, right: -6, backgroundColor: "#E53935", borderRadius: 10, minWidth: 16, height: 16, justifyContent: "center", alignItems: "center", paddingHorizontal: 3 },
  notifBadgeText: { color: "#fff", fontSize: 9, fontWeight: "bold" },
});