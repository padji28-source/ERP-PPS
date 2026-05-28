import React, { useState, useEffect } from 'react';
import { 
  Activity, Award, BarChart3, CheckCircle2,
  LayoutDashboard, LogIn, LogOut, Package,
  QrCode, Camera, Plus, ArrowLeft, Scissors, ArrowRight,
  ShieldAlert, Sliders, User, Edit3, Truck, AlertTriangle, Info,
  Bell, CheckSquare, FileCheck
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, getDocs, doc, updateDoc, setDoc, writeBatch } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const APP_BRAND = {
  name: "PARAHITA ERP",
  tagline: "Operator Mobile",
  accentColor: "#F59E0B"
};

const generateId = (prefix = "") => `${prefix}${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

const STATUS_COLORS: Record<string, string> = {
  'Pending': 'bg-slate-100 text-slate-600 border-slate-200',
  'Approved': 'bg-blue-50 text-blue-600 border-blue-200',
  'Pattern': 'bg-blue-100 text-blue-700 border-blue-300',
  'Cutting': 'bg-blue-100 text-blue-700 border-blue-300',
  'Bordir': 'bg-blue-100 text-blue-700 border-blue-300',
  'Sablon': 'bg-blue-100 text-blue-700 border-blue-300',
  'Interim QC': 'bg-orange-100 text-orange-700 border-orange-300',
  'Sewing': 'bg-blue-100 text-blue-700 border-blue-300',
  'QC': 'bg-orange-100 text-orange-700 border-orange-300',
  'Packing': 'bg-blue-100 text-blue-700 border-blue-300',
  'Shipping': 'bg-blue-100 text-blue-700 border-blue-300',
  'Reject': 'bg-red-100 text-red-700 border-red-300',
  'Rework': 'bg-red-100 text-red-700 border-red-300',
  'Selesai': 'bg-green-100 text-green-700 border-green-300',
};

export default function MobileApp() {
  const navigate = useNavigate();
  const [salesOrders, setSalesOrders] = useState<any[]>([]);
  const [productionJobs, setProductionJobs] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  
  const [selectedRole, setSelectedRole] = useState("Owner");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [toastMessage, setToastMessage] = useState<any>(null);

  const [currentPhoneScreen, setCurrentPhoneScreen] = useState("login");
  const [cameraMockActive, setCameraMockActive] = useState(false);
  const [activeJobFocus, setActiveJobFocus] = useState<string | null>(null);
  
  const [materialForm, setMaterialForm] = useState({ id: "", itemCode: "", itemName: "", stock: 0, category: "Fabric" });
  const [isEditingMaterial, setIsEditingMaterial] = useState(false);
  const [qcForm, setQcForm] = useState({ passed: 0, rework: 0, reject: 0, defect: "", type: "Interim QC" });
  const [cuttingRoute, setCuttingRoute] = useState("Sablon");

  const showToast = (message: string, type = 'info') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    try {
      const soSnap = await getDocs(collection(db, 'sales_orders'));
      const soList: any[] = [];
      soSnap.forEach(d => soList.push({ ...d.data(), id: d.id }));
      
      const pureSo = soList.reduce((acc, curr) => {
        const baseId = curr.id.split('-')[0];
        if (!acc.find((s:any) => s.id === baseId)) {
          acc.push({ ...curr, id: baseId, originalId: curr.id });
        }
        return acc;
      }, []);
      setSalesOrders(pureSo);
      setProductionJobs(soList);

      const invSnap = await getDocs(collection(db, 'warehouse_items'));
      const invList: any[] = [];
      invSnap.forEach(d => invList.push({ ...d.data(), id: d.id }));
      setMaterials(invList);

    } catch (e) {
      handleFirestoreError(e, OperationType.GET, 'multiple');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApproveSO = async (soId: string) => {
    try {
      const batch = writeBatch(db);
      const targetJobs = productionJobs.filter(j => j.id.startsWith(soId));
      let approvedCount = 0;
      targetJobs.forEach(job => {
        if (job.status === 'Pending') {
          batch.update(doc(db, 'sales_orders', job.id), { status: 'Approved', stage: 'Pattern' });
          approvedCount++;
        }
      });
      if (approvedCount > 0) {
        await batch.commit();
        showToast(`Sales Order ${soId} Disetujui!`, 'success');
        loadData();
      } else {
        showToast(`SO ${soId} sudah diproses.`, 'info');
      }
    } catch(e) {
      showToast('Gagal approve SO', 'warning');
    }
  };

  const handleProcessJob = async (jobId: string, payload: any = {}) => {
    const job = productionJobs.find(j => j.id === jobId);
    if (!job) return;

    let nextStage = job.stage || 'Pattern';
    let nextStatus = job.status || 'Pending';

    if (job.stage === 'Pattern') nextStage = 'Cutting';
    else if (job.stage === 'Cutting') nextStage = payload.route || 'Sablon';
    else if (job.stage === 'Sablon' || job.stage === 'Bordir') nextStage = 'Sewing';
    else if (job.stage === 'Sewing') nextStage = 'QC';
    else if (job.stage === 'QC') nextStage = 'Packing';
    else if (job.stage === 'Packing') nextStage = 'Shipping';
    else if (job.stage === 'Shipping') { nextStage = 'Shipping'; nextStatus = 'Selesai'; }

    try {
      const { query, collection, where, getDocs } = await import('firebase/firestore');

      await updateDoc(doc(db, 'sales_orders', jobId), {
        stage: nextStage,
        status: nextStatus
      });

      if (nextStatus === 'Selesai' && job.poNumber) {
        const poDocId = job.poNumber.replace(/\//g, '-');
        const q = query(collection(db, 'sales_orders'), where('poNumber', '==', job.poNumber));
        const allJobsSnap = await getDocs(q);
        
        let allSelesai = true;
        allJobsSnap.forEach(docSnap => {
          const checkJob = docSnap.data();
          if (docSnap.id === jobId) {
            if (nextStatus !== 'Selesai') allSelesai = false;
          } else {
            if (checkJob.status !== 'Selesai' && checkJob.stage !== 'Selesai' && checkJob.stage !== 'Shipping') allSelesai = false;
          }
        });

        if (allSelesai) {
          await updateDoc(doc(db, 'purchase_orders', poDocId), { status: 'Close' });
        }
      }

      showToast(`Worksheet ${jobId} diproses ke tahap ${nextStage}`, 'success');
      loadData();
      setActiveJobFocus(null);
      setCurrentPhoneScreen("home");
    } catch(e) {
       console.error(e);
       showToast('Gagal update status job', 'warning');
    }
  };

  const handleSubmitQC = async () => {
    if (!activeJobFocus) return;
    const job = productionJobs.find(j => j.id === activeJobFocus);
    if (!job) return;

    let nextStage = 'Packing';
    if (job.stage === 'Sewing') nextStage = 'Sewing';

    try {
      await updateDoc(doc(db, 'sales_orders', job.id), {
        stage: nextStage,
        qcPassedQty: qcForm.passed,
        qcRejectQty: qcForm.reject,
        qcDefectReason: qcForm.defect
      });
      showToast(`Hasil QC disimpan. ${qcForm.passed} Pcs lolos.`, 'success');
      setActiveJobFocus(null);
      setCurrentPhoneScreen("home");
      loadData();
    } catch(e) {
       console.error(e);
       showToast('Gagal submit QC', 'warning');
    }
  };

  const handleSaveMaterial = async () => {
    try {
      const docRef = materialForm.id ? doc(db, 'warehouse_items', materialForm.id) : doc(collection(db, 'warehouse_items'));
      await setDoc(docRef, materialForm, { merge: true });
      showToast(`Material berhasil disimpan!`, "success");
      setMaterialForm({ id: "", itemCode: "", itemName: "", stock: 0, category: "Fabric" });
      setIsEditingMaterial(false);
      setCurrentPhoneScreen("home");
      loadData();
    } catch(e) {
      console.error(e);
      showToast('Gagal menyimpan material', 'warning');
    }
  };

  const handleBarcodeScanSuccess = (code: string) => {
    setCameraMockActive(false);
    const job = productionJobs.find(j => j.id === code);
    if (job) {
      setActiveJobFocus(job.id);
      if (selectedRole === "QC" && (job.stage === "QC" || job.stage === "Sewing")) {
        setQcForm({ passed: job.qty || 0, rework: 0, reject: 0, defect: "", type: "QC" });
        setCurrentPhoneScreen("qc_form");
      } else if (selectedRole === "Production") {
        setCurrentPhoneScreen("production_action");
      } else {
        showToast("Access denied untuk peran " + selectedRole, "warning");
      }
    } else {
      showToast("Barcode tidak valid", "warning");
    }
  };

  if (currentPhoneScreen === "login") {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} flex flex-col justify-between p-6 transition-colors duration-300 relative w-full h-full`}>
        <div className="absolute top-4 right-4">
           <button onClick={() => navigate('/')} className="bg-white/10 p-2 rounded-full border border-slate-300 shadow-sm text-sm font-bold opacity-80 hover:opacity-100">
             Versi ERP (Desktop) &rarr;
           </button>
        </div>
        <div className="mt-16 text-center flex flex-col items-center">
          <div className="bg-amber-500 text-white p-5 rounded-3xl shadow-xl shadow-amber-500/30 mb-6">
            <Activity className="h-10 w-10 stroke-[2.5]" />
          </div>
          <h3 className="text-3xl font-black tracking-tight">{APP_BRAND.name}</h3>
          <p className="text-sm font-bold uppercase tracking-widest mt-2">{APP_BRAND.tagline}</p>
        </div>
        <div className="w-full max-w-sm mx-auto space-y-4 pt-10 flex-1">
          <div className={`border p-6 rounded-2xl text-center shadow-md ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <p className="text-sm mb-4 font-bold uppercase tracking-widest opacity-60">Pilih Akses Kerja</p>
            <div className="flex flex-col gap-3">
              {[
                  { id: "Owner", label: "Owner Panel", icon: Award },
                  { id: "Production", label: "Operator Produksi", icon: Scissors },
                  { id: "QC", label: "Inspektur QC", icon: ShieldAlert },
                  { id: "Warehouse", label: "Staff Gudang", icon: Package }
              ].map(role => (
                <button 
                  key={role.id}
                  onClick={() => { setSelectedRole(role.id); setCurrentPhoneScreen("home"); }}
                  className={`w-full ${selectedRole === role.id ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : (isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700')} hover:bg-amber-600 hover:text-white font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 text-sm border ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}
                >
                  <role.icon className="h-4 w-4 stroke-[2.5]" />
                  {role.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} font-sans flex flex-col transition-colors duration-300 relative w-full h-full`}>
      
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-[bounce_0.5s_ease-out]">
          <div className={`px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md border ${
            toastMessage.type === 'warning' ? 'bg-orange-500/90 border-orange-400 text-white' : 
            toastMessage.type === 'success' ? 'bg-emerald-500/90 border-emerald-400 text-white' : 
            'bg-blue-600/90 border-blue-500 text-white'
          }`}>
            <span className="text-sm font-bold tracking-wide">{toastMessage.message}</span>
          </div>
        </div>
      )}

      {cameraMockActive && (
        <div className="absolute inset-0 bg-black z-50 flex flex-col p-6 pt-10">
          <button onClick={() => setCameraMockActive(false)} className="text-white bg-slate-800 self-start p-2 rounded-full"><ArrowLeft className="h-5 w-5"/></button>
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <div className="w-64 h-64 border-2 border-amber-500 rounded-3xl relative overflow-hidden flex items-center justify-center">
               <Camera className="h-12 w-12 text-amber-500/30" />
            </div>
            <div className="flex flex-wrap justify-center gap-2 max-w-sm">
               {productionJobs.filter(j => j.status !== 'Selesai' && j.status !== 'Pending').slice(0,8).map(job => (
                 <button key={job.id} onClick={() => handleBarcodeScanSuccess(job.id)} className="px-3 py-1.5 bg-slate-800 text-amber-400 font-bold text-[10px] rounded border border-slate-600">Scan {job.id}</button>
               ))}
            </div>
          </div>
        </div>
      )}

      {currentPhoneScreen === "home" && (
        <div className="flex-1 flex flex-col overflow-hidden max-w-md mx-auto w-full shadow-2xl relative">
          <div className={`px-5 py-4 border-b flex justify-between items-center z-10 shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center gap-2.5">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse ring-2 ring-emerald-500/30"></div>
              <span className="text-sm font-black tracking-tight">{selectedRole} Portal</span>
            </div>
            <button onClick={() => setCurrentPhoneScreen("login")} className={`p-2 rounded-xl ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
              <LogOut className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 custom-scrollbar">
            {/* 1. OWNER ROLE VIEW */}
            {selectedRole === "Owner" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className={`border p-3.5 rounded-2xl shadow-sm flex flex-col ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <span className="text-[10px] font-bold opacity-60 mb-1">Total SO</span>
                    <span className="text-lg font-black">{salesOrders.length}</span>
                  </div>
                  <div className={`border p-3.5 rounded-2xl shadow-sm flex flex-col ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <span className="text-[10px] font-bold opacity-60 mb-1">Active Jobs</span>
                    <span className="text-lg font-black">{productionJobs.filter(j=>j.status!=="Selesai").length}</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-black uppercase opacity-60 mb-2 px-1">Sales Order Approval</h4>
                  {productionJobs.filter(s => s.status === "Pending").map(so => (
                    <div key={so.id} className={`border p-4 rounded-xl shadow-sm mb-3 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="text-[10px] font-mono bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded font-bold">{so.id}</span>
                          <h5 className="text-sm font-bold mt-1">{so.product}</h5>
                          <p className="text-[10px] opacity-60">{so.client} • Qty: {so.qty}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleApproveSO(so.id.split('-')[0])}
                        className={`w-full mt-2 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 ${isDarkMode ? 'bg-amber-500 text-white' : 'bg-slate-900 text-white'}`}
                      >
                        <CheckCircle2 className="h-4 w-4" /> Approve ke Produksi
                      </button>
                    </div>
                  ))}
                  {productionJobs.filter(s => s.status === "Pending").length === 0 && (
                    <p className="text-xs text-center opacity-50 py-4">Semua SO telah diproses.</p>
                  )}
                </div>
              </div>
            )}

            {/* 2. PRODUCTION ROLE VIEW */}
            {selectedRole === "Production" && (
              <div className="space-y-4">
                <button 
                  onClick={() => setCameraMockActive(true)}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 active:scale-95 transition-transform"
                >
                  <QrCode className="h-5 w-5" /> Scan Worksheet (Barcode)
                </button>

                <div>
                  <h4 className="text-xs font-black uppercase opacity-60 mb-2 px-1">Antrean Kerja Aktif</h4>
                  {productionJobs.filter(j => !['QC', 'Selesai', 'Pending'].includes(j.stage||j.status)).map(job => (
                    <div key={job.id} className={`border p-4 rounded-2xl shadow-sm mb-3 flex flex-col gap-3 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-mono bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded font-bold">{job.id}</span>
                          <h5 className="text-sm font-bold mt-1">{job.product}</h5>
                        </div>
                        <span className={`text-[10px] px-2 py-1 rounded-lg font-bold border ${STATUS_COLORS[job.stage || 'Pending']}`}>
                          {job.stage || job.status || 'Pending'}
                        </span>
                      </div>
                      <button 
                        onClick={() => { setActiveJobFocus(job.id); setCurrentPhoneScreen("production_action"); }}
                        className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'}`}
                      >
                        Buka Worksheet <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. QC INSPECTOR ROLE VIEW */}
            {selectedRole === "QC" && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-black uppercase opacity-60 mb-2 px-1">Antrean Inspeksi QC</h4>
                  {productionJobs.filter(j => ['QC'].includes(j.stage)).map(job => (
                    <div key={job.id} className={`border p-4 rounded-2xl shadow-sm mb-3 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                       <div className="flex justify-between items-center mb-3">
                          <span className="text-[10px] font-mono font-bold opacity-60">{job.id}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${STATUS_COLORS[job.stage]}`}>{job.stage}</span>
                       </div>
                       <h5 className="text-sm font-bold mb-3">{job.product}</h5>
                       <button 
                        onClick={() => {
                          setActiveJobFocus(job.id);
                          setQcForm({ passed: job.qty || 0, rework: 0, reject: 0, defect: "", type: job.stage });
                          setCurrentPhoneScreen("qc_form");
                        }}
                        className="w-full bg-orange-500 text-white py-3 rounded-xl text-xs font-bold flex justify-center items-center gap-2 shadow-md shadow-orange-500/20"
                       >
                         <CheckSquare className="h-4 w-4" /> Mulai Inspeksi
                       </button>
                    </div>
                  ))}
                  {productionJobs.filter(j => ['QC'].includes(j.stage)).length === 0 && (
                    <div className="text-center py-6 border border-dashed rounded-xl opacity-50 text-xs font-medium">
                      Tidak ada antrean QC.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 4. WAREHOUSE ROLE VIEW */}
            {selectedRole === "Warehouse" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <button onClick={() => { setMaterialForm({id:"", itemCode:"", itemName:"", stock:0, category:"Fabric"}); setIsEditingMaterial(false); setCurrentPhoneScreen("mat_form"); }} className={`text-white p-3 rounded-xl text-[10px] font-bold flex flex-col items-center gap-2 shadow-md ${isDarkMode ? 'bg-amber-600' : 'bg-slate-900'}`}>
                    <Plus className="h-5 w-5" /> Tambah Material
                  </button>
                  <button className={`border p-3 rounded-xl text-[10px] font-bold flex flex-col items-center gap-2 shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'}`}>
                    <Package className="h-5 w-5" /> Stock Opname
                  </button>
                </div>

                <div>
                  <h4 className="text-xs font-black uppercase opacity-60 mb-2 px-1">Inventory Material</h4>
                  {materials.map(mat => (
                    <div key={mat.id} className={`border p-3.5 rounded-xl shadow-sm mb-3 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>{mat.itemCode}</span>
                          <h5 className="text-xs font-bold mt-1">{mat.itemName}</h5>
                        </div>
                        <div className="text-right">
                           <span className={`text-sm font-black`}>{mat.stock}</span>
                        </div>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <button onClick={() => { setMaterialForm(mat); setIsEditingMaterial(true); setCurrentPhoneScreen("mat_form"); }} className={`text-[10px] flex items-center gap-1 font-bold px-2 py-1 rounded border ${isDarkMode ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'text-amber-600 bg-amber-50 border-amber-200'}`}>
                          <Edit3 className="h-3 w-3" /> Edit Item
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className={`border-t py-3 px-6 flex justify-between items-center z-10 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
             <button onClick={() => setCurrentPhoneScreen("home")} className={`flex flex-col items-center gap-1 text-[10px] font-bold ${currentPhoneScreen === "home" ? 'text-amber-500' : 'opacity-50'}`}>
               <LayoutDashboard className="h-5 w-5" /> Home
             </button>
             {selectedRole === "Production" && (
                <button onClick={() => setCameraMockActive(true)} className="flex flex-col items-center gap-1 text-[10px] font-bold opacity-50 hover:text-amber-500">
                  <QrCode className="h-5 w-5" /> Scan
                </button>
             )}
             <button className="flex flex-col items-center gap-1 text-[10px] font-bold opacity-50 hover:text-amber-500">
               <User className="h-5 w-5" /> Profile
             </button>
          </div>
        </div>
      )}

      {currentPhoneScreen === "production_action" && (
        <div className="flex-1 flex flex-col max-w-md mx-auto w-full shadow-2xl relative">
          {(() => {
             const job = productionJobs.find(j => j.id === activeJobFocus);
             if (!job) return null;
             return (
               <>
                 <div className={`px-4 py-3 border-b flex items-center gap-3 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white'}`}>
                   <button onClick={() => setCurrentPhoneScreen("home")} className={`p-2 rounded-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}><ArrowLeft className="h-4 w-4"/></button>
                   <span className="text-xs font-black">Worksheet: {job.id}</span>
                 </div>
                 
                 <div className="flex-1 p-5 overflow-y-auto space-y-5">
                    <div className={`p-4 rounded-2xl border shadow-sm text-center ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white'}`}>
                       <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold border mb-2 ${STATUS_COLORS[job.stage] || STATUS_COLORS['Pending']}`}>{job.stage || 'Pending'}</span>
                       <h3 className="text-lg font-black">{job.product}</h3>
                       <p className="text-xs mt-1 opacity-60">Target Qty: {job.qty}</p>
                    </div>

                    <div className={`p-4 rounded-2xl border shadow-sm space-y-4 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white'}`}>
                       {job.stage === 'Pattern' && (
                         <div className="text-center py-4">
                           <FileCheck className="h-10 w-10 opacity-30 mx-auto mb-2" />
                           <button onClick={() => handleProcessJob(job.id)} className="w-full bg-slate-900 text-white py-3 rounded-xl text-xs font-bold">Lanjut ke Cutting</button>
                         </div>
                       )}

                       {job.stage === 'Cutting' && (
                         <div className="space-y-4">
                           <div>
                             <label className="text-[10px] font-bold opacity-60 block mb-1">Pilih Rute Berikutnya</label>
                             <select className={`w-full border p-2 rounded-lg text-xs font-bold ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'border-slate-300'}`}
                               value={cuttingRoute}
                               onChange={(e) => setCuttingRoute(e.target.value)}
                             >
                               <option value="Sablon">Sablon</option>
                               <option value="Bordir">Bordir</option>
                               <option value="Sewing">Sewing (Lewati Sablon/Bordir)</option>
                             </select>
                           </div>
                           <button onClick={() => handleProcessJob(job.id, { route: cuttingRoute })} className="w-full bg-blue-600 text-white py-3 rounded-xl text-xs font-bold flex justify-center gap-2">
                             <Scissors className="h-4 w-4"/> Selesai Cutting
                           </button>
                         </div>
                       )}

                       {['Bordir', 'Sablon'].includes(job.stage) && (
                         <div className="text-center py-4 space-y-4">
                           <button onClick={() => handleProcessJob(job.id)} className="w-full bg-blue-600 text-white py-3 rounded-xl text-xs font-bold">Kirim ke Sewing</button>
                         </div>
                       )}

                       {job.stage === 'Sewing' && (
                         <div className="space-y-4">
                           <button onClick={() => handleProcessJob(job.id)} className="w-full bg-blue-600 text-white py-3 rounded-xl text-xs font-bold">Selesai Jahit ➔ Kirim QC</button>
                         </div>
                       )}

                       {job.stage === 'Packing' && (
                         <button onClick={() => handleProcessJob(job.id)} className="w-full bg-slate-900 text-white py-3 rounded-xl text-xs font-bold flex justify-center gap-2"><Package className="h-4 w-4"/> Selesai Packing</button>
                       )}

                       {job.stage === 'Shipping' && (
                         <div className="space-y-4">
                           <button onClick={() => handleProcessJob(job.id)} className="w-full bg-green-600 text-white py-3 rounded-xl text-xs font-bold flex justify-center gap-2"><Truck className="h-4 w-4"/> Kirim via Ekspedisi</button>
                         </div>
                       )}
                    </div>
                 </div>
               </>
             );
          })()}
        </div>
      )}

      {currentPhoneScreen === "qc_form" && (
        <div className="flex-1 flex flex-col max-w-md mx-auto w-full shadow-2xl relative">
           <div className={`px-4 py-3 border-b flex items-center gap-3 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white'}`}>
             <button onClick={() => setCurrentPhoneScreen("home")} className={`p-2 rounded-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}><ArrowLeft className="h-4 w-4"/></button>
             <span className="text-xs font-black">Form QC: {activeJobFocus}</span>
           </div>
           
           <div className="flex-1 p-5 overflow-y-auto">
             <div className={`border p-5 rounded-2xl shadow-sm space-y-4 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white'}`}>
               <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider opacity-60 block mb-1">Passed (Pcs Layak)</label>
                  <input type="number" value={qcForm.passed} onChange={(e) => setQcForm({...qcForm, passed: Number(e.target.value)})} className={`w-full border p-3 rounded-xl text-sm font-bold focus:ring-2 ring-orange-500 outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'border-slate-200'}`} />
               </div>
               <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase opacity-60 block mb-1">Rework/Reject</label>
                    <input type="number" value={qcForm.reject} onChange={(e) => setQcForm({...qcForm, reject: Number(e.target.value)})} className={`w-full border p-3 rounded-xl text-sm font-bold text-red-500 outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'border-slate-200'}`} />
                  </div>
               </div>
               <div>
                  <label className="text-[10px] font-bold uppercase opacity-60 block mb-1">Jenis Defect (Opsional)</label>
                  <select value={qcForm.defect} onChange={(e) => setQcForm({...qcForm, defect: e.target.value})} className={`w-full border p-3 rounded-xl text-xs font-bold outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'border-slate-200 text-slate-700'}`}>
                    <option value="">-- Tidak Ada --</option>
                    <option value="Jahitan kendur">Jahitan Kendur</option>
                    <option value="Sablon pudar">Sablon Pudar / Melenceng</option>
                    <option value="Ukuran salah">Deviasi Ukuran Pola</option>
                  </select>
               </div>
               <button onClick={handleSubmitQC} className="w-full mt-4 bg-orange-500 text-white py-3.5 rounded-xl text-sm font-bold shadow-md shadow-orange-500/20 active:scale-95 transition-transform">
                 Submit Hasil QC Ke Packing
               </button>
             </div>
           </div>
        </div>
      )}

      {currentPhoneScreen === "mat_form" && (
         <div className="flex-1 flex flex-col max-w-md mx-auto w-full shadow-2xl relative">
           <div className={`px-4 py-3 border-b flex items-center gap-3 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white'}`}>
             <button onClick={() => setCurrentPhoneScreen("home")} className={`p-2 rounded-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}><ArrowLeft className="h-4 w-4"/></button>
             <span className="text-xs font-black">{isEditingMaterial ? 'Edit Material' : 'Material Baru'}</span>
           </div>
           
           <div className="flex-1 p-5 overflow-y-auto">
             <div className={`border p-5 rounded-2xl shadow-sm space-y-4 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white'}`}>
               <div>
                 <label className="text-[10px] font-bold opacity-60 block mb-1">Kode Material</label>
                 <input type="text" value={materialForm.itemCode} onChange={e => setMaterialForm({...materialForm, itemCode: e.target.value})} className={`w-full border p-2.5 rounded-lg text-xs font-bold outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'border-slate-300'}`} />
               </div>
               <div>
                 <label className="text-[10px] font-bold opacity-60 block mb-1">Nama Material</label>
                 <input type="text" value={materialForm.itemName} onChange={e => setMaterialForm({...materialForm, itemName: e.target.value})} className={`w-full border p-2.5 rounded-lg text-xs font-bold outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'border-slate-300'}`} />
               </div>
               <div>
                 <label className="text-[10px] font-bold opacity-60 block mb-1">Stok Saat Ini (Qty)</label>
                 <input type="number" value={materialForm.stock} onChange={e => setMaterialForm({...materialForm, stock: Number(e.target.value)})} className={`w-full border p-2.5 rounded-lg text-xs font-bold outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'border-slate-300'}`} />
               </div>
               <button onClick={handleSaveMaterial} className={`w-full mt-4 text-white py-3.5 rounded-xl text-sm font-bold shadow-md active:scale-95 transition-transform ${isDarkMode ? 'bg-amber-600 shadow-amber-900/30' : 'bg-slate-900 shadow-slate-900/20'}`}>
                 Simpan Database Gudang
               </button>
             </div>
           </div>
         </div>
      )}
    </div>
  );
}
