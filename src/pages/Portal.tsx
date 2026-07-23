import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Portal() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) {
      navigate('/login', { replace: true });
      return;
    }

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
    if (isMobile) {
      navigate('/mobile', { replace: true });
    } else {
      navigate('/erp', { replace: true });
    }
  }, [currentUser, navigate]);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white font-sans">
      <div className="bg-amber-500/20 border border-amber-500/30 p-5 rounded-2xl mb-4 animate-bounce">
        <Building2 className="text-amber-400 h-10 w-10" />
      </div>
      <h1 className="text-2xl font-black tracking-tight mb-2">PARAHITA<span className="text-amber-500">ERP</span></h1>
      <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
        <RefreshCw className="h-4 w-4 animate-spin text-amber-500" />
        Mendeteksi perangkat & mengalihkan otomatis...
      </div>
    </div>
  );
}
