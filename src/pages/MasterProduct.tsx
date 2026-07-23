import { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

interface BOMItem {
  material: string;
  qty: string;
  unit: string;
}

interface Product {
  id: string;
  name: string;
  category: string;
  bom: BOMItem[];
}

export default function MasterProduct() {
  const { canEditMasterProduct } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [dataGudang, setDataGudang] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState<Product>({ id: '', name: '', category: 'Pakaian', bom: [] });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const qs = await getDocs(collection(db, 'master_products'));
      const prods: Product[] = [];
      qs.forEach(d => {
        prods.push({ id: d.id, ...d.data() } as Product);
      });
      setProducts(prods);

      const qsGudang = await getDocs(collection(db, 'warehouse_items'));
      const dg: any[] = [];
      qsGudang.forEach(d => {
        dg.push({ id: d.id, ...d.data() });
      });
      setDataGudang(dg);
    } catch(e) {
      handleFirestoreError(e, OperationType.GET, 'master_products');
    }
  };

  const saveProduct = async () => {
    const newId = formData.id || `PRD-${Math.floor(Math.random() * 10000)}`;
    const prodToSave = { ...formData, id: newId };
    
    try {
      await setDoc(doc(db, 'master_products', newId), prodToSave);
      
      let newProducts;
      const existingIndex = products.findIndex(p => p.id === formData.id);
      if (existingIndex >= 0) {
        newProducts = [...products];
        newProducts[existingIndex] = prodToSave;
      } else {
        newProducts = [...products, prodToSave];
      }

      setProducts(newProducts);
      setShowAdd(false);
      setFormData({ id: '', name: '', category: 'Pakaian', bom: [] });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'master_products');
    }
  };

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const deleteProduct = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, 'master_products', deleteId));
      const filtered = products.filter(p => p.id !== deleteId);
      setProducts(filtered);
      setDeleteId(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'master_products');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-surface-container-low w-full overflow-hidden mx-auto relative">
      <header className="flex-none px-4 lg:px-8 py-5 lg:py-6 flex justify-between items-center bg-white/50 backdrop-blur-md border-b border-[#E2E8F0] shadow-sm relative z-10">
        <div>
          <h2 className="text-2xl lg:text-3xl font-extrabold text-[#1E293B] tracking-tight">Master Product</h2>
          <p className="text-[#64748B] mt-1.5 text-sm font-medium">Kelola data produk jadi dan Bill of Materials (BOM)</p>
        </div>
        {canEditMasterProduct && (
          <button onClick={() => setShowAdd(true)} className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm">
            <span className="material-symbols-outlined text-[20px]">add</span> Tambah Product
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-4 lg:px-8 py-6 custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map(p => (
            <div key={p.id} className="bg-white p-5 rounded-3xl shadow-sm border border-[#E2E8F0] flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg text-[#1E293B] line-clamp-1">{p.name}</h3>
                  <span className="text-xs font-bold text-[#64748B] uppercase tracking-widest">{p.id} • {p.category}</span>
                </div>
                {canEditMasterProduct && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => { setFormData(p); setShowAdd(true); }} className="text-blue-500 hover:bg-blue-50 p-2 rounded-xl transition-colors">
                      <span className="material-symbols-outlined text-xl">edit</span>
                    </button>
                    <button onClick={() => setDeleteId(p.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-xl transition-colors">
                      <span className="material-symbols-outlined text-xl">delete</span>
                    </button>
                  </div>
                )}
              </div>
              <div className="mt-3 border-t border-[#F1F5F9] pt-4">
                <h4 className="text-[11px] font-black text-[#94A3B8] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">account_tree</span>
                  Bill of Materials
                </h4>
                {p.bom.length === 0 ? (
                  <div className="bg-[#F8FAFC] rounded-xl p-4 text-center">
                    <p className="text-sm text-[#94A3B8] font-medium">Belum ada BOM.</p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {p.bom.map((b, i) => (
                      <li key={i} className="text-sm flex justify-between items-center bg-[#F8FAFC] px-3 py-2 rounded-xl border border-[#E2E8F0]">
                        <span className="font-bold text-[#475569]">{b.material}</span>
                        <span className="text-[#3B82F6] font-extrabold bg-[#EFF6FF] px-2 py-0.5 rounded text-xs">{b.qty} {b.unit}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
          {products.length === 0 && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-[#64748B]">
              <div className="w-20 h-20 bg-[#F1F5F9] rounded-full flex items-center justify-center mb-4 text-[#94A3B8]">
                <span className="material-symbols-outlined text-4xl">inventory_2</span>
              </div>
              <p className="text-lg font-bold text-[#1E293B] mb-1">Belum ada Produk</p>
              <p className="text-sm font-medium">Klik Tambah Product untuk memulai.</p>
            </div>
          )}
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-xl shadow-xl animate-fade-in max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-xl font-extrabold text-[#1E293B] mb-5">{formData.id ? 'Edit Product' : 'Tambah Product'}</h3>
            <div className="space-y-5">
              <div>
                <label className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2 block">Nama Product</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm font-bold text-[#1E293B]"
                  placeholder="Misal: Kemeja Lengan Pendek"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2 block">Kategori</label>
                <select 
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm font-bold text-[#1E293B]"
                >
                  <option value="Pakaian">Pakaian</option>
                  <option value="Aksesoris">Aksesoris</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-[#E2E8F0]">
                <div className="flex justify-between items-center mb-3 border-b border-[#E2E8F0] pb-3">
                  <label className="text-xs font-black text-[#64748B] uppercase tracking-widest flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">account_tree</span>
                    Bill of Material (BOM)
                  </label>
                  <button type="button" onClick={() => setFormData({...formData, bom: [...formData.bom, { material: '', qty: '', unit: '' }]})} className="text-xs text-primary font-bold hover:underline bg-[#EFF6FF] px-2 py-1 rounded">
                    + Tambah Material
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.bom.map((b, i) => (
                    <div key={i} className="flex gap-2">
                      <select 
                        value={b.material} 
                        onChange={e => {
                          const newBom = [...formData.bom]; 
                          const selectedMaterialName = e.target.value;
                          const selectedItem = dataGudang.find(item => item.name === selectedMaterialName);
                          newBom[i].material = selectedMaterialName; 
                          if (selectedItem) {
                            newBom[i].unit = selectedItem.satuan || '';
                          }
                          setFormData({...formData, bom: newBom});
                        }} 
                        className="flex-1 bg-white border border-[#E2E8F0] rounded-xl px-3 py-2 outline-none text-sm font-medium"
                      >
                        <option value="" disabled>Pilih Material dari Gudang</option>
                        {dataGudang.map(item => (
                          <option key={item.kode} value={item.name}>{item.name}</option>
                        ))}
                      </select>
                      <input type="number" placeholder="Qty" value={b.qty} onChange={e => {
                        const newBom = [...formData.bom]; newBom[i].qty = e.target.value; setFormData({...formData, bom: newBom});
                      }} className="w-20 bg-white border border-[#E2E8F0] rounded-xl px-3 py-2 outline-none text-sm font-medium"/>
                      <input type="text" placeholder="Unit" value={b.unit} disabled className="w-20 bg-gray-50 border border-[#E2E8F0] rounded-xl px-3 py-2 outline-none text-sm font-medium opacity-70"/>
                      <button type="button" onClick={() => {
                        const newBom = [...formData.bom]; newBom.splice(i, 1); setFormData({...formData, bom: newBom});
                      }} className="text-red-500 hover:bg-red-50 p-2 rounded-xl transition-colors"><span className="material-symbols-outlined text-sm">close</span></button>
                    </div>
                  ))}
                  {formData.bom.length === 0 && (
                    <p className="text-xs text-[#94A3B8] italic text-center py-2">Klik 'Tambah Material' untuk memasukkan BOM product ini.</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setShowAdd(false); setFormData({ id: '', name: '', category: 'Pakaian', bom: [] }); }} className="px-5 py-2.5 font-bold text-[#64748B] hover:bg-[#F1F5F9] rounded-xl transition-colors">Batal</button>
              <button 
                onClick={saveProduct} 
                disabled={!formData.name}
                className="px-5 py-2.5 bg-[#1E293B] text-white font-bold rounded-xl hover:bg-black transition-colors disabled:opacity-50"
              >
                Simpan Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-[#1E293B] mb-2">Konfirmasi Hapus</h3>
            <p className="text-[#64748B] mb-6 text-sm">
              Yakin ingin menghapus produk <span className="font-bold text-[#1E293B]">{deleteId}</span>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#64748B] font-bold rounded-xl transition-colors text-sm"
              >
                Batal
              </button>
              <button 
                onClick={deleteProduct}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors text-sm"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
