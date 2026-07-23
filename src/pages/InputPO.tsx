import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

export default function InputPO() {
  const { canCreatePO } = useAuth();
  const [view, setView] = useState<'list' | 'form'>('list');
  const [pos, setPos] = useState<any[]>([]);

  const [poNumber, setPoNumber] = useState("");
  const [clientName, setClientName] = useState("");
  const [styleCode, setStyleCode] = useState("");
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("Shirt (Kemeja)");
  const [color, setColor] = useState("");
  const [price, setPrice] = useState("");
  const [deadline, setDeadline] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  
  const navigate = useNavigate();

  const SIZES = ["S", "M", "L", "XL", "XXL"];

  useEffect(() => {
    if (view === 'list') {
      loadPOs();
    }
  }, [view]);

  const loadPOs = async () => {
    try {
      const qs = await getDocs(collection(db, 'purchase_orders'));
      const qsList: any[] = [];
      qs.forEach(d => qsList.push({ ...d.data(), firestoreId: d.id }));
      setPos(qsList);
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, 'purchase_orders');
    }
  };

  const calculateTotalQtyDetail = (): number => {
    return Object.values(quantities).reduce((sum: number, val: number) => sum + (val || 0), 0) as number;
  };

  const calculateTotalQty = (items: any[]) => {
    if (!items) return 0;
    return items.reduce((total: number, item: any) => {
      const itemTotal = Object.values(item.quantities || {}).reduce((sum: number, val: any) => sum + ((val as number) || 0), 0) as number;
      return total + itemTotal;
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poNumber || !clientName || !deadline || !productName) {
      setAlertMessage("Harap lengkapi semua field yang wajib!");
      return;
    }

    const newPO = {
      id: poNumber,
      clientName,
      deadline,
      note,
      items: [{
        styleCode,
        productName,
        category,
        color,
        price: Number(price),
        quantities
      }],
      status: 'Open',
      createdDate: new Date().toISOString()
    };

    try {
      const docId = poNumber.replace(/\//g, '-');
      await setDoc(doc(db, 'purchase_orders', docId), newPO);
      setAlertMessage("Purchase Order berhasil disimpan!");
      resetForm();
      setView('list');
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'purchase_orders');
    }
  };

  const resetForm = () => {
    setPoNumber("");
    setClientName("");
    setStyleCode("");
    setProductName("");
    setCategory("Shirt (Kemeja)");
    setColor("");
    setPrice("");
    setDeadline("");
    setQuantities({});
    setNote("");
  };

  const [deleteConfirm, setDeleteConfirm] = useState<{id: string, firestoreId: string} | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const handleDeleteClick = (id: string, firestoreId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirm({ id, firestoreId });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteDoc(doc(db, 'purchase_orders', deleteConfirm.firestoreId));
      const newPOs = pos.filter(p => p.firestoreId !== deleteConfirm.firestoreId);
      setPos(newPOs);
      setDeleteConfirm(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'purchase_orders');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-surface w-full max-w-[1600px] mx-auto overflow-hidden">
      <main className="flex-1 overflow-y-auto pt-4 md:pt-8 px-4 md:px-12 pb-8 w-full custom-scrollbar">
        {view === 'list' ? (
          <>
            <header className="mb-8 flex justify-between items-end">
              <div>
                <h1 className="text-3xl font-headline font-bold text-on-surface tracking-tight mb-2">Daftar Purchase Order</h1>
                <p className="text-on-surface-variant font-label text-sm max-w-xl">
                  Lihat dan kelola Purchase Order yang telah dibuat.
                </p>
              </div>
              {canCreatePO && (
                <button 
                  onClick={() => {
                    const currentYear = new Date().getFullYear();
                    const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
                    setPoNumber(`PO-${currentYear}-${currentMonth}-`);
                    setView('form');
                  }}
                  className="bg-primary hover:bg-primary/90 text-on-primary font-bold py-2.5 px-4 rounded-lg flex items-center transition-colors shadow-sm"
                >
                  <span className="material-symbols-outlined mr-2">add</span>
                  Tambahkan Purchase Order Baru
                </button>
              )}
            </header>

            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 overflow-hidden shadow-sm">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-surface-container-low text-on-surface text-sm font-label uppercase tracking-wider">
                      <th className="p-4 font-semibold w-[150px]">PO Number</th>
                      <th className="p-4 font-semibold">Client</th>
                      <th className="p-4 font-semibold">Products</th>
                      <th className="p-4 font-semibold w-[120px]">Total Qty</th>
                      <th className="p-4 font-semibold w-[150px]">Deadline</th>
                      <th className="p-4 font-semibold w-[120px] text-center">Status</th>
                      <th className="p-4 font-semibold w-[80px] text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-medium">
                    {pos.map((po, index) => (
                      <tr 
                        key={index} 
                        className="border-b border-outline-variant/10 hover:bg-surface-container-low/50 transition-colors"
                      >
                        <td className="p-4 text-primary font-bold">{po.id}</td>
                        <td className="p-4 text-on-surface">{po.clientName}</td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1">
                            {po.items?.map((item: any, i: number) => (
                              <span key={i} className="text-xs bg-surface-container px-2 py-1 rounded inline-block w-max">
                                {item.productName}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-4 text-on-surface font-semibold">{calculateTotalQty(po.items)} pcs</td>
                        <td className="p-4 text-on-surface-variant">{po.deadline}</td>
                        <td className="p-4 text-center">
                           <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider uppercase bg-[#EFF6FF] text-[#3B82F6]`}>
                            {po.status || 'Open'}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button 
                            onClick={(e) => handleDeleteClick(po.id, po.firestoreId, e)}
                            className="text-error hover:bg-error-container p-2 rounded-lg transition-colors"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {pos.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-on-surface-variant font-medium">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-[32px] opacity-50">receipt_long</span>
                            Belum ada data Purchase Order.
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white border border-outline-variant/30 rounded-lg p-6 shadow-sm max-w-4xl mx-auto">
            <div className="flex justify-between items-center border-b border-outline-variant/20 pb-4 mb-6">
              <h1 className="text-xl font-headline font-bold text-on-surface uppercase tracking-wide">Buat Pesanan (Purchase Order) Baru</h1>
              <button type="button" onClick={() => setView('list')} className="text-outline font-semibold text-sm hover:text-error transition-colors flex items-center">
                <span className="material-symbols-outlined text-[16px] mr-1">close</span> Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-outline-variant uppercase tracking-wider">Nomor PO:</label>
                <input 
                  className="w-full bg-white border border-outline-variant/30 text-sm py-2.5 px-3 rounded text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-outline-variant" 
                  placeholder="Contoh: PO-2026-001" 
                  type="text"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  required
                />
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-outline-variant uppercase tracking-wider">Nama Buyer / Merk:</label>
                <input 
                  className="w-full bg-white border border-outline-variant/30 text-sm py-2.5 px-3 rounded text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-outline-variant" 
                  placeholder="Contoh: Zara Kids, H&M, Erigo" 
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-outline-variant uppercase tracking-wider">Deskripsi Pakaian:</label>
                <input 
                  className="w-full bg-white border border-outline-variant/30 text-sm py-2.5 px-3 rounded text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-outline-variant" 
                  placeholder="Contoh: Kemeja Formal Oxford" 
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-outline-variant uppercase tracking-wider">Kategori Produk:</label>
                <select 
                  className="w-full bg-white border border-outline-variant/30 text-sm py-2.5 px-3 rounded text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option>Shirt (Kemeja)</option>
                  <option>T-Shirt (Kaos)</option>
                  <option>Pants (Celana)</option>
                  <option>Jacket (Jaket)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-outline-variant uppercase tracking-wider">Style Code:</label>
                <input 
                  className="w-full bg-white border border-outline-variant/30 text-sm py-2.5 px-3 rounded text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-outline-variant" 
                  placeholder="Contoh: SH-OXF-01" 
                  type="text"
                  value={styleCode}
                  onChange={(e) => setStyleCode(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-outline-variant uppercase tracking-wider">Warna (Colorway):</label>
                <input 
                  className="w-full bg-white border border-outline-variant/30 text-sm py-2.5 px-3 rounded text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-outline-variant" 
                  placeholder="Contoh: Navy Blue / Putih" 
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-outline-variant uppercase tracking-wider">Harga Satuan (FOB / CMT):</label>
                <input 
                  className="w-full bg-white border border-outline-variant/30 text-sm py-2.5 px-3 rounded text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-outline-variant" 
                  placeholder="Contoh: 85000" 
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-outline-variant uppercase tracking-wider">Deadline Pengiriman (Ex-Factory):</label>
                <input 
                  className="w-full bg-white border border-outline-variant/30 text-sm py-2.5 px-3 rounded text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" 
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="text-xs font-bold text-outline-variant uppercase tracking-wider mb-2 block">Breakdown Size & Qty:</label>
              <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {SIZES.map(size => (
                    <div key={size} className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-outline text-center">{size}</label>
                      <input 
                        type="number" 
                        placeholder="0"
                        className="w-full bg-white border border-outline-variant/30 text-center text-sm py-2 rounded text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        value={quantities[size] || ""}
                        onChange={(e) => setQuantities({...quantities, [size]: parseInt(e.target.value) || 0})}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-outline-variant/20 flex justify-between items-center">
                  <span className="text-sm font-semibold text-on-surface-variant">Total Quantity:</span>
                  <span className="text-[18px] font-bold text-primary">{calculateTotalQtyDetail()} pcs</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1 mb-8">
              <label className="text-xs font-bold text-outline-variant uppercase tracking-wider">Catatan Tambahan:</label>
              <textarea 
                className="w-full bg-white border border-outline-variant/30 text-sm py-2.5 px-3 rounded text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-outline-variant h-24 custom-scrollbar" 
                placeholder="Catatan mengenai packing, instruksi khusus, dsb."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-outline-variant/20">
              <button 
                type="button" 
                onClick={() => setView('list')}
                className="px-6 py-2.5 border border-outline-variant text-on-surface font-semibold rounded hover:bg-surface-container transition-colors text-sm"
              >
                Batal
              </button>
              <button 
                type="submit" 
                className="px-6 py-2.5 bg-primary text-on-primary font-bold rounded hover:bg-primary/90 transition-colors shadow-sm text-sm"
              >
                Simpan Purchase Order
              </button>
            </div>
          </form>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl shadow-lg max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-headline font-bold text-on-surface mb-2">Konfirmasi Hapus</h3>
            <p className="text-on-surface-variant mb-6 text-sm">
              Apakah Anda yakin ingin menghapus Purchase Order <span className="font-bold text-on-surface">{deleteConfirm.id}</span>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold rounded-lg transition-colors text-sm"
              >
                Batal
              </button>
              <button 
                onClick={confirmDelete}
                className="px-4 py-2 bg-error hover:bg-error/90 text-on-error font-bold rounded-lg transition-colors text-sm"
              >
                Hapus PO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {alertMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl shadow-lg max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200 text-center">
            <span className="material-symbols-outlined text-4xl text-primary mb-3">info</span>
            <p className="text-on-surface font-semibold mb-6">{alertMessage}</p>
            <button 
              onClick={() => setAlertMessage(null)}
              className="w-full py-2 bg-primary hover:bg-primary/90 text-on-primary font-bold rounded-lg transition-colors text-sm"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
