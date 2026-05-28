import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

export default function Dashboard() {
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [activePO, setActivePO] = useState(0);
  const [inventorySKUs, setInventorySKUs] = useState(0);
  const [needReorder, setNeedReorder] = useState(0);
  const [poData, setPoData] = useState<any[]>([]);
  const [pieData, setPieData] = useState<any[]>([]);
  const [soData, setSoData] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        // Load PO
        const posSnapshot = await getDocs(collection(db, 'purchase_orders'));
        let rev = 0;
        let cPO = 0;
        const tempPoData: any[] = [];
        posSnapshot.forEach((doc) => {
          const po = doc.data();
          cPO++;
          let bVolume = 0;
          if (po.items) {
            po.items.forEach((item: any) => {
              const q = Object.values(item.quantities || {}).reduce((s: any, val: any) => s + (val || 0), 0) as number;
              rev += q * (item.price || 0);
              bVolume += q;
            });
          }
          tempPoData.push({ name: po.id, volume: bVolume });
        });
        setTotalRevenue(rev);
        setActivePO(cPO);
        setPoData(tempPoData);

        // Load Inventory
        const invSnapshot = await getDocs(collection(db, 'wms_inventory'));
        let skus = 0;
        let reorders = 0;
        const catMap: Record<string, number> = {};
        invSnapshot.forEach((doc) => {
          const item = doc.data();
          skus++;
          if (item.stock < 10) reorders++;
          if (item.category) {
            catMap[item.category] = (catMap[item.category] || 0) + 1;
          }
        });
        setInventorySKUs(skus);
        setNeedReorder(reorders);
        
        const colors = ['#1D4ED8', '#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#6366F1'];
        const pData = Object.keys(catMap).map((k, i) => ({
          name: k.toUpperCase(),
          value: catMap[k],
          color: colors[i % colors.length]
        }));
        setPieData(pData.length ? pData : [
          { name: 'FABRIC', value: 1, color: '#1D4ED8' } // fallback
        ]);

        // Load SO untuk line jahit
        const soSnapshot = await getDocs(collection(db, 'sales_orders'));
        const soList: any[] = [];
        soSnapshot.forEach(doc => {
          soList.push(doc.data());
        });
        setSoData(soList);

      } catch (e) {
        handleFirestoreError(e, OperationType.GET, 'multiple_collections');
      }
    }
    loadData();
  }, []);

  const sewingSO = soData.filter(so => so.stage === 'Sewing');

  return (
    <div className="w-full h-full p-6 md:p-8 overflow-y-auto custom-scrollbar bg-[#F6F8FB]">
      
      {/* Alert Banner */}
      {needReorder > 0 && (
        <div className="bg-[#FFF8F1] border border-[#F97316] rounded-md p-4 mb-6 shadow-sm flex items-start gap-3">
          <span className="material-symbols-outlined text-[#F97316] text-[20px] font-bold mt-0.5">warning</span>
          <div>
            <h4 className="text-[#F97316] font-bold text-[14px] mb-1 uppercase tracking-wide">AI ALERTS - PERINGATAN STOK</h4>
            <p className="text-[#B45309] text-[13px] font-medium">• {needReorder} bahan baku telah mencapai batas minimum dan butuh re-order segera!</p>
          </div>
        </div>
      )}

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Card 1 */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm flex flex-col justify-between">
           <div>
              <div className="text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-2">TOTAL REVENUE ORDER</div>
              <div className="text-[26px] font-bold text-gray-900 leading-tight">Rp {totalRevenue.toLocaleString('id-ID')}</div>
           </div>
           <div className="flex justify-between items-end mt-4">
              <div className="flex items-center text-[#10B981] text-[13px] font-bold gap-1 mt-2">
                 <span className="material-symbols-outlined text-[16px]">trending_up</span> Target Terpenuhi
              </div>
              <div className="text-gray-400 text-[12px]">Secured</div>
           </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm flex flex-col justify-between">
           <div>
              <div className="text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-2">ACTIVE PRODUCTION PO</div>
              <div className="flex items-center gap-2">
                <div className="text-[26px] font-bold text-gray-900 leading-tight">{activePO} PO</div>
                <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[11px] font-bold">Live</span>
              </div>
           </div>
           <div className="text-gray-500 text-[13px] mt-4">
              {sewingSO.length} SO sedang berada di Sewing Line
           </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm flex flex-col justify-between">
           <div>
              <div className="text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-2">MATERIAL INVENTORY STATUS</div>
              <div className="text-[26px] font-bold text-gray-900 leading-tight">{inventorySKUs} SKUs</div>
           </div>
           <div className="flex items-center text-gray-500 text-[13px] gap-1.5 mt-4">
              <span className={`w-2 h-2 rounded-full ${needReorder > 0 ? 'bg-[#F97316]' : 'bg-[#10B981]'}`}></span> {needReorder} bahan baku butuh re-order
           </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm flex flex-col justify-between">
           <div>
              <div className="text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-2">REJECT RATE (QC)</div>
              <div className="flex items-center gap-2">
                <div className="text-[26px] font-bold text-gray-900 leading-tight">3.0%</div>
                <span className="text-gray-400 text-[13px]">Stable</span>
              </div>
           </div>
           <div className="text-gray-400 text-[12px] italic mt-4">
              Major defect: Jarum patah / noda minyak
           </div>
        </div>
      </div>

      {/* Middle Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Bar Chart */}
        <div className="col-span-1 lg:col-span-2 bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
           <div className="flex justify-between items-start mb-6">
             <div>
               <h3 className="text-[14px] font-bold text-gray-800 uppercase tracking-wide">VOLUME PO & PROGRESS PENYELESAIAN</h3>
               <p className="text-[12px] text-gray-500 mt-1">Distribusi jumlah pesanan per PO dan efisiensi pengerjaan</p>
             </div>
             <span className="material-symbols-outlined text-gray-400 text-[20px]">show_chart</span>
           </div>
           
           <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={poData.length ? poData : [{name: 'No Data', volume: 0}]} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={{ stroke: '#D1D5DB' }} 
                    tickLine={false} 
                    tick={{fontSize: 12, fill: '#6B7280', dy: 10}} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 12, fill: '#9CA3AF', dx: -10}} 
                  />
                  <Tooltip 
                    cursor={{fill: '#F3F4F6'}} 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                  />
                  <Bar dataKey="volume" fill="#2563EB" />
                </BarChart>
              </ResponsiveContainer>
           </div>
           <div className="flex justify-center items-center gap-2 mt-[-10px]">
              <span className="w-3.5 h-3.5 bg-[#2563EB] rounded-sm"></span>
              <span className="text-[12px] font-medium text-blue-600">Volume Kain PO</span>
           </div>
        </div>

        {/* Donut Chart */}
        <div className="col-span-1 bg-white border border-gray-200 rounded-lg p-6 shadow-sm flex flex-col">
           <div>
             <h3 className="text-[14px] font-bold text-gray-800 uppercase tracking-wide">KATEGORI INVENTORI GUDANG</h3>
             <p className="text-[12px] text-gray-500 mt-1">Proporsi jenis SKU kain & aksesoris</p>
           </div>
           
           <div className="flex-1 flex flex-col justify-center items-center mt-6">
             <div className="h-[180px] w-full relative">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                 </PieChart>
               </ResponsiveContainer>
             </div>
             
             {/* Legend */}
             <div className="grid grid-cols-2 gap-x-8 gap-y-3 mt-6 w-full px-4">
                {pieData.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }}></span>
                    <span className="text-[11px] font-bold text-gray-600">{item.name} ({item.value})</span>
                  </div>
                ))}
             </div>
           </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
         {/* Activities */}
         <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
               <h3 className="text-[14px] font-bold text-gray-800 uppercase tracking-wide">AKTIFITAS SEWING LINE</h3>
               <button className="bg-blue-50 text-blue-600 font-bold px-3 py-1.5 rounded text-[12px] flex items-center gap-1.5 hover:bg-blue-100 transition-colors">
                  <span className="material-symbols-outlined text-[16px]">schedule</span> LIVE PPC
               </button>
            </div>

            <div className="space-y-6 mt-6">
               {sewingSO.length > 0 ? sewingSO.map((so, idx) => (
                 <div key={idx}>
                    <div className="flex justify-between items-center mb-1">
                       <h4 className="font-bold text-[14px] text-gray-900">{so.id} - Line Jahit</h4>
                       <span className="font-bold text-[14px] text-blue-600">30%</span>
                    </div>
                    <div className="text-[13px] text-gray-600 mb-2">Style: <span className="font-bold text-gray-800">{so.product}</span> | Qty: {so.qty}</div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                       <div className="h-full bg-blue-600 rounded-full" style={{ width: '30%' }}></div>
                    </div>
                 </div>
               )) : (
                 <div className="text-[13px] text-gray-500 italic text-center py-4">Belum ada SO di line sewing.</div>
               )}
            </div>
         </div>

         {/* System Logs */}
         <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm flex flex-col">
            <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-4">
               <div>
                 <h3 className="text-[14px] font-bold text-gray-800 uppercase tracking-wide">LOG AKTIVITAS TERINTEGRASI</h3>
                 <p className="text-[12px] text-gray-500 mt-1">Jejak audit otomatis transaksi pabrik</p>
               </div>
               <span className="material-symbols-outlined text-emerald-500 text-[20px]">timeline</span>
            </div>

            <div className="flex-1 space-y-5 pt-2 flex flex-col justify-center text-center text-gray-500 text-sm italic">
               (Module log aktivitas real-time akan diaktifkan segera)
            </div>

            <div className="mt-8 pt-4 border-t border-gray-100 flex justify-between items-center">
               <div className="text-[12px] font-mono text-gray-400">
                  Status: Stable 
               </div>
               <button className="border border-blue-200 text-blue-600 font-bold px-4 py-1.5 rounded-lg text-[12px] hover:bg-blue-50 transition-colors flex items-center gap-1.5">
                  Konsultasi AI Smart PPC <span className="material-symbols-outlined text-[14px]">arrow_outward</span>
               </button>
            </div>
         </div>
      </div>
    </div>
  );
}
