import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, PREDEFINED_USERS, UserRole } from '../context/AuthContext';
import { 
  Building2, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  LogIn, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, quickLogin, currentUser } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const redirectUrl = searchParams.get('redirect') || '/portal';

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!username || !password) {
      setErrorMessage('Harap isi username dan password.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const res = login(username, password);
      setIsLoading(false);
      if (res.success) {
        navigate(redirectUrl, { replace: true });
      } else {
        setErrorMessage(res.message || 'Username atau password salah.');
      }
    }, 400);
  };

  const handleSelectQuickAccount = (user: typeof PREDEFINED_USERS[0]) => {
    setUsername(user.username);
    setPassword('');
    setErrorMessage(null);
  };

  const handleInstantLogin = (user: typeof PREDEFINED_USERS[0]) => {
    quickLogin(user.username);
    navigate(redirectUrl, { replace: true });
  };

  const [showHelper, setShowHelper] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 md:p-8 font-sans relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl shadow-xl overflow-hidden z-10 p-8 md:p-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-amber-500 p-2.5 rounded-2xl shadow-lg shadow-amber-500/20 text-white">
            <Building2 className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">PARAHITA<span className="text-amber-500">ERP</span></h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Sistem Informasi Garment & Manufaktur</p>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900">Selamat Datang Kembali</h2>
          <p className="text-xs text-slate-500 mt-1">Silakan masuk menggunakan akun role Anda untuk mengakses sistem.</p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-600 text-xs font-semibold animate-in fade-in">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Username</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:bg-white transition-all font-medium"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                className="w-full pl-10 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:bg-white transition-all font-medium"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-2xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  <span>Masuk ke Sistem</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Collapsible Helper Toggle (Hidden by default) */}
        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={() => setShowHelper(!showHelper)}
            className="text-xs text-slate-500 hover:text-amber-600 font-medium transition-colors inline-flex items-center gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>{showHelper ? 'Sembunyikan Petunjuk Role' : 'Petunjuk Akun & Role Login'}</span>
          </button>

          {showHelper && (
            <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-2 animate-in fade-in">
              <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wider mb-2">Role Tersedia:</div>
              {PREDEFINED_USERS.map((u) => (
                <div 
                  key={u.username}
                  onClick={() => handleSelectQuickAccount(u)}
                  className="p-2.5 rounded-xl bg-white hover:bg-amber-50/50 border border-slate-200 cursor-pointer flex justify-between items-center text-xs transition-colors"
                >
                  <div>
                    <span className="font-bold text-slate-900 block">{u.role}</span>
                    <span className="text-slate-500 text-[11px] block">{u.name}</span>
                  </div>
                  <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">Pilih Role</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-400 flex items-center justify-between">
          <span>&copy; {new Date().getFullYear()} Parahita ERP</span>
          <span className="flex items-center gap-1 text-slate-500 font-medium">
            <ShieldCheck className="h-3.5 w-3.5 text-amber-500" /> Security Verified
          </span>
        </div>
      </div>
    </div>
  );
}
