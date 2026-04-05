import React, { createContext, useContext, useState } from "react";

type Product = {
  id: string;
  _id?: string;
  name: string;
  price: string;
  image: string;
  category: string;
  rating: string;
};

type FavoritesContextType = {
  favorites: Product[];
  toggleFavorite: (product: Product) => void;
  isFavorite: (id: string) => boolean;
};

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<Product[]>([]);

  const toggleFavorite = (product: Product) => {
    const productId = product._id || product.id;
    setFavorites((prev) =>
      prev.find((p) => (p._id || p.id) === productId)
        ? prev.filter((p) => (p._id || p.id) !== productId)
        : [...prev, product]
    );
  };

  const isFavorite = (id: string) =>
    favorites.some((p) => p.id === id || p._id === id);

  return (
    <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error("useFavorites must be used within FavoritesProvider");
  return context;
}