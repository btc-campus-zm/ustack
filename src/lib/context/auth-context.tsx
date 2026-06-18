import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getMe } from "@/lib/api/auth.functions";

export interface AuthUser {
  id: string;
  username: string;
  email: string;
}

export interface AuthProfile {
  display_name: string;
  avatar_initials: string;
  avatar_color: string;
  profile_picture_url: string | null;
  biometric_enabled: boolean;
  notification_preferences: Record<string, boolean>;
}

interface AuthState {
  user: AuthUser | null;
  profile: AuthProfile | null;
  token: string | null;
  refreshToken: string | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (accessToken: string, refreshToken: string, user: AuthUser) => void;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null, profile: null, token: null, refreshToken: null, loading: true,
  login: () => {}, logout: () => {}, refreshProfile: async () => {},
  isAuthenticated: false,
});

const STORAGE_KEY_TOKEN = "ustack_token";
const STORAGE_KEY_REFRESH = "ustack_refresh";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null, profile: null,
    token: null, refreshToken: null,
    loading: true,
  });

  const applyToken = useCallback(async (token: string, refreshToken: string) => {
    try {
      const data = await getMe({ data: { token } });
      setState({
        user: data.user as AuthUser,
        profile: data.profile as AuthProfile,
        token,
        refreshToken,
        loading: false,
      });
    } catch {
      localStorage.removeItem(STORAGE_KEY_TOKEN);
      localStorage.removeItem(STORAGE_KEY_REFRESH);
      setState({ user: null, profile: null, token: null, refreshToken: null, loading: false });
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEY_TOKEN);
    const refresh = localStorage.getItem(STORAGE_KEY_REFRESH);
    if (token && refresh) {
      applyToken(token, refresh);
    } else {
      setState((s) => ({ ...s, loading: false }));
    }
  }, [applyToken]);

  const login = useCallback((accessToken: string, refreshToken: string, user: AuthUser) => {
    localStorage.setItem(STORAGE_KEY_TOKEN, accessToken);
    localStorage.setItem(STORAGE_KEY_REFRESH, refreshToken);
    // Mark as fresh login so lock screen is skipped this session
    sessionStorage.setItem("ustack_fresh_login", "1");
    setState((s) => ({ ...s, user, token: accessToken, refreshToken, loading: false }));
    getMe({ data: { token: accessToken } }).then((data) => {
      setState((s) => ({ ...s, profile: data.profile as AuthProfile }));
    }).catch(() => {});
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_REFRESH);
    setState({ user: null, profile: null, token: null, refreshToken: null, loading: false });
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!state.token) return;
    const data = await getMe({ data: { token: state.token } });
    setState((s) => ({ ...s, profile: data.profile as AuthProfile }));
  }, [state.token]);

  return (
    <AuthContext.Provider value={{
      ...state,
      login, logout, refreshProfile,
      isAuthenticated: !!state.user && !!state.token,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
