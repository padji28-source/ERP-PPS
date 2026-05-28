import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Monitor, Smartphone, Building2 } from 'lucide-react';

export default function Portal() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="text-center mb-10">
        <div className="bg-amber-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-amber-500/30">
          <Building2 className="text-white h-8 w-8" />
        </div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">PARAHITA<span className="text-amber-500">ERP</span></h1>
        <p className="text-slate-500 mt-3 font-bold uppercase tracking-widest text-sm">Pilih Platform Akses</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
        <button 
          onClick={() => navigate('/erp')}
          className="group bg-white border border-slate-200 hover:border-amber-400 p-8 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center focus:outline-none"
        >
          <div className="bg-slate-100 group-hover:bg-amber-50 p-6 rounded-2xl mb-6 transition-colors">
            <Monitor className="h-12 w-12 text-slate-600 group-hover:text-amber-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 group-hover:text-amber-600 transition-colors">Versi Website (Desktop)</h2>
          <p className="text-slate-500 mt-3 text-sm line-clamp-2">
            Akses penuh ke sistem ERP Parahita. Manajemen Sales Order, Input PO, Master Produk, BOM & Costing, Laporan, dan Pengaturan Sistem. Diperuntukkan untuk manajemen dan admin.
          </p>
          <div className="mt-6 px-6 py-2 bg-slate-900 text-white rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0">
            Masuk ke ERP &rarr;
          </div>
        </button>

        <button 
          onClick={() => navigate('/mobile')}
          className="group bg-white border border-slate-200 hover:border-blue-400 p-8 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center focus:outline-none"
        >
          <div className="bg-slate-100 group-hover:bg-blue-50 p-6 rounded-2xl mb-6 transition-colors">
            <Smartphone className="h-12 w-12 text-slate-600 group-hover:text-blue-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">Aplikasi Mobile / Android</h2>
          <p className="text-slate-500 mt-3 text-sm line-clamp-2">
            Akses operasional lapangan. Cek antrean produksi, validasi QC, manajemen stok material gudang, dan pemindaian barcode worksheet di pabrik.
          </p>
          <div className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0">
            Buka App Mobile &rarr;
          </div>
        </button>
      </div>
      
      <div className="mt-16 text-center text-slate-400 text-xs font-medium">
        &copy; {new Date().getFullYear()} Parahita Manufacturing System. All rights reserved.
      </div>
    </div>
  );
}
