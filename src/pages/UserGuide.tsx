import React from 'react';

export default function UserGuide() {
  return (
    <div className="flex-1 bg-[#F8FAFC] min-h-screen">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-[28px] text-primary">menu_book</span>
            <h1 className="text-2xl font-bold text-gray-900 font-headline">Buku Panduan (User Guide)</h1>
          </div>
          <p className="text-sm text-gray-500 max-w-2xl">
            Panduan lengkap penggunaan sistem ERP Parahita. Pelajari cara mengelola penjualan, produksi, dan gudang dengan efisien.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="border-b border-gray-100 p-5 bg-gray-50/50">
            <h2 className="text-lg font-bold text-gray-900">Modul Utama</h2>
          </div>
          <div className="divide-y divide-gray-100">
            <div className="p-5 flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined">receipt_long</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1">Sales Order & Purchase Order</h3>
                <p className="text-sm text-gray-600 mb-3">Cara menginput pesanan baru dari klien dan mengubahnya menjadi SPK (Surat Perintah Kerja) untuk tim produksi.</p>
                <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-100 font-medium">
                  1. Buka menu Sales Order &gt; Tambah Transaksi<br/>
                  2. Isi data klien, produk, dan kuantiti ukuran<br/>
                  3. Simpan dan Generate SPK
                </div>
              </div>
            </div>
            
            <div className="p-5 flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined">view_kanban</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1">Kanban Produksi (WIP)</h3>
                <p className="text-sm text-gray-600 mb-3">Cara melacak status produksi (Patterning, Cutting, Sablon, Bordir, Sewing) hingga proses QC dan Packing.</p>
                <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-100 font-medium">
                  Produksi dapat dipindah antar tahap dengan klik tombol Kirim. Saat di tahap QC, hasil bisa diloloskan ke Gudang atau direject untuk diperbaiki.
                </div>
              </div>
            </div>

            <div className="p-5 flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined">inventory_2</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1">Manajemen Gudang & Inventory</h3>
                <p className="text-sm text-gray-600 mb-3">Cara melihat stok barang jadi, bahan baku (kain, aksesoris), serta mencatat barang masuk/keluar.</p>
                <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-100 font-medium">
                  Pastikan selalu menginput Nomor Rak / Lokasi agar bahan mudah ditemukan saat diperlukan untuk produksi.
                </div>
              </div>
            </div>
            
            <div className="p-5 flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined">calculate</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1">BOM & Costing</h3>
                <p className="text-sm text-gray-600 mb-3">Menghitung Biaya Pokok Produksi menggunakan Bill of Materials.</p>
                <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-100 font-medium">
                  Setelah HPP dikalkulasi, BOM akan dikunci dan hanya dapat dibuka oleh Owner.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
