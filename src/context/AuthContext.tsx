
'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { onAuthStateChanged, User, Auth, getAuth } from 'firebase/auth';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { ensureUserDataIsolation, addOrUpdateUserProfile } from '@/lib/userStorage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCvdL096KtkxJn35ekH2xc3eIEp3IJg7Oo",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "cursor-170e4.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "cursor-170e4",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "cursor-170e4.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "89189272844",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:89189272844:web:b153d04643001f80c64d29"
};


interface AuthContextType {
  user: User | null;
  loading: boolean;
  auth: Auth | null;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, auth: null });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState<Auth | null>(null);

  useEffect(() => {
    // This code now runs ONLY on the client, after the component has mounted.
    // It initializes the Firebase app and then the Auth service.
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    const authInstance = getAuth(app);
    setAuth(authInstance);

    const unsubscribe = onAuthStateChanged(authInstance, (user) => {
      setUser(user);
      setLoading(false);
      
      // Ensure user data isolation when user logs in
      if (user?.email) {
        ensureUserDataIsolation(user.email);
        // Add user to the site registry for owner/admin visibility
        addOrUpdateUserProfile({
          email: user.email,
          displayName: user.displayName || user.email.split('@')[0],
          createdAt: Date.now(),
          suspended: false,
          banned: false,
          lastSignIn: Date.now()
        });
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, auth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
