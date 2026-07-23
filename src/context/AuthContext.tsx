import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'Admin' | 'Direktur/Owner' | 'Purchasing' | 'Produksi' | 'QC' | 'Warehouse';

export interface UserAccount {
  username: string;
  role: UserRole;
  name: string;
  email: string;
  avatar: string;
}

export const PREDEFINED_USERS = [
  {
    role: 'Admin' as UserRole,
    username: 'adminpps',
    password: 'pps123admin',
    name: 'Admin PPS',
    email: 'admin.pps@parahita.com',
    avatar: 'https://ui-avatars.com/api/?name=Admin+PPS&background=1e293b&color=ffffff'
  },
  {
    role: 'Direktur/Owner' as UserRole,
    username: 'direksi1',
    password: 'direksi123',
    name: 'Direksi Utama',
    email: 'direksi@parahita.com',
    avatar: 'https://ui-avatars.com/api/?name=Direksi+Utama&background=f59e0b&color=ffffff'
  },
  {
    role: 'Purchasing' as UserRole,
    username: 'purchasing1',
    password: 'purchasing123',
    name: 'Tim Purchasing',
    email: 'purchasing@parahita.com',
    avatar: 'https://ui-avatars.com/api/?name=Purchasing&background=3b82f6&color=ffffff'
  },
  {
    role: 'Produksi' as UserRole,
    username: 'prod1',
    password: 'produksi123',
    name: 'Kepala Produksi',
    email: 'produksi@parahita.com',
    avatar: 'https://ui-avatars.com/api/?name=Produksi&background=10b981&color=ffffff'
  },
  {
    role: 'QC' as UserRole,
    username: 'qc1',
    password: 'qc123123',
    name: 'Inspektur QC',
    email: 'qc@parahita.com',
    avatar: 'https://ui-avatars.com/api/?name=Inspektur+QC&background=f97316&color=ffffff'
  },
  {
    role: 'Warehouse' as UserRole,
    username: 'warehouse1',
    password: 'warehouse123',
    name: 'Supervisor Gudang',
    email: 'warehouse@parahita.com',
    avatar: 'https://ui-avatars.com/api/?name=Warehouse&background=8b5cf6&color=ffffff'
  }
];

interface AuthContextType {
  currentUser: UserAccount | null;
  login: (username: string, password: string) => { success: boolean; message?: string; user?: UserAccount };
  logout: () => void;
  quickLogin: (username: string) => void;
  inactivityMessage: string | null;
  clearInactivityMessage: () => void;
  // Permissions
  canResetDatabase: boolean;
  canUnlockBOM: boolean;
  canVerifyWIPStage: (stage?: string) => boolean;
  canEditMasterProduct: boolean;
  canEditGudang: boolean;
  canCreatePO: boolean;
  canCreateSO: boolean;
  isReadOnlyMode: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes in ms

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    // Clear legacy localStorage to ensure fresh session rules
    localStorage.removeItem('parahita_user');

    const saved = sessionStorage.getItem('parahita_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // invalid
      }
    }
    return null; // Direct to login on fresh open
  });

  const [inactivityMessage, setInactivityMessage] = useState<string | null>(() => {
    const msg = sessionStorage.getItem('inactivity_logout_msg');
    if (msg) {
      sessionStorage.removeItem('inactivity_logout_msg');
      return msg;
    }
    return null;
  });

  const clearInactivityMessage = () => {
    setInactivityMessage(null);
    sessionStorage.removeItem('inactivity_logout_msg');
  };

  useEffect(() => {
    if (currentUser) {
      sessionStorage.setItem('parahita_user', JSON.stringify(currentUser));
    } else {
      sessionStorage.removeItem('parahita_user');
    }
  }, [currentUser]);

  // 10-Minute Inactivity Auto-Logout
  useEffect(() => {
    if (!currentUser) return;

    let timer: NodeJS.Timeout;

    const resetTimer = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const msg = 'Sesi Anda telah berakhir karena tidak ada aktivitas selama 10 menit. Silakan login kembali.';
        sessionStorage.setItem('inactivity_logout_msg', msg);
        setInactivityMessage(msg);
        setCurrentUser(null);
      }, INACTIVITY_TIMEOUT);
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(evt => window.addEventListener(evt, resetTimer, { passive: true }));

    resetTimer();

    return () => {
      if (timer) clearTimeout(timer);
      events.forEach(evt => window.removeEventListener(evt, resetTimer));
    };
  }, [currentUser]);

  const login = (username: string, password: string) => {
    const found = PREDEFINED_USERS.find(
      u => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password
    );

    if (found) {
      const userAcc: UserAccount = {
        username: found.username,
        role: found.role,
        name: found.name,
        email: found.email,
        avatar: found.avatar
      };
      clearInactivityMessage();
      setCurrentUser(userAcc);
      return { success: true, user: userAcc };
    }

    return { success: false, message: 'Username atau password tidak valid.' };
  };

  const quickLogin = (username: string) => {
    const found = PREDEFINED_USERS.find(u => u.username === username);
    if (found) {
      const userAcc: UserAccount = {
        username: found.username,
        role: found.role,
        name: found.name,
        email: found.email,
        avatar: found.avatar
      };
      clearInactivityMessage();
      setCurrentUser(userAcc);
    }
  };

  const logout = () => {
    sessionStorage.removeItem('parahita_user');
    setCurrentUser(null);
  };

  const role = currentUser?.role || 'Admin';

  const canResetDatabase = role === 'Direktur/Owner';
  const canUnlockBOM = role === 'Direktur/Owner';

  const canVerifyWIPStage = (stage?: string): boolean => {
    const s = (stage || '').toLowerCase();
    if (role === 'Direktur/Owner') {
      return s === 'pending';
    }
    if (role === 'Admin' || role === 'Purchasing') {
      return false; // Admin & Purchasing tidak bisa verifikasi di WIP Kanban
    }
    if (role === 'QC') {
      return s === 'qc';
    }
    if (role === 'Produksi') {
      return s !== 'qc' && s !== 'pending';
    }
    if (role === 'Warehouse') {
      return false;
    }
    return false;
  };

  const canEditMasterProduct = role === 'Admin' || role === 'Purchasing' || role === 'Warehouse';
  const canEditGudang = role === 'Admin' || role === 'Purchasing' || role === 'Warehouse';
  const canCreatePO = role === 'Admin' || role === 'Purchasing';
  const canCreateSO = role === 'Admin' || role === 'Purchasing';
  const isReadOnlyMode = role === 'Direktur/Owner' || role === 'QC' || role === 'Produksi' || role === 'Warehouse';

  return (
    <AuthContext.Provider value={{ 
      currentUser, 
      login, 
      logout, 
      quickLogin,
      inactivityMessage,
      clearInactivityMessage,
      canResetDatabase,
      canUnlockBOM,
      canVerifyWIPStage,
      canEditMasterProduct,
      canEditGudang,
      canCreatePO,
      canCreateSO,
      isReadOnlyMode
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
