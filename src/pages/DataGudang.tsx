import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, doc, getDocs, writeBatch, deleteDoc, setDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

interface GudangItem {
  id?: string;
  kode: string;
  name: string;
  jenis: string;
  satuan: string;
  totalStok: number;
  allocated: number;
  lokasiRak: string;
  supplier: string;
  isiKemasan?: string;
  hargaPartai?: number;
  hargaEcer?: number;
}

export default function DataGudang() {
  const { canEditGudang } = useAuth();
  const [data, setData] = useState<GudangItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [systemAlert, setSystemAlert] = useState<{show: boolean, message: string}>({show: false, message: ''});
  
  const [newItem, setNewItem] = useState<Partial<GudangItem>>({});
  const [stockAdjustModal, setStockAdjustModal] = useState<{show: boolean, item: GudangItem | null}>({show: false, item: null});
  const [newStockVal, setNewStockVal] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const qs = await getDocs(collection(db, 'warehouse_items'));
      const items: GudangItem[] = [];
      qs.forEach(d => {
        items.push({ id: d.id, ...d.data() } as GudangItem);
      });
      setData(items);
    } catch(e) {
      handleFirestoreError(e, OperationType.GET, 'warehouse_items');
    }
  };

  const saveData = async (newData: GudangItem[]) => {
    try {
      const batch = writeBatch(db);
      const toSet = [...newData];
      toSet.forEach(item => {
        const id = item.id || doc(collection(db, 'warehouse_items')).id;
        item.id = id;
        batch.set(doc(db, 'warehouse_items', id), {
          kode: item.kode,
          name: item.name,
          jenis: item.jenis,
          satuan: item.satuan,
          totalStok: item.totalStok || 0,
          allocated: item.allocated || 0,
          lokasiRak: item.lokasiRak || '',
          supplier: item.supplier || '',
          isiKemasan: item.isiKemasan || '',
          hargaPartai: item.hargaPartai || 0,
          hargaEcer: item.hargaEcer || 0,
        });
      });
      await batch.commit();
      setData(toSet);
    } catch(e) {
      handleFirestoreError(e, OperationType.WRITE, 'warehouse_items');
    }
  };

  const handleClearAll = async () => {
    try {
      const batch = writeBatch(db);
      data.forEach(item => {
        if(item.id) {
          batch.delete(doc(db, 'warehouse_items', item.id));
        }
      });
      await batch.commit();
      setData([]);
      setShowClearConfirm(false);
    } catch(e) {
      handleFirestoreError(e, OperationType.DELETE, 'warehouse_items');
    }
  };

  const handleAddItem = async () => {
    if (!newItem.kode || !newItem.name) return;
    const addedItem: GudangItem = {
      kode: newItem.kode || '',
      name: newItem.name || '',
      jenis: newItem.jenis || '',
      satuan: newItem.satuan || '',
      totalStok: Number(newItem.totalStok || 0),
      allocated: Number(newItem.allocated || 0),
      lokasiRak: newItem.lokasiRak || '',
      supplier: newItem.supplier || '',
      isiKemasan: String(newItem.isiKemasan || ''),
      hargaPartai: Number(newItem.hargaPartai || 0),
      hargaEcer: Number(newItem.hargaEcer || 0)
    };
    
    try {
      const newRef = doc(collection(db, 'warehouse_items'));
      const itemWithId = { ...addedItem, id: newRef.id };
      await setDoc(newRef, addedItem);
      setData([...data, itemWithId]);
      setShowAddModal(false);
      setNewItem({});
    } catch(e) {
      handleFirestoreError(e, OperationType.CREATE, 'warehouse_items');
    }
  };

  const handleSaveStock = async () => {
    if (!stockAdjustModal.item || !stockAdjustModal.item.id) return;
    try {
      await updateDoc(doc(db, 'warehouse_items', stockAdjustModal.item.id), {
        totalStok: newStockVal
      });
      const newData = data.map(d => d.id === stockAdjustModal.item!.id ? {...d, totalStok: newStockVal} : d);
      setData(newData);
      setStockAdjustModal({show: false, item: null});
      setSystemAlert({show: true, message: `Stok ${stockAdjustModal.item.name} berhasil diperbarui.`});
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'warehouse_items');
    }
  };

  const getVal = (row: any, possibleKeys: string[]) => {
    const keys = Object.keys(row);
    for (const pk of possibleKeys) {
      const foundKey = keys.find(k => k.trim().toLowerCase() === pk.toLowerCase());
      if (foundKey) return row[foundKey];
    }
    return '';
  };

  const parseNum = (val: any) => {
    if (!val) return 0;
    const cleanStr = String(val).replace(/[^0-9]/g, '');
    return parseInt(cleanStr, 10) || 0;
  };

  const attemptImport = (csvRawData: any[]) => {
    const formattedData: GudangItem[] = csvRawData.map((row: any) => ({
      kode: getVal(row, ['kode', 'k o d e']),
      name: getVal(row, ['product name', 'nama', 'nama produk']),
      jenis: getVal(row, ['jenis', 'j e n i s', 'kategori']),
      satuan: getVal(row, ['satuan', 's a t u a n', 'unit']),
      totalStok: parseNum(getVal(row, ['total stok', 'stok', 'stock', 'qty'])),
      allocated: parseNum(getVal(row, ['allocated', 'po allocated', 'alokasi'])),
      lokasiRak: getVal(row, ['lokasi rak', 'lokasi', 'rak', 'location']),
      supplier: getVal(row, ['supplier', 'vendor']),
      isiKemasan: getVal(row, ['isi kemasan', 'isi']),
      hargaPartai: parseNum(getVal(row, ['harga partai (idr)', 'harga partai', 'hargapartai'])),
      hargaEcer: parseNum(getVal(row, ['harga ecer (idr)', 'harga ecer', 'hargaecer']))
    })).filter(r => r.kode && r.name);
    
    if (formattedData.length > 0) {
      // Prevent duplicates by checking Kode
      const existingKodes = new Set(data.map(d => d.kode));
      const newData = formattedData.filter(d => !existingKodes.has(d.kode));
      
      saveData([...data, ...newData]);
      setSystemAlert({show: true, message: `Berhasil import ${newData.length} baris baru.`});
    } else {
      setSystemAlert({show: true, message: "Tidak ada data valid yang ditemukan pastikan format header benar."});
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          attemptImport(results.data);
        }
      });
    } else if (file.name.endsWith('.xlsx')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const jsonData = XLSX.utils.sheet_to_json(ws);
        attemptImport(jsonData);
      };
      reader.readAsBinaryString(file);
    } else {
      setSystemAlert({show: true, message: "Format file tidak didukung!"});
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const filteredData = data.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    d.kode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-surface w-full max-w-[1600px] mx-auto overflow-hidden">
      <main className="flex-1 overflow-y-auto pt-4 md:pt-8 px-4 md:px-12 pb-8 w-full">
        <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-headline font-bold text-on-surface tracking-tight mb-2">Data Gudang</h1>
            <p className="text-on-surface-variant font-label text-sm max-w-xl">
              Manajemen master data barang gudang
            </p>
          </div>
          
          {canEditGudang && (
            <div className="flex flex-col sm:flex-row gap-3">
               <button 
                onClick={() => setShowClearConfirm(true)}
                disabled={data.length === 0}
                className="disabled:opacity-50 disabled:cursor-not-allowed bg-error/10 text-error font-label text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-error/20 transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
                Hapus Semua
              </button>
              <button 
                onClick={() => setShowAddModal(true)}
                className="bg-surface-container-lowest text-primary font-label text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-surface-bright transition-colors flex items-center justify-center gap-2 ghost-border shadow-sm border border-outline-variant/30"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Tambah Barang
              </button>
              <label className="cursor-pointer bg-gradient-to-b from-primary to-primary-container text-on-primary font-label text-sm font-medium px-5 py-2.5 rounded-xl shadow-sm hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[18px]">upload_file</span>
                Import Excel/CSV
                <input type="file" className="hidden" accept=".csv, .xlsx" ref={fileInputRef} onChange={handleFileUpload} />
              </label>
            </div>
          )}
        </header>

        <div className="mb-6 flex flex-col sm:flex-row items-center gap-3 w-full">
          <div className="relative w-full sm:w-80">
            <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-outline text-sm">search</span>
            <input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2.5 w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary focus:outline-none transition-all text-on-surface placeholder:text-outline" 
              placeholder="Cari Produk atau Kode..." 
              type="text"
            />
          </div>
        </div>

        <section className="bg-surface-container-lowest rounded-[1.25rem] border border-outline-variant/20 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low text-xs border-b border-outline-variant/30 text-on-surface-variant font-bold uppercase tracking-wider">
                  <th className="p-4 pl-6 whitespace-nowrap">SKU / MATERIAL</th>
                  <th className="p-4 whitespace-nowrap">KATEGORI</th>
                  <th className="p-4 whitespace-nowrap">TOTAL STOK</th>
                  <th className="p-4 whitespace-nowrap">ALLOCATED (PO)</th>
                  <th className="p-4 whitespace-nowrap">NET AVAILABLE</th>
                  <th className="p-4 whitespace-nowrap">SUPPLIER & LOKASI RAK</th>
                  <th className="p-4 pr-6 text-right whitespace-nowrap">AKSI</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {filteredData.length > 0 ? filteredData.map((item, i) => (
                  <tr key={i} className="border-b border-outline-variant/20 hover:bg-surface-container-lowest transition-colors group">
                    <td className="p-4 pl-6 align-middle">
                      <div className="font-bold text-[15px] text-on-surface mb-1">{item.name}</div>
                      <div className="text-xs text-outline">{item.kode}</div>
                    </td>
                    <td className="p-4 align-middle">
                      <span className="inline-block px-2.5 py-1 text-[10px] font-bold tracking-wider text-secondary uppercase bg-secondary-container rounded border border-secondary/20">
                        {item.jenis || '-'}
                      </span>
                    </td>
                    <td className="p-4 align-middle">
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-bold text-[15px]">{item.totalStok || 0}</span>
                        <span className="text-xs text-outline lowercase">{item.satuan}</span>
                      </div>
                    </td>
                    <td className="p-4 align-middle">
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-medium text-outline text-[15px]">{item.allocated || 0}</span>
                        <span className="text-xs text-outline lowercase">{item.satuan}</span>
                      </div>
                    </td>
                    <td className="p-4 align-middle">
                      <div className="inline-flex items-baseline gap-1.5 px-3 py-1 bg-green-50/50 border border-green-600 rounded-sm">
                        <span className="font-bold text-[15px] text-green-700">{(item.totalStok || 0) - (item.allocated || 0)}</span>
                        <span className="text-xs text-green-700 font-bold lowercase">{item.satuan}</span>
                      </div>
                    </td>
                    <td className="p-4 align-middle">
                      <div className="font-bold text-sm text-on-surface mb-1">{item.lokasiRak || '-'}</div>
                      <div className="text-[11px] text-outline">Supplier: {item.supplier || '-'}</div>
                    </td>
                    <td className="p-4 pr-6 align-middle text-right">
                      <button 
                        onClick={() => {
                          setStockAdjustModal({show: true, item});
                          setNewStockVal(item.totalStok || 0);
                        }}
                        className="px-4 py-1.5 text-[13px] font-bold text-primary border border-outline-variant rounded hover:bg-primary/5 hover:border-primary transition-colors"
                      >
                        Sesuaikan Stok
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-outline text-sm">
                      Tidak ada data gudang ditemukan. Tambahkan secara manual atau Import file.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Add Modal */}
      {showAddModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)}></div>
           <div className="bg-surface rounded-2xl p-6 w-full max-w-lg shadow-ambient border border-outline-variant/20 relative z-10 animate-fade-in">
              <h3 className="text-xl font-headline font-bold text-on-surface mb-6">Tambah Barang Baru</h3>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-semibold text-on-surface mb-1.5 block">Kode Barang *</label>
                  <input type="text" className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" value={newItem.kode || ''} onChange={e => setNewItem({...newItem, kode: e.target.value})} placeholder="Ex: BRG-001"/>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-semibold text-on-surface mb-1.5 block">Kategori</label>
                  <input type="text" className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" value={newItem.jenis || ''} onChange={e => setNewItem({...newItem, jenis: e.target.value})} placeholder="FABRIC, ACC..."/>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-on-surface mb-1.5 block">Product Name *</label>
                  <input type="text" className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" value={newItem.name || ''} onChange={e => setNewItem({...newItem, name: e.target.value})} placeholder="Nama lengkap produk"/>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-semibold text-on-surface mb-1.5 block">Total Stok</label>
                  <input type="number" min="0" className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" value={newItem.totalStok || ''} onChange={e => setNewItem({...newItem, totalStok: Number(e.target.value)})} placeholder="0"/>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-semibold text-on-surface mb-1.5 block">Satuan</label>
                  <input type="text" className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" value={newItem.satuan || ''} onChange={e => setNewItem({...newItem, satuan: e.target.value})} placeholder="roll, kg, pcs..."/>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-semibold text-on-surface mb-1.5 block">Supplier</label>
                  <input type="text" className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" value={newItem.supplier || ''} onChange={e => setNewItem({...newItem, supplier: e.target.value})} placeholder="Nama vendor/supplier"/>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-semibold text-on-surface mb-1.5 block">Lokasi Rak</label>
                  <input type="text" className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" value={newItem.lokasiRak || ''} onChange={e => setNewItem({...newItem, lokasiRak: e.target.value})} placeholder="Roda A-02A..."/>
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-4">
                <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm font-semibold text-secondary hover:bg-surface-container-low rounded-lg transition-colors">Tutup</button>
                <button onClick={handleAddItem} disabled={!newItem.kode || !newItem.name} className="disabled:opacity-50 disabled:cursor-not-allowed bg-primary text-on-primary px-5 py-2 text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-sm">Simpan</button>
              </div>
           </div>
         </div>
      )}

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowClearConfirm(false)}></div>
           <div className="bg-surface rounded-2xl p-6 w-full max-w-sm shadow-ambient border border-outline-variant/20 relative z-10 animate-fade-in text-center">
              <span className="material-symbols-outlined text-4xl text-error mb-4">warning</span>
              <h3 className="text-xl font-headline font-bold text-on-surface mb-2">Hapus Semua Data?</h3>
              <p className="text-sm text-on-surface-variant mb-6">Tindakan ini tidak dapat dibatalkan. Anda harus melakukan import ulang jika data dihapus.</p>
              
              <div className="flex gap-3 justify-center">
                <button onClick={() => setShowClearConfirm(false)} className="px-5 py-2 text-sm font-semibold text-secondary hover:bg-surface-container-low rounded-lg transition-colors">Batal</button>
                <button onClick={handleClearAll} className="bg-error text-on-error px-5 py-2 text-sm font-semibold rounded-lg hover:bg-error/90 transition-colors shadow-sm">Hapus Semua</button>
              </div>
           </div>
         </div>
      )}

      {/* Stock Adjust Modal */}
      {stockAdjustModal.show && stockAdjustModal.item && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setStockAdjustModal({show: false, item: null})}></div>
           <div className="bg-surface rounded-2xl p-6 w-full max-w-sm shadow-ambient border border-outline-variant/20 relative z-10 animate-fade-in">
              <h3 className="text-lg font-headline font-bold text-on-surface mb-4">Sesuaikan Stok: {stockAdjustModal.item.name}</h3>
              <div className="mb-6">
                <label className="text-xs font-semibold text-on-surface mb-1.5 block uppercase tracking-wide">Total Stok ({stockAdjustModal.item.satuan})</label>
                <input 
                  type="number" 
                  min="0"
                  className="w-full bg-white border border-outline-variant/50 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" 
                  value={newStockVal} 
                  onChange={e => setNewStockVal(Number(e.target.value) || 0)} 
                />
              </div>
              
              <div className="flex gap-3 justify-end">
                <button onClick={() => setStockAdjustModal({show: false, item: null})} className="px-5 py-2 text-sm font-semibold text-secondary hover:bg-surface-container-low rounded-lg transition-colors">Batal</button>
                <button onClick={handleSaveStock} className="bg-primary text-on-primary px-5 py-2 text-sm font-semibold rounded-lg hover:opacity-90 transition-colors shadow-sm">Simpan</button>
              </div>
           </div>
         </div>
      )}

      {/* Custom Alert/Toast */}
      {systemAlert.show && (
         <div className="fixed bottom-4 right-4 z-50 bg-inverse-surface text-inverse-on-surface px-6 py-4 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] animate-fade-in flex items-center gap-4">
            <span className="text-sm font-medium">{systemAlert.message}</span>
            <button onClick={() => setSystemAlert({show: false, message: ''})} className="text-inverse-primary hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
         </div>
      )}
    </div>
  );
}
