import React, { createContext, useContext, useState } from "react";

type Product = {
  id?: string;       // may be undefined for MongoDB products
  _id?: string;      // MongoDB ObjectId
  productId?: string;
  name: string;
  price: string | number;
  image: string;
  category: string;
  stock?: number;
  sold?: number;
  rating?: string | number;
  [key: string]: any; // allow extra MongoDB fields
};

type CartItem = Product & { quantity: number };

type CartContextType = {
  cartItems: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  cartCount: number;
};

// ✅ FIX: consistent ID resolution — MongoDB uses _id, not id
const resolveId = (item: Product | CartItem): string =>
  (item._id || item.id || item.productId || "") as string;

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const addToCart = (product: Product) => {
    const productId = resolveId(product);
    setCartItems((prev) => {
      const existing = prev.find((item) => resolveId(item) === productId);
      if (existing) {
        return prev.map((item) =>
          resolveId(item) === productId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCartItems((prev) => prev.filter((item) => resolveId(item) !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) =>
        resolveId(item) === id ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => setCartItems([]);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{ cartItems, addToCart, removeFromCart, updateQuantity, clearCart, cartCount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}