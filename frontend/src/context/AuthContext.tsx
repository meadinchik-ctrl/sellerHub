import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, getStoredToken, setStoredToken, removeStoredToken, getStoredStoreId, setStoredStoreId } from '../services/api';

export interface User {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  is_active: boolean;
  is_verified: boolean;
  is_admin: boolean;
  linked_providers: string[];
  created_at: string;
}

export interface Store {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  default_currency: string;
  theme_color: string;
  catalog_mode: string;
  business_type?: string;
  enabled_features?: Record<string, boolean>;
  is_published: boolean;
  contact_telegram: string | null;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  contact_email: string | null;
  total_products: number;
  role: string;
}

interface AuthContextType {
  user: User | null;
  stores: Store[];
  activeStore: Store | null;
  loading: boolean;
  setActiveStore: (store: Store) => void;
  loginWithTokens: (accessToken: string, userData: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshStores: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [activeStore, setActiveStoreState] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  const setActiveStore = (store: Store) => {
    setActiveStoreState(store);
    setStoredStoreId(store.id);
  };

  const refreshStores = async () => {
    try {
      const storeList: Store[] = await api.getStores();
      setStores(storeList);
      if (storeList.length > 0) {
        const storedId = getStoredStoreId();
        const found = storeList.find(s => s.id === storedId);
        if (found) {
          setActiveStoreState(found);
        } else {
          setActiveStore(storeList[0]);
        }
      }
    } catch (e) {
      console.error('Failed to fetch stores', e);
    }
  };

  const refreshProfile = async () => {
    // If the user explicitly logged out in this browser session, do not auto-restore session
    if (sessionStorage.getItem('sellerhub_logged_out') === '1') {
      setUser(null);
      setStores([]);
      setActiveStoreState(null);
      setLoading(false);
      return;
    }

    try {
      // Even if getStoredToken() is empty, persistent HttpOnly cookie may be present in browser
      const userData = await api.getMe();
      setUser(userData);
      await refreshStores();
    } catch (e) {
      removeStoredToken();
      setUser(null);
      setStores([]);
      setActiveStoreState(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (e) {
      console.error('Logout error', e);
    }
    sessionStorage.setItem('sellerhub_logged_out', '1');
    removeStoredToken();
    localStorage.removeItem('sellerhub_active_store_id');
    setUser(null);
    setStores([]);
    setActiveStoreState(null);
    window.location.replace('/auth');
  };

  const loginWithTokens = async (accessToken: string, userData: any) => {
    sessionStorage.removeItem('sellerhub_logged_out');
    setStoredToken(accessToken);
    setUser(userData);
    await refreshStores();
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        stores,
        activeStore,
        loading,
        setActiveStore,
        loginWithTokens,
        logout,
        refreshProfile,
        refreshStores,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
