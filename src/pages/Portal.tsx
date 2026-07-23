import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Monitor, Smartphone, Building2, ArrowRight, Laptop, PhoneCall, RefreshCw } from 'lucide-react';

interface PortalProps {
  forceShowSelect?: boolean;
}

export default function Portal({ forceShowSelect = false }: PortalProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isSelectMode = forceShowSelect || searchParams.get('select') === 'true' || searchParams.get('portal') === 'true';

  const [detecting, setDetecting] = useState(!isSelectMode);
  const [detectedType, setDetectedType] = useState<'mobile' | 'desktop'>('desktop');

  useEffect(() => {
    // Detect mobile device or screen size
    const userAgentCheck = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const screenCheck = window.innerWidth < 768;
    const isMobile = userAgentCheck || screenCheck;

    setDetectedType(isMobile ? 'mobile' : 'desktop');

    if (!isSelectMode) {
      if (isMobile) {
        navigate('/mobile', { replace: true });
      } else {
        navigate('/erp', { replace: true });
      }
    }
  }, [isSelectMode, navigate]);

  if (detecting) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white font-sans">
        <div className="bg-amber-500/20 border border-amber-500/30 p-5 rounded-2xl mb-4 animate-bounce">
          <Building2 className="text-amber-400 h-10 w-10" />
        </div>
        <h1 className="text-2xl font-black tracking-tight mb-2">PARAHITA<span className="text-amber-500">ERP</span></h1>
        <div className="flex items-center gap-2 text-slate-400 text-sm font-medium mb-6">
          <RefreshCw className="h-4 w-4 animate-spin text-amber-500" />
          Mendeteksi perangkat... Redirect otomatis
        </div>
        <button 
          onClick={() => setDetecting(false)}
          className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-full border border-slate-700 transition-colors"
        >
          Pilih Manual
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans relative">
      <div className="text-center mb-10">
        <div className="bg-amber-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-amber-500/30">
          <Building2 className="text-white h-8 w-8" />
        </div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">PARAHITA<span className="text-amber-500">ERP</span></h1>
        <p className="text-slate-500 mt-2 font-bold uppercase tracking-widest text-xs">Pilih Platform Akses</p>
        
        {/* Device Detection Banner */}
        <div className="mt-4 inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-900 px-4 py-1.5 rounded-full text-xs font-semibold shadow-sm">
          {detectedType === 'mobile' ? (
            <>
              <PhoneCall className="h-3.5 w-3.5 text-amber-600" />
              <span>Perangkat Terdeteksi: <strong>Smartphone / HP</strong> (Rekomendasi Versi Mobile)</span>
            </>
          ) : (
            <>
              <Laptop className="h-3.5 w-3.5 text-amber-600" />
              <span>Perangkat Terdeteksi: <strong>Laptop / Desktop</strong> (Rekomendasi Versi Website ERP)</span>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
        <button 
          onClick={() => navigate('/erp')}
          className={`group bg-white border ${detectedType === 'desktop' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200'} hover:border-amber-400 p-8 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center focus:outline-none relative`}
        >
          {detectedType === 'desktop' && (
            <span className="absolute -top-3 bg-amber-500 text-white text-[10px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
              Otomatis untuk Laptop/Desktop
            </span>
          )}
          <div className="bg-slate-100 group-hover:bg-amber-50 p-6 rounded-2xl mb-6 transition-colors">
            <Monitor className="h-12 w-12 text-slate-600 group-hover:text-amber-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 group-hover:text-amber-600 transition-colors">Versi Website (Desktop)</h2>
          <p className="text-slate-500 mt-3 text-sm line-clamp-2">
            Akses penuh ke sistem ERP Parahita. Manajemen Sales Order, Input PO, Master Produk, BOM & Costing, Laporan, dan Pengaturan Sistem.
          </p>
          <div className="mt-6 px-6 py-2.5 bg-slate-900 text-white rounded-full text-xs font-bold flex items-center gap-2 group-hover:bg-amber-600 transition-colors">
            Masuk ke Website ERP <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </button>

        <button 
          onClick={() => navigate('/mobile')}
          className={`group bg-white border ${detectedType === 'mobile' ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200'} hover:border-blue-400 p-8 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center focus:outline-none relative`}
        >
          {detectedType === 'mobile' && (
            <span className="absolute -top-3 bg-blue-600 text-white text-[10px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
              Otomatis untuk HP/Smartphone
            </span>
          )}
          <div className="bg-slate-100 group-hover:bg-blue-50 p-6 rounded-2xl mb-6 transition-colors">
            <Smartphone className="h-12 w-12 text-slate-600 group-hover:text-blue-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">Aplikasi Mobile / Android</h2>
          <p className="text-slate-500 mt-3 text-sm line-clamp-2">
            Akses operasional lapangan. Cek antrean produksi, validasi QC, manajemen stok material gudang, dan pemindaian barcode worksheet di pabrik.
          </p>
          <div className="mt-6 px-6 py-2.5 bg-blue-600 text-white rounded-full text-xs font-bold flex items-center gap-2 group-hover:bg-blue-700 transition-colors">
            Buka App Mobile <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </button>
      </div>
      
      <div className="mt-12 text-center text-slate-400 text-xs font-medium">
        &copy; {new Date().getFullYear()} Parahita Manufacturing System. All rights reserved.
      </div>
    </div>
  );
}
