import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface UserPrefsContextType {
  favorites: string[];
  compare: string[];
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  toggleCompare: (id: string) => void;
  removeFromCompare: (id: string) => void;
  isInCompare: (id: string) => boolean;
  clearCompare: () => void;
}

const UserPrefsContext = createContext<UserPrefsContextType | null>(null);

function load<T>(key: string, def: T): T {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : def; } catch { return def; }
}
function save<T>(key: string, val: T) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

export function UserPrefsProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>(() => load("alamoudi_favorites", []));
  const [compare, setCompare] = useState<string[]>(() => load("alamoudi_compare", []));

  useEffect(() => { save("alamoudi_favorites", favorites); }, [favorites]);
  useEffect(() => { save("alamoudi_compare", compare); }, [compare]);

  const toggleFavorite = (id: string) =>
    setFavorites(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const isFavorite = (id: string) => favorites.includes(id);

  const toggleCompare = (id: string) =>
    setCompare(p => {
      if (p.includes(id)) return p.filter(x => x !== id);
      if (p.length >= 3) return p;
      return [...p, id];
    });
  const removeFromCompare = (id: string) => setCompare(p => p.filter(x => x !== id));
  const isInCompare = (id: string) => compare.includes(id);
  const clearCompare = () => setCompare([]);

  return (
    <UserPrefsContext.Provider value={{ favorites, compare, toggleFavorite, isFavorite, toggleCompare, removeFromCompare, isInCompare, clearCompare }}>
      {children}
    </UserPrefsContext.Provider>
  );
}

export function useUserPrefs(): UserPrefsContextType {
  const ctx = useContext(UserPrefsContext);
  if (!ctx) throw new Error("useUserPrefs must be inside UserPrefsProvider");
  return ctx;
}
