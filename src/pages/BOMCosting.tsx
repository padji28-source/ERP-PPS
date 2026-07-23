import { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, getDocs, doc, updateDoc, writeBatch, setDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

export default function BOMCosting() {
  const { canUnlockBOM, currentUser } = useAuth();
  const [selectedPO, setSelectedPO] = useState('');
  const [poList, setPoList] = useState<any[]>([]);
  const [masterProducts, setMasterProducts] = useState<any[]>([]);

  const [boms, setBoms] = useState<Record<string, any[]>>({});

  // Costing config
  const [overhead, setOverhead] = useState('1500');
  const [upah, setUpah] = useState('4500');
  const [margin, setMargin] = useState('30');

  useEffect(() => {
    async function loadData() {
      try {
        const poSnapshot = await getDocs(collection(db, 'purchase_orders'));
        const pList: any[] = [];
        poSnapshot.forEach(doc => {
          const data = doc.data();
          let tQty = 0;
          if (data.items) {
            data.items.forEach((item: any) => {
              if (item.quantities) {
                tQty += Object.values(item.quantities).reduce((s: any, v: any) => s + (v || 0), 0) as number;
              }
            });
          }
          pList.push({
            ...data,
            id: doc.id,
            totalQty: tQty,
            title: data.items && data.items.length > 0 ? data.items[0].productName : 'No Product'
          });
        });
        setPoList(pList);
        if (pList.length > 0) setSelectedPO(pList[0].id);

        const mpSnapshot = await getDocs(collection(db, 'master_products'));
        const mList: any[] = [];
        const bomMap: Record<string, any[]> = {};
        mpSnapshot.forEach(doc => {
          const data = doc.data();
          mList.push({ ...data, id: doc.id });
          if (data.name && data.bom) {
            bomMap[data.name] = data.bom;
          }
        });
        setMasterProducts(mList);
        setBoms(bomMap);

      } catch (e) {
        handleFirestoreError(e, OperationType.GET, 'multiple_collections');
      }
    }
    loadData();
  }, []);

  const currentPO = poList.find(po => po.id === selectedPO);
  const currentProductName = currentPO?.items?.[0]?.productName || '';

  useEffect(() => {
    if (currentPO && currentPO.costing) {
      setOverhead(String(currentPO.costing.overhead || '1500'));
      setUpah(String(currentPO.costing.upah || '4500'));
      setMargin(String(currentPO.costing.margin || '30'));
    } else {
      setOverhead('1500');
      setUpah('4500');
      setMargin('30');
    }
  }, [currentPO]);

  // Cari BOM untuk product di currentPO
  let currentBOM: any[] = boms[currentProductName] || [];
  if (currentProductName && !boms[currentProductName]) {
      currentBOM = [
        { itemName: 'Kain Cotton Combed 30s', code: 'FB-COT30S', qtyPerPcs: 0.28, unit: 'kg', wastage: 6, price: 50000 },
        { itemName: 'Benang Spun Polyester', code: 'TH-PEA', qtyPerPcs: 0.05, unit: 'pcs', wastage: 10, price: 18000 },
        { itemName: 'Woven Satin Label', code: 'LB-SAT', qtyPerPcs: 1, unit: 'pcs', wastage: 1, price: 400 },
        { itemName: 'Kemasan Polybag', code: 'PK-POLY', qtyPerPcs: 1, unit: 'pcs', wastage: 1, price: 1200 },
      ];
  }

  const updateBOMItem = (idx: number, field: string, value: any) => {
    const newBoms = { ...boms };
    if (!newBoms[currentProductName]) {
      newBoms[currentProductName] = [...currentBOM];
    }
    newBoms[currentProductName][idx] = { ...newBoms[currentProductName][idx], [field]: value };
    setBoms(newBoms);
  };

  const addBOMItem = () => {
    const newBoms = { ...boms };
    if (!newBoms[currentProductName]) {
      newBoms[currentProductName] = [...currentBOM];
    }
    newBoms[currentProductName].push({
      itemName: 'Material Baru', code: 'NEW', qtyPerPcs: 0, unit: 'pcs', wastage: 0, price: 0
    });
    setBoms(newBoms);
  };
  
  const removeBOMItem = (idx: number) => {
    const newBoms = { ...boms };
    if (newBoms[currentProductName]) {
      newBoms[currentProductName] = newBoms[currentProductName].filter((_, i) => i !== idx);
      setBoms(newBoms);
    }
  };

  // Hitung Totals & Kebutuhan Kalkulator Manual
  const [bahanBakuPerPcs, setBahanBakuPerPcs] = useState('0.28');
  const [wastageLevel, setWastageLevel] = useState('7');
  const [calculatedKebutuhan, setCalculatedKebutuhan] = useState<number | null>(null);

  const poTotalQty = currentPO ? currentPO.totalQty : 0;
  
  const bomCostStats = currentBOM.reduce((acc, item) => {
    const wastageMultipler = 1 + ((item.wastage || 0) / 100);
    const qtyRequired = (item.qtyPerPcs || 0) * poTotalQty * wastageMultipler;
    const totalCost = qtyRequired * (item.price || 0);
    const costPerPcs = (item.qtyPerPcs || 0) * wastageMultipler * (item.price || 0);
    
    return {
      totalCost: acc.totalCost + totalCost,
      costPerPcs: acc.costPerPcs + costPerPcs,
    };
  }, { totalCost: 0, costPerPcs: 0 });

  const totalBOMCost = bomCostStats.totalCost;
  const totalBOMPerPcs = bomCostStats.costPerPcs;

  const hppPerPcs = totalBOMPerPcs + Number(overhead) + Number(upah);
  const targetProfit = hppPerPcs * (Number(margin) / 100);
  const suggestedSellingPrice = hppPerPcs + targetProfit;
  
  // Dapatkan harga jual aktual dari PO jika ada (harga rata-rata per item)
  let actualSellingPrice = 0;
  if (currentPO && currentPO.items && currentPO.items.length > 0) {
    actualSellingPrice = Number(currentPO.items[0].price || 0);
  }

  const handleCalculateKebutuhan = () => {
    if (poTotalQty > 0) {
      const bbp = Number(bahanBakuPerPcs) || 0;
      const was = Number(wastageLevel) || 0;
      const calc = Math.ceil((poTotalQty * bbp * (1 + (was/100))) / 25);
      setCalculatedKebutuhan(calc);
    } else {
      setCalculatedKebutuhan(0);
    }
  };

  useEffect(() => {
    setCalculatedKebutuhan(null); // reset when PO changes
  }, [selectedPO]);

  const currentMasterProduct = masterProducts.find(m => m.name === currentProductName);
  const isBOMLocked = currentMasterProduct?.bomLocked || false;

  const handleUnlockBOM = async () => {
    if (!canUnlockBOM) {
      alert('Akses Ditolak: Hanya Direktur / Owner yang memiliki wewenang untuk meng-unlock Menu BOM & Costing.');
      return;
    }
    if (!currentMasterProduct) return;
    
    try {
      await updateDoc(doc(db, 'master_products', currentMasterProduct.id), {
        bomLocked: false
      });
      setMasterProducts(masterProducts.map(m => m.id === currentMasterProduct.id ? { ...m, bomLocked: false } : m));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveBOM = async () => {
    if (!currentProductName || !currentPO) return;
    
    const mp = masterProducts.find(m => m.name === currentProductName);
    try {
      const batch = writeBatch(db);

      if (mp) {
        batch.update(doc(db, 'master_products', mp.id), {
          bom: currentBOM,
          bomLocked: true
        });
        setMasterProducts(masterProducts.map(m => m.id === mp.id ? { ...m, bomLocked: true } : m));
      } else {
        const newDocRef = doc(collection(db, 'master_products'));
        batch.set(newDocRef, {
          name: currentProductName,
          category: currentPO.items?.[0]?.category || 'General',
          bom: currentBOM,
          bomLocked: true
        });
        setMasterProducts([...masterProducts, {
          id: newDocRef.id,
          name: currentProductName,
          category: currentPO.items?.[0]?.category || 'General',
          bom: currentBOM,
          bomLocked: true
        }]);
      }

      // Save costing config to PO
      const docId = currentPO.id.replace(/\//g, '-');
      const poRef = doc(db, 'purchase_orders', docId);
      batch.update(poRef, {
        costing: {
          overhead: Number(overhead),
          upah: Number(upah),
          margin: Number(margin),
          hppPerPcs,
          suggestedSellingPrice
        }
      });

      await batch.commit();

      // Update local poList state so UI triggers if needed
      setPoList(prev => prev.map(p => 
        p.id === currentPO.id 
          ? { ...p, costing: { overhead: Number(overhead), upah: Number(upah), margin: Number(margin), hppPerPcs, suggestedSellingPrice } }
          : p
      ));
    } catch (e) {
      handleFirestoreError(e, mp ? OperationType.UPDATE : OperationType.CREATE, 'master_products');
    }
  };

  return (
    <div className="p-6 md:p-8 w-full h-full overflow-y-auto custom-scrollbar bg-[#F4F7FB] flex flex-col xl:flex-row gap-6">
      
      {/* Left Column */}
      <div className="w-full xl:w-[380px] shrink-0 flex flex-col gap-6">
        
        {/* PO List */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
           <h2 className="font-bold text-[15px] text-gray-900 uppercase tracking-wide">PILIH PO UNTUK ANALISIS BIAYA</h2>
           <p className="text-[13px] text-gray-500 mb-4 mt-1">Atur formulir BOM kain berdasarkan PO terpilih</p>
           
           <div className="flex flex-col gap-2.5 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
              {poList.length === 0 ? (
                <div className="text-sm text-gray-400 italic">Belum ada PO aktif.</div>
              ) : poList.map(po => (
                <div 
                  key={po.id} 
                  onClick={() => setSelectedPO(po.id)}
                  className={`border rounded-lg p-3.5 cursor-pointer transition-all ${
                    selectedPO === po.id 
                    ? 'bg-[#1D4ED8] border-[#1D4ED8] text-white shadow-md' 
                    : 'bg-white border-gray-200 text-gray-800 hover:border-blue-400 hover:shadow-sm'
                  }`}
                >
                   <div className="flex justify-between items-start mb-1.5">
                      <div className={`font-bold text-[13px] ${selectedPO === po.id ? 'text-blue-100' : 'text-gray-500'}`}>{po.id}</div>
                   </div>
                   <div className={`font-bold text-[15px] mb-1 leading-snug ${selectedPO === po.id ? 'text-white' : 'text-gray-900'}`}>{po.title}</div>
                   <div className="flex justify-between items-center mt-3">
                      <div className={`text-[12px] truncate pr-2 ${selectedPO === po.id ? 'text-blue-100' : 'text-gray-500'}`}>
                        Buyer: {po.clientName || '-'}
                      </div>
                      <div className={`text-[13px] font-bold whitespace-nowrap ${selectedPO === po.id ? 'text-white' : 'text-gray-900'}`}>{po.totalQty} pcs</div>
                   </div>
                </div>
              ))}
           </div>
        </div>

        {/* Kalkulator */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
           <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-[20px] text-gray-600">calculate</span>
              <h3 className="font-bold text-[14px] text-gray-900 uppercase">KALKULATOR KEBUTUHAN ROLL KAIN (PPC)</h3>
           </div>
           
           <div className="space-y-4">
              <div>
                 <label className="block text-[12px] font-bold text-gray-700 uppercase mb-1.5">BAHAN BAKU/PCS (KG/METER):</label>
                 <input 
                   type="number" 
                   step="0.01"
                   value={bahanBakuPerPcs} 
                   onChange={(e) => setBahanBakuPerPcs(e.target.value)}
                   className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[14px] font-semibold text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                 />
              </div>
              <div>
                 <label className="block text-[12px] font-bold text-gray-700 uppercase mb-1.5">WASTAGE ALLOWANCE (%):</label>
                 <input 
                   type="number" 
                   value={wastageLevel} 
                   onChange={(e) => setWastageLevel(e.target.value)}
                   className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[14px] font-semibold text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                 />
              </div>
              
              <button 
                onClick={handleCalculateKebutuhan}
                className="w-full bg-[#1D4ED8] hover:bg-blue-800 text-white font-bold py-2.5 rounded-lg text-[14px] mt-2 transition-colors"
               >
                 Hitung Kebutuhan Bahan
              </button>
              
              <div className="border border-gray-200 rounded-lg p-4 flex flex-col items-center justify-center mt-2 bg-gray-50/50">
                 <div className="text-[12px] font-bold text-gray-500 uppercase tracking-wide">KEBUTUHAN KAIN:</div>
                 <div className="text-[28px] font-extrabold text-gray-900 tracking-tight leading-none mt-1">
                   {calculatedKebutuhan !== null ? calculatedKebutuhan : '-'} <span className="text-[20px]">Roll</span>
                 </div>
                 <div className="text-[11px] text-gray-400 mt-1">Estimasi standar (25 kg / roll)</div>
              </div>
           </div>
        </div>

      </div>

      {/* Right Column */}
      <div className="flex-1 flex flex-col relative bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden min-w-[700px]">
         
         <div className="p-6 md:p-8 flex-1 overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
               <div>
                  <span className="inline-block border border-blue-200 bg-blue-50 text-blue-600 text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider mb-3">BOM COSTING SHEET</span>
                  <h1 className="text-[20px] font-extrabold text-gray-900 uppercase">BILL OF MATERIALS - {currentPO ? currentPO.title : '...'}</h1>
               </div>
               <span className="material-symbols-outlined text-[24px] text-gray-400">content_cut</span>
            </div>

            <div className="w-full h-px bg-gray-200 mb-6"></div>

            {/* Table */}
            <div className="overflow-x-auto mb-8">
               <table className="w-full text-left border-collapse">
                  <thead>
                     <tr className="border-b-2 border-gray-200">
                        <th className="py-3 px-2 text-[12px] font-bold uppercase text-gray-500 tracking-wide w-[250px]">NAMA MATERIAL</th>
                        <th className="py-3 px-2 text-[12px] font-bold uppercase text-gray-500 tracking-wide text-center">PEMAKAIAN / PCS</th>
                        <th className="py-3 px-2 text-[12px] font-bold uppercase text-gray-500 tracking-wide text-center">WASTAGE %</th>
                        <th className="py-3 px-2 text-[12px] font-bold uppercase text-gray-500 tracking-wide text-right">HARGA SATUAN</th>
                        <th className="py-3 px-2 text-[12px] font-bold uppercase text-gray-500 tracking-wide text-center bg-gray-50/50">QTY DIBUTUHKAN</th>
                        <th className="py-3 px-2 text-[12px] font-bold uppercase text-gray-500 tracking-wide text-right whitespace-nowrap bg-gray-50/50">TOTAL BIAYA</th>
                        <th className="py-3 px-2 text-[12px] font-bold uppercase text-gray-500 tracking-wide text-center w-[50px]">AKSI</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                     {currentBOM.length === 0 ? (
                        <tr><td colSpan={7} className="py-4 text-center text-gray-500 italic">BOM belum didefinisikan untuk produk ini.</td></tr>
                     ) : (
                        currentBOM.map((item, idx) => {
                           const wastageMultipler = 1 + ((item.wastage || 0) / 100);
                           const qtyRequired = (item.qtyPerPcs || 0) * poTotalQty * wastageMultipler;
                           const totalCost = qtyRequired * (item.price || 0);

                           return (
                              <tr key={idx}>
                                 <td className="py-2 px-2">
                                 <input 
                                    type="text" 
                                    value={item.itemName || item.name || ''} 
                                    onChange={e => updateBOMItem(idx, item.itemName ? 'itemName' : 'name', e.target.value)}
                                    disabled={isBOMLocked}
                                    className={`w-full text-[13px] font-bold text-gray-900 border border-gray-200 rounded px-2 py-1 outline-none ${isBOMLocked ? 'bg-gray-50' : 'focus:border-blue-500'}`}
                                 />
                                 <div className="flex gap-2 mt-1">
                                    <input 
                                       type="text" 
                                       value={item.code || ''} 
                                       onChange={e => updateBOMItem(idx, 'code', e.target.value)}
                                       placeholder="Kode"
                                       disabled={isBOMLocked}
                                       className={`w-16 text-[11px] font-mono text-gray-400 uppercase border border-gray-200 rounded px-1 py-0.5 outline-none ${isBOMLocked ? 'bg-gray-50' : 'focus:border-blue-500'}`}
                                    />
                                    <input 
                                       type="text" 
                                       value={item.unit || ''} 
                                       onChange={e => updateBOMItem(idx, 'unit', e.target.value)}
                                       placeholder="Unit (kg/pcs)"
                                       disabled={isBOMLocked}
                                       className={`w-20 text-[11px] text-gray-500 border border-gray-200 rounded px-1 py-0.5 outline-none ${isBOMLocked ? 'bg-gray-50' : 'focus:border-blue-500'}`}
                                    />
                                 </div>
                                 </td>
                                 <td className="py-2 px-2 text-center">
                                    <input type="number" step="0.01" value={item.qtyPerPcs || 0} disabled={isBOMLocked} onChange={e => updateBOMItem(idx, 'qtyPerPcs', Number(e.target.value))} className={`w-16 text-center text-[13px] font-semibold text-gray-800 border border-gray-200 rounded px-1 py-1 outline-none ${isBOMLocked ? 'bg-gray-50' : 'focus:border-blue-500'}`} />
                                 </td>
                                 <td className="py-2 px-2 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                    <input type="number" value={item.wastage || 0} disabled={isBOMLocked} onChange={e => updateBOMItem(idx, 'wastage', Number(e.target.value))} className={`w-12 text-center text-[13px] font-medium text-gray-500 border border-gray-200 rounded px-1 py-1 outline-none ${isBOMLocked ? 'bg-gray-50' : 'focus:border-blue-500'}`} />
                                    <span className="text-[12px] text-gray-500">%</span>
                                    </div>
                                 </td>
                                 <td className="py-2 px-2 text-right">
                                    <input type="number" value={item.price || 0} disabled={isBOMLocked} onChange={e => updateBOMItem(idx, 'price', Number(e.target.value))} className={`w-24 text-right text-[13px] font-semibold text-gray-800 border border-gray-200 rounded px-2 py-1 outline-none ${isBOMLocked ? 'bg-gray-50' : 'focus:border-blue-500'}`} />
                                 </td>
                                 <td className="py-2 px-2 text-[14px] font-semibold text-gray-800 text-center bg-gray-50/50">{qtyRequired.toLocaleString('id-ID', {maximumFractionDigits: 2})}</td>
                                 <td className="py-2 px-2 text-[14px] font-bold text-gray-900 text-right whitespace-nowrap bg-gray-50/50">Rp {totalCost.toLocaleString('id-ID', {maximumFractionDigits: 0})}</td>
                                 <td className="py-2 px-2 text-center">
                                    <button 
                                      onClick={() => removeBOMItem(idx)} 
                                      disabled={isBOMLocked}
                                      className={`p-1.5 rounded-lg transition-colors ${isBOMLocked ? 'text-gray-300 bg-gray-50 cursor-not-allowed' : 'text-red-500 hover:text-red-700 bg-red-50'}`}>
                                    <span className="material-symbols-outlined text-[16px]">delete</span>
                                    </button>
                                 </td>
                              </tr>
                           );
                        })
                     )}
                     <tr>
                        <td colSpan={7} className="py-3 px-2 text-center">
                           {!isBOMLocked && (
                             <button 
                               onClick={addBOMItem}
                               className="text-[13px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 py-1.5 px-4 rounded-lg inline-flex items-center gap-1 transition-colors"
                             >
                               <span className="material-symbols-outlined text-[16px]">add</span> Tambah Material BOM
                             </button>
                           )}
                        </td>
                     </tr>
                  </tbody>
               </table>
            </div>

            {/* Config Box */}
            <div className="border border-gray-200 rounded-xl p-6 bg-gray-50/50 mb-8 flex flex-col md:flex-row gap-6">
               <div className="flex-1">
                 <label className="block text-[12px] font-bold text-gray-600 uppercase mb-2">OVERHEAD PABRIK / PCS (RP):</label>
                 <input type="number" value={overhead} onChange={e => setOverhead(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-[14px] font-semibold text-gray-900 bg-white" />
                 <p className="text-[11px] text-gray-400 mt-2 font-medium">Biaya listrik, utilitas, oli, pisau, dll</p>
               </div>
               <div className="flex-1">
                 <label className="block text-[12px] font-bold text-gray-600 uppercase mb-2">UPAH GAJI BORONGAN / PCS (RP):</label>
                 <input type="number" value={upah} onChange={e => setUpah(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-[14px] font-semibold text-gray-900 bg-white" />
                 <p className="text-[11px] text-gray-400 mt-2 font-medium">Total upah potong + jahit + finsihing QC</p>
               </div>
               <div className="flex-1">
                 <label className="block text-[12px] font-bold text-gray-600 uppercase mb-2">TARGET PROFIT MARGIN (%):</label>
                 <input type="number" value={margin} onChange={e => setMargin(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-[14px] font-semibold text-gray-900 bg-white" />
                 <p className="text-[11px] text-gray-400 mt-2 font-medium">Persentase profit target di atas HPP</p>
               </div>
            </div>

            {/* Summary */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-[100px]">
               <div className="space-y-2">
                  <h3 className="font-bold text-[14px] text-gray-900 uppercase flex items-center gap-1.5 mb-3">
                     <span className="material-symbols-outlined text-[18px]">attach_money</span>
                     KALKULASI STRUKTUR HARGA GARMEN
                  </h3>
                  <div className="text-[13px] text-gray-800 font-medium">Biaya Bahan Baku (BOM Sheet): <span className="font-bold whitespace-nowrap">Rp {totalBOMPerPcs.toLocaleString('id-ID', {maximumFractionDigits: 0})} / pcs</span></div>
                  <div className="text-[13px] text-gray-800 font-medium">Harga Pokok Produksi (HPP): <span className="font-bold whitespace-nowrap">Rp {hppPerPcs.toLocaleString('id-ID', {maximumFractionDigits: 0})} / pcs</span></div>
                  <div className="text-[13px] text-gray-800 font-medium">Harga Jual Saat Ini di PO: <span className="font-bold whitespace-nowrap">Rp {actualSellingPrice.toLocaleString('id-ID')} / pcs</span></div>
               </div>
               
               <div className="bg-[#111827] rounded-xl p-5 w-[280px] text-center shadow-lg border border-gray-800 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 mt-1">SUGGESTED SELLING PRICE:</div>
                  <div className="text-[32px] font-black text-white tracking-tight leading-none mb-3">
                     <span className="text-[20px] text-gray-400 font-bold mr-1">Rp</span>{suggestedSellingPrice.toLocaleString('id-ID', {maximumFractionDigits: 0})}
                  </div>
                  <div className="inline-block border border-green-500/30 bg-green-500/10 text-green-400 text-[12px] font-bold px-3 py-1 rounded-md">
                     Margin: +Rp {targetProfit.toLocaleString('id-ID', {maximumFractionDigits: 0})} ({margin}%)
                  </div>
               </div>
            </div>
         </div>

         {/* Bottom Action Footer */}
         <div className="absolute bottom-0 left-0 w-full bg-white border-t border-gray-200 p-4 px-6 flex justify-end gap-3 items-center">
            {isBOMLocked ? (
               <>
                 <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-lg text-sm font-bold border border-amber-200">
                    <span className="material-symbols-outlined text-[18px]">lock</span>
                    BOM Terkunci
                 </div>
                 <button 
                   onClick={handleUnlockBOM} 
                   className={`border font-bold py-2.5 px-6 rounded-lg text-[14px] flex items-center gap-2 transition-colors ${
                     canUnlockBOM 
                       ? 'bg-white border-gray-300 hover:bg-gray-50 text-gray-700' 
                       : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                   }`}
                   title={canUnlockBOM ? 'Unlock BOM & Costing' : 'Khusus Direktur / Owner'}
                 >
                    <span className="material-symbols-outlined text-[18px]">{canUnlockBOM ? 'lock_open' : 'lock'}</span>
                    {canUnlockBOM ? 'Unlock (Owner)' : 'Unlock (Khusus Direktur)'}
                 </button>
               </>
            ) : (
               <button onClick={handleSaveBOM} className="bg-[#1D4ED8] hover:bg-blue-800 text-white font-bold py-2.5 px-6 rounded-lg text-[14px] flex items-center gap-2 transition-colors">
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  Simpan BOM & Konfirmasi Costing
               </button>
            )}
         </div>

      </div>

    </div>
  );
}
