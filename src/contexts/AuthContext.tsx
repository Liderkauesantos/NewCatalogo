import React, { createContext, useContext, useEffect, useState } from "react";
import api from "@/lib/api";

interface AuthUser {
  user_id: string;
  tenant_id: string;
  tenant_slug: string;
  display_name: string;
  logo_url: string | null;
  primary_color: string;
  role: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function parseJwtPayload(token: string): Record<string, any> | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

function loadUserFromStorage(): AuthUser | null {
  const token = localStorage.getItem('nc_token');
  if (!token) return null;

  const payload = parseJwtPayload(token);
  if (!payload) return null;

  // Check expiry
  if (payload.exp && payload.exp * 1000 < Date.now()) {
    localStorage.removeItem('nc_token');
    return null;
  }

  return {
    user_id: payload.user_id,
    tenant_id: payload.tenant_id,
    tenant_slug: payload.tenant_slug ?? localStorage.getItem('nc_tenant_slug') ?? '',
    display_name: localStorage.getItem('nc_display_name') ?? '',
    logo_url: localStorage.getItem('nc_logo_url') ?? null,
    primary_color: localStorage.getItem('nc_primary_color') ?? '#000000',
    role: payload.role ?? 'admin',
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setUser(loadUserFromStorage());
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<AuthUser> => {
    const { data } = await api.post('/rpc/login', {
      p_email: email,
      p_password: password,
    });

    const result = data;

    localStorage.setItem('nc_token', result.token);
    localStorage.setItem('nc_tenant_slug', result.tenant_slug);
    localStorage.setItem('nc_display_name', result.display_name);
    localStorage.setItem('nc_logo_url', result.logo_url ?? '');
    localStorage.setItem('nc_primary_color', result.primary_color ?? '#000000');

    const payload = parseJwtPayload(result.token);

    const authUser: AuthUser = {
      user_id: payload?.user_id ?? '',
      tenant_id: payload?.tenant_id ?? '',
      tenant_slug: result.tenant_slug,
      display_name: result.display_name,
      logo_url: result.logo_url,
      primary_color: result.primary_color,
      role: result.role ?? 'admin',
    };

    setUser(authUser);
    return authUser;
  };

  const signOut = () => {
    localStorage.removeItem('nc_token');
    localStorage.removeItem('nc_tenant_slug');
    localStorage.removeItem('nc_display_name');
    localStorage.removeItem('nc_logo_url');
    localStorage.removeItem('nc_primary_color');
    setUser(null);
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, isAdmin, isLoading, login, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
