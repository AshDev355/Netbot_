"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import * as api from "@/lib/api";
import { getToken, setToken as persistToken } from "@/lib/api";
import { decodeGoogleEmail } from "@/lib/auth";

export type AuthUser = { id: string; email: string };

/** Fields collected on the "account" step of signup, before face capture. */
export type PendingSignup = { email: string; password: string };

type AuthContextValue = {
  authed: boolean;
  ready: boolean;
  user: AuthUser | null;
  pendingSignup: PendingSignup | null;
  /** Step 1 of signup: stash email/password, move to face capture. */
  startSignup: (fields: PendingSignup) => void;
  /** Step 2 of signup: capture a face frame and actually create the account. */
  completeSignup: (faceImage: Blob) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  faceLogin: (email: string, faceImage: Blob) => Promise<number>;
  googleAuth: (idToken: string) => Promise<void>;
  reEnrollFace: (faceImage: Blob) => Promise<void>;
  deleteAccount: () => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Use localStorage (via persistToken/getToken) for the JWT so the session
// survives tab/browser close. User profile is kept in sync here in memory.
const USER_KEY = "netbot-user";

function readStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function writeStoredUser(user: AuthUser | null) {
  if (typeof window === "undefined") return;
  try {
    if (user) window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    else window.localStorage.removeItem(USER_KEY);
  } catch {
    // Ignore -- storage may be blocked in private mode.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [pendingSignup, setPendingSignup] = useState<PendingSignup | null>(null);
  const [ready, setReady] = useState(false);

  // Rehydrate from localStorage on mount
  useEffect(() => {
    const token = getToken();
    const storedUser = readStoredUser();
    if (token && storedUser) setUser(storedUser);
    setReady(true);
  }, []);

  const startSignup = useCallback((fields: PendingSignup) => {
    setPendingSignup(fields);
  }, []);

  const completeSignup = useCallback(
    async (faceImage: Blob) => {
      if (!pendingSignup) {
        throw new Error("No signup in progress -- fill in the account form first.");
      }
      const result = await api.signup(pendingSignup.email, pendingSignup.password, faceImage);
      persistToken(result.access_token);
      const authedUser = { id: result.user_id, email: pendingSignup.email };
      writeStoredUser(authedUser);
      setUser(authedUser);
      setPendingSignup(null);
    },
    [pendingSignup],
  );

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.login(email, password);
    persistToken(result.access_token);
    const authedUser = { id: result.user_id, email };
    writeStoredUser(authedUser);
    setUser(authedUser);
  }, []);

  const faceLoginFn = useCallback(async (email: string, faceImage: Blob) => {
    const result = await api.faceLogin(email, faceImage);
    persistToken(result.access_token);
    const authedUser = { id: result.user_id, email };
    writeStoredUser(authedUser);
    setUser(authedUser);
    return result.similarity;
  }, []);

  const googleAuthFn = useCallback(async (idToken: string) => {
    const result = await api.googleAuth(idToken);
    persistToken(result.access_token);
    // /auth/google's response doesn't echo the email back -- it's already
    // in the (backend-verified) Google credential, so read it from there
    // for local display rather than adding a field to every auth response.
    const email = decodeGoogleEmail(idToken) ?? "";
    const authedUser = { id: result.user_id, email };
    writeStoredUser(authedUser);
    setUser(authedUser);
  }, []);

  const logout = useCallback(() => {
    persistToken(null);
    writeStoredUser(null);
    setUser(null);
    setPendingSignup(null);
  }, []);

  const reEnrollFace = useCallback(async (faceImage: Blob) => {
    await api.reEnrollFace(faceImage);
  }, []);

  const deleteAccountFn = useCallback(async () => {
    await api.deleteAccount();
    persistToken(null);
    writeStoredUser(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        authed: user !== null,
        ready,
        user,
        pendingSignup,
        startSignup,
        completeSignup,
        login,
        faceLogin: faceLoginFn,
        googleAuth: googleAuthFn,
        reEnrollFace,
        deleteAccount: deleteAccountFn,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
