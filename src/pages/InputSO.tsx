import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, doc, getDocs, getDoc, setDoc, writeBatch, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

export default function InputSO() {
  const { canCreateSO } = useAuth();
  const [view, setView] = useState<'list' | 'form'>('list');
  const [sos, setSos] = useState<any[]>([]);

  const [availableProducts, setAvailableProducts] = useState<string[]>([]);
  const [masterProducts, setMasterProducts] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [productQuantities, setProductQuantities] = useState<Record<string, Record<string, number>>>({});
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [soNumber, setSoNumber] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [savedPOs, setSavedPOs] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [clientName, setClientName] = useState("");
  const [deadline, setDeadline] = useState("");
  const [note, setNote] = useState("");
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const SIZES = ["S", "M", "L", "XL", "XXL", "XXXL"];

  useEffect(() => {
    if (view === 'list') {
      loadSOs();
    }
  }, [view]);

  const loadSOs = async () => {
    try {
      const qs = await getDocs(collection(db, 'sales_orders'));
      const soMap: Record<string, any> = {};
      qs.forEach(d => {
        const data = d.data();
        let baseId = data.id;
        if (data.id.includes('-')) {
          const parts = data.id.split('-');
          if (parts.length > 1 && !isNaN(parseInt(parts[parts.length - 1]))) {
            baseId = parts.slice(0, -1).join('-');
          }
        }
        if (!soMap[baseId]) {
          soMap[baseId] = {
            id: baseId,
            poNumber: data.poNumber,
            clientName: data.client,
            deadline: data.deadline,
            totalQty: 0,
            products: [],
            status: data.status,
            firestoreIds: []
          };
        }
        soMap[baseId].totalQty += (data.qty || 0);
        if (!soMap[baseId].products.includes(data.product)) {
          soMap[baseId].products.push(data.product);
        }
        soMap[baseId].firestoreIds.push(d.id);
      });
      setSos(Object.values(soMap));
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, 'sales_orders');
    }
  };

  const [deleteConfirm, setDeleteConfirm] = useState<{id: string, firestoreIds: string[]} | null>(null);

  const handleDeleteSOClick = (id: string, firestoreIds: string[]) => {
    setDeleteConfirm({ id, firestoreIds });
  };

  const confirmDeleteSO = async () => {
    if (!deleteConfirm) return;
    try {
      const batch = writeBatch(db);
      deleteConfirm.firestoreIds.forEach(fId => {
        batch.delete(doc(db, 'sales_orders', fId));
      });
      await batch.commit();
      setSos(sos.filter(s => s.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'sales_orders');
    }
  };

  useEffect(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    
    async function loadSeq() {
      try {
        const seqDoc = await getDoc(doc(db, 'system_configs', 'so_sequence'));
        const nextSeq = seqDoc.exists() ? (seqDoc.data().value || 1) : 1;
        const seqStr = String(nextSeq).padStart(3, '0');
        if (!soNumber) setSoNumber(`SO-${year}-${month}-${seqStr}`);
      } catch(e) {
        if (!soNumber) setSoNumber(`SO-${year}-${month}-001`);
      }
    }
    if (view === 'form' && !soNumber) {
      loadSeq();
    }
  }, [view]);

  useEffect(() => {
    async function load() {
      try {
        const qsProd = await getDocs(collection(db, 'master_products'));
        const mpList: any[] = [];
        const names: string[] = [];
        qsProd.forEach(d => {
          const item = d.data();
          mpList.push(item);
          if (item.name) names.push(item.name);
        });
        setMasterProducts(mpList);
        setAvailableProducts(Array.from(new Set(names)));

        const qsPO = await getDocs(collection(db, 'purchase_orders'));
        const poList: any[] = [];
        qsPO.forEach(d => {
          poList.push({ id: d.id, ...d.data() });
        });
        setSavedPOs(poList);

      } catch (e) {
        handleFirestoreError(e, OperationType.GET, 'multiple_collections');
        setAvailableProducts([]);
      }
    }
    load();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleProduct = (prod: string) => {
    setSelectedProducts(prev => 
      prev.includes(prod) ? prev.filter(p => p !== prod) : [...prev, prod]
    );
  };
  
  const handleQuantityChange = (prod: string, size: string, qty: string) => {
    setProductQuantities(prev => ({
      ...prev,
      [prod]: {
        ...(prev[prod] || {}),
        [size]: parseInt(qty) || 0
      }
    }));
  };

  const totalQty = selectedProducts.reduce((sum, p) => {
    const sizes = productQuantities[p] || {};
    return sum + (Object.values(sizes) as number[]).reduce((s: number, val: number) => s + val, 0);
  }, 0);

  const resetForm = () => {
    setPoNumber("");
    setClientName("");
    setDeadline("");
    setNote("");
    setSelectedProducts([]);
    setProductQuantities({});
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-surface w-full max-w-7xl mx-auto overflow-hidden">
      <main className="flex-1 overflow-y-auto pt-4 md:pt-8 px-4 md:px-12 pb-8 w-full custom-scrollbar">
        {view === 'list' ? (
          <>
            <header className="mb-8 flex justify-between items-end">
              <div>
                <h1 className="text-3xl font-headline font-bold text-on-surface tracking-tight mb-2">Daftar Sales Order</h1>
                <p className="text-on-surface-variant font-label text-sm max-w-xl">
                  Lihat dan kelola Sales Order yang telah dibuat.
                </p>
              </div>
              {canCreateSO && (
                <button 
                  onClick={() => setView('form')}
                  className="bg-primary hover:bg-primary/90 text-on-primary font-bold py-2.5 px-4 rounded-lg flex items-center transition-colors shadow-sm"
                >
                  <span className="material-symbols-outlined mr-2">add</span>
                  Tambahkan Transaksi Sales Order Baru
                </button>
              )}
            </header>

            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 overflow-hidden shadow-sm">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-surface-container-low text-on-surface text-sm font-label uppercase tracking-wider">
                      <th className="p-4 font-semibold w-[150px]">SO Number</th>
                      <th className="p-4 font-semibold w-[150px]">PO Ref</th>
                      <th className="p-4 font-semibold">Client</th>
                      <th className="p-4 font-semibold">Products</th>
                      <th className="p-4 font-semibold w-[120px]">Total Qty</th>
                      <th className="p-4 font-semibold w-[150px]">Deadline</th>
                      <th className="p-4 font-semibold w-[120px] text-center">Status</th>
                      <th className="p-4 font-semibold w-[80px] text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-medium">
                    {sos.map((so, index) => (
                      <tr 
                        key={index} 
                        className="border-b border-outline-variant/10 hover:bg-surface-container-low/50 transition-colors"
                      >
                        <td className="p-4 text-primary font-bold">{so.id}</td>
                        <td className="p-4 text-on-surface">{so.poNumber || '-'}</td>
                        <td className="p-4 text-on-surface">{so.clientName}</td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1">
                            {so.products.map((p: string, i: number) => (
                              <span key={i} className="text-xs bg-surface-container px-2 py-1 rounded inline-block w-max">
                                {p}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-4 text-on-surface font-semibold">{so.totalQty} pcs</td>
                        <td className="p-4 text-on-surface-variant">{so.deadline}</td>
                        <td className="p-4 text-center">
                           <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider uppercase bg-[#EFF6FF] text-[#3B82F6]`}>
                            {so.status || 'Pending'}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button 
                            onClick={() => handleDeleteSOClick(so.id, so.firestoreIds)}
                            className="text-error hover:bg-error-container p-2 rounded-lg transition-colors"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {sos.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-on-surface-variant font-medium">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-[32px] opacity-50">receipt_long</span>
                            Belum ada data Sales Order.
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
          <>
            <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <p className="text-sm text-primary font-semibold tracking-wider uppercase mb-1">Sales Order Management</p>
                <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface">Entry Sales Order Baru</h2>
              </div>
              <div className="text-sm text-outline flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] cursor-pointer hover:text-error mr-2" onClick={() => setView('list')}>arrow_back</span>
                Kembali
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 flex flex-col gap-6">
                <div className="bg-surface-container-lowest rounded-xl p-8 flex flex-col gap-6 ghost-border">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm text-outline font-medium tracking-wider uppercase">Client Name</label>
                      <input 
                        className="w-full bg-surface-container-low text-on-surface text-lg py-4 px-5 rounded-xl border-none outline-none focus:ring-2 focus:ring-primary/40 transition-shadow placeholder:text-outline-variant font-medium ghost-border focus:ghost-border-primary" 
                        placeholder="Masukkan nama klien..." 
                        type="text"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-sm text-outline font-medium tracking-wider uppercase">Nomor Pesanan (PO Ref)</label>
                      <select 
                        className="w-full bg-surface-container-low text-on-surface text-lg py-4 px-5 rounded-xl border-none outline-none focus:ring-2 focus:ring-primary/40 transition-shadow appearance-none font-medium ghost-border focus:ghost-border-primary" 
                        value={poNumber}
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          setPoNumber(selectedId);
                          const selectedPO = savedPOs.find(p => p.id === selectedId);
                          if (selectedPO) {
                            setClientName(selectedPO.clientName || "");
                            setDeadline(selectedPO.deadline || "");
                            setNote(selectedPO.note || "");
                            
                            if (selectedPO.items) {
                              const prods = selectedPO.items.map((i: any) => i.productName).filter(Boolean);
                              setSelectedProducts(prods);
                              
                              const newQties: Record<string, Record<string, number>> = {};
                              selectedPO.items.forEach((item: any) => {
                                if (item.productName && item.quantities) {
                                  newQties[item.productName] = item.quantities;
                                }
                              });
                              setProductQuantities(newQties);
                            }
                          }
                        }}
                      >
                        <option value="">Pilih PO (Opsional)...</option>
                        {savedPOs.map(po => (
                          <option key={po.id} value={po.id}>{po.id} - {po.clientName}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm text-outline font-medium tracking-wider uppercase">Sales Order Number</label>
                      <input 
                        className="w-full bg-surface-container-low text-on-surface text-lg py-4 px-5 rounded-xl border-none outline-none focus:ring-2 focus:ring-primary/40 transition-shadow placeholder:text-outline-variant font-medium ghost-border focus:ghost-border-primary" 
                        placeholder="SO-2026-05-001" 
                        value={soNumber}
                        onChange={(e) => setSoNumber(e.target.value)}
                        type="text"
                      />
                    </div>
                    
                    <div className="flex flex-col gap-2 relative" ref={dropdownRef}>
                      <label className="text-sm text-outline font-medium tracking-wider uppercase">Product Name</label>
                      <div 
                        className="w-full bg-surface-container-low min-h-[60px] flex items-center flex-wrap gap-2 py-3 px-5 rounded-xl cursor-pointer ghost-border focus-within:ghost-border-primary transition-shadow relative"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      >
                        {selectedProducts.length === 0 ? (
                          <span className="text-outline-variant font-medium">Pilih produk...</span>
                        ) : (
                          selectedProducts.map(p => (
                            <span key={p} className="bg-surface-container-highest text-on-surface text-[13px] px-3 py-1 rounded-lg flex items-center gap-1.5 font-medium border border-outline-variant/10">
                              {p}
                              <span 
                                className="material-symbols-outlined text-[14px] hover:text-primary transition-colors hover:bg-surface-container-high rounded-full"
                                onClick={(e) => { e.stopPropagation(); toggleProduct(p); }}
                              >
                                close
                              </span>
                            </span>
                          ))
                        )}
                        <span 
                          className={`material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-outline pointer-events-none transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
                        >
                          expand_more
                        </span>
                      </div>
                      
                      <AnimatePresence>
                        {isDropdownOpen && (
                          <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.15 }}
                            className="absolute top-[85px] left-0 w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl shadow-ambient z-50 max-h-64 overflow-y-auto"
                          >
                            <div className="p-2 flex flex-col gap-1">
                              {availableProducts.length === 0 ? (
                                <div className="p-4 text-sm text-outline text-center flex items-center justify-center gap-2">
                                  <span className="material-symbols-outlined text-[18px]">category</span>
                                  Belum ada produk di Master Product
                                </div>
                              ) : (
                                availableProducts.map(p => (
                                  <label key={p} className="flex items-start gap-3 p-3 hover:bg-surface-container-low rounded-lg cursor-pointer transition-colors group">
                                    <input 
                                      type="checkbox" 
                                      checked={selectedProducts.includes(p)}
                                      onChange={() => toggleProduct(p)}
                                      className="mt-0.5 w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary/40 bg-surface accent-primary cursor-pointer"
                                    />
                                    <span className={`text-sm font-medium transition-colors ${selectedProducts.includes(p) ? 'text-primary' : 'text-on-surface'}`}>
                                      {p}
                                    </span>
                                  </label>
                                ))
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 mt-2">
                    <label className="text-sm text-outline font-medium tracking-wider uppercase">Special Instructions (Opsional)</label>
                    <textarea 
                      className="w-full bg-surface-container-low text-on-surface text-base py-4 px-5 rounded-xl border-none outline-none focus:ring-2 focus:ring-primary/40 transition-shadow placeholder:text-outline-variant resize-none ghost-border focus:ghost-border-primary" 
                      placeholder="Tambahkan catatan khusus untuk tim produksi..." 
                      rows={3}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    ></textarea>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 flex flex-col gap-6">
                <div className="bg-surface-container-lowest rounded-xl p-8 flex flex-col gap-8 h-full ghost-border max-h-[500px]">
                  <div className="flex flex-col gap-3 pb-6 border-b border-outline-variant/15 shrink-0">
                    <label className="text-sm text-on-tertiary-fixed-variant font-bold tracking-wider uppercase flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">schedule</span>
                      Date Line (Deadline)
                    </label>
                    <div className="relative">
                      <input 
                        className="w-full bg-surface-container-low text-on-surface text-2xl py-4 pl-5 pr-12 rounded-xl border-none outline-none focus:ring-2 focus:ring-primary/40 transition-shadow font-semibold appearance-none ghost-border" 
                        type="date"
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 flex-1 overflow-hidden">
                    {selectedProducts.length > 0 ? (
                      <div className="flex flex-col gap-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        <label className="text-sm text-outline font-medium tracking-wider uppercase">Target QTY per Size</label>
                        {selectedProducts.map(p => (
                          <div key={p} className="flex flex-col gap-3 bg-surface-container-low p-5 rounded-xl ghost-border">
                            <span className="text-sm font-bold text-on-surface border-b border-outline-variant/20 pb-2">{p}</span>
                            <div className="grid grid-cols-3 gap-3">
                              {SIZES.map(size => (
                                 <div key={size} className="flex items-center justify-between gap-1">
                                   <span className="text-xs font-semibold text-outline-variant w-8">{size}</span>
                                   <input 
                                     type="number" 
                                     min="0"
                                     className="w-full bg-surface-container-highest text-on-surface text-sm font-medium text-right py-2 px-2 rounded-lg border-none outline-none focus:ring-2 focus:ring-primary/40 tabular-nums transition-shadow"
                                     placeholder="0"
                                     value={productQuantities[p]?.[size] || ''}
                                     onChange={(e) => handleQuantityChange(p, size, e.target.value)}
                                   />
                                 </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-outline-variant/30 rounded-xl p-6 bg-surface-container-low/30">
                        <span className="material-symbols-outlined text-4xl text-outline mb-2">inventory_2</span>
                        <p className="text-sm text-outline font-medium text-center">Pilih produk di menu sebelah kiri untuk menentukan target kuantitas</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-12">
                <div className="bg-surface-container-lowest rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 ambient-shadow ghost-border">
                  <div className="flex items-start gap-4 w-full sm:w-auto">
                    <div className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-primary text-2xl">precision_manufacturing</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-on-surface">Check Material Availability</h3>
                      <p className="text-sm text-on-surface-variant">Validasi stok di WMS sebelum menyimpan Sales Order.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                    <div className="hidden md:flex bg-secondary-container px-4 py-2 rounded-lg items-center gap-2">
                      <span className="material-symbols-outlined text-on-secondary-container text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      <span className="text-sm font-semibold text-on-secondary-container">Material Tersedia</span>
                    </div>
                    <button 
                      className="bg-surface-container-lowest text-primary font-semibold px-6 py-3 rounded-lg hover:bg-surface-container-low transition-colors ghost-border" 
                      type="button"
                      onClick={() => navigate('/inventory')}
                    >
                      Cek Stok WMS
                    </button>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-12 flex items-center justify-end gap-4 mt-4 pt-6 mt-auto">
                <button 
                  className="text-primary font-semibold px-6 py-4 rounded-xl hover:bg-surface-container-low transition-colors" 
                  type="button"
                  onClick={() => setView('list')}
                >
                  Batal
                </button>
                <button 
                  className="bg-gradient-to-b from-primary to-primary-container text-on-primary font-bold px-10 py-4 rounded-xl shadow-[0_12px_40px_rgba(25,28,30,0.1)] hover:shadow-[0_16px_50px_rgba(25,28,30,0.15)] transition-all flex items-center gap-2" 
                  type="button"
                  onClick={async () => {
                    if (!clientName || !soNumber || selectedProducts.length === 0 || !deadline) {
                      setAlertMessage("Harap lengkapi Client Name, Sales Order Number, Product Name, dan Deadline!");
                      return;
                    }

                    const today = new Date();
                    const year = today.getFullYear();
                    const month = String(today.getMonth() + 1).padStart(2, '0');
                    if (soNumber.startsWith(`SO-${year}-${month}-`)) {
                      const seqParts = soNumber.split('-');
                      const seq = parseInt(seqParts[seqParts.length - 1], 10);
                      if (!isNaN(seq)) {
                        try {
                          await setDoc(doc(db, 'system_configs', 'so_sequence'), { value: seq + 1 });
                        } catch(e) {}
                      }
                    }

                    const newOrders = selectedProducts.map((p, idx) => {
                      const sizes = productQuantities[p] || {};
                      const qty = (Object.values(sizes) as number[]).reduce((s: number, val: number) => s + val, 0);
                      const dObj = new Date(deadline);
                      const formattedDeadline = isNaN(dObj.getTime()) ? '-' : dObj.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      });

                      const masterProduct = masterProducts.find((mp: any) => mp.name === p);
                      const productBom = masterProduct && masterProduct.bom ? masterProduct.bom : [];

                      return {
                        id: `${soNumber}-${idx + 1}`,
                        client: clientName,
                        poNumber: poNumber,
                        product: p,
                        qty: qty,
                        stage: 'Pending',
                        vendor: '',
                        deadline: formattedDeadline,
                        status: 'Pending',
                        note: note,
                        bom: productBom,
                        qtyKirim: '-',
                        tglKirim: '-',
                        qtyMasuk: '-',
                        target: '-',
                        aktual: '-',
                        selisih: '-'
                      };
                    });

                    try {
                      const batch = writeBatch(db);
                      newOrders.forEach(order => {
                        const docId = order.id.replace(/\//g, '-');
                        batch.set(doc(db, 'sales_orders', docId), order);
                      });
                      await batch.commit();
                      setAlertMessage("Sales Order berhasil disimpan!");
                      resetForm();
                      setView('list');
                    } catch(e) {
                      handleFirestoreError(e, OperationType.CREATE, 'sales_orders');
                    }
                  }}
                >
                  Simpan Sales Order
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl shadow-lg max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-headline font-bold text-on-surface mb-2">Konfirmasi Hapus</h3>
            <p className="text-on-surface-variant mb-6 text-sm">
              Apakah Anda yakin ingin menghapus Sales Order <span className="font-bold text-on-surface">{deleteConfirm.id}</span>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold rounded-lg transition-colors text-sm"
              >
                Batal
              </button>
              <button 
                onClick={confirmDeleteSO}
                className="px-4 py-2 bg-error hover:bg-error/90 text-on-error font-bold rounded-lg transition-colors text-sm"
              >
                Hapus SO
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
