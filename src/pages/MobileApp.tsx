import React, { useState, useEffect } from 'react';
import { 
  Activity, Award, BarChart3, CheckCircle2,
  LayoutDashboard, LogIn, LogOut, Package,
  QrCode, Camera, Plus, ArrowLeft, Scissors, ArrowRight,
  ShieldAlert, Sliders, User, Edit3, Truck, AlertTriangle, Info,
  Bell, CheckSquare, FileCheck
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, getDocs, doc, updateDoc, setDoc, writeBatch, addDoc, serverTimestamp, query, orderBy, limit } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { resetDatabaseData } from '../services/resetService';

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
  const [notifications, setNotifications] = useState<any[]>([]);
  
  const [ownerFilter, setOwnerFilter] = useState("Semua"); // Semua | Pending | Proses | Selesai
  
  const [selectedRole, setSelectedRole] = useState("Owner");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [toastMessage, setToastMessage] = useState<any>(null);

  const [currentPhoneScreen, setCurrentPhoneScreen] = useState("login");
  const [cameraMockActive, setCameraMockActive] = useState(false);
  const [activeJobFocus, setActiveJobFocus] = useState<string | null>(null);
  
  const [pinModalRole, setPinModalRole] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState("");

  const [materialForm, setMaterialForm] = useState({ id: "", itemCode: "", itemName: "", stock: 0, category: "Fabric" });
  const [isEditingMaterial, setIsEditingMaterial] = useState(false);
  const [qcForm, setQcForm] = useState({ passed: 0, rework: 0, reject: 0, defect: "", type: "Interim QC" });
  const [cuttingRoute, setCuttingRoute] = useState("Sablon");
  
  const [cuttingInputQty, setCuttingInputQty] = useState(0);
  const [processGoodQty, setProcessGoodQty] = useState(0);
  const [processNotGoodQty, setProcessNotGoodQty] = useState(0);
  const [processDate, setProcessDate] = useState(new Date().toISOString().split('T')[0]);
  const [processVendor, setProcessVendor] = useState("");

  const showToast = (message: string, type = 'info') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const pushNotification = async (message: string) => {
    try {
      await addDoc(collection(db, 'notifications'), {
        message,
        role: selectedRole,
        createdAt: serverTimestamp()
      });
    } catch(e) {
      console.error('Failed to log notification', e);
    }
  };

  const getBaseId = (id: string) => {
    if (id.includes('-')) {
      const parts = id.split('-');
      if (parts.length > 1 && !isNaN(parseInt(parts[parts.length - 1]))) {
        return parts.slice(0, -1).join('-');
      }
    }
    return id;
  };

  const loadData = async () => {
    try {
      const soSnap = await getDocs(collection(db, 'sales_orders'));
      const soList: any[] = [];
      soSnap.forEach(d => soList.push({ ...d.data(), id: d.id }));
      
      const pureSo = soList.reduce((acc, curr) => {
        const baseId = getBaseId(curr.id);
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
      
      const notifQ = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(50));
      const notifSnap = await getDocs(notifQ);
      const notifList: any[] = [];
      notifSnap.forEach(d => notifList.push({ ...d.data(), id: d.id }));
      setNotifications(notifList);
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
        await pushNotification(`Owner menyetujui ${approvedCount} Order dari SO ${soId}`);
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

      const updates: any = {
        stage: nextStage,
        status: nextStatus
      };

      if (job.stage === 'Cutting' && payload.cuttingQty) {
        const processedQty = payload.cuttingQty;
        const totalQty = job.qty;
        
        if (processedQty < totalQty) {
           const sisaQty = totalQty - processedQty;
           updates.qty = processedQty;
           
           const splitId = `${job.id}-KB${Math.floor(Math.random() * 1000)}`;
           const splitItem = {
             ...job,
             id: splitId,
             qty: sisaQty,
             status: 'Pending'
           };
           await setDoc(doc(db, 'sales_orders', splitId), splitItem);
        }
      } else if (['Sablon', 'Bordir'].includes(job.stage) && payload.goodQty !== undefined) {
         const goodQty = payload.goodQty;
         const notGoodQty = payload.notGoodQty || 0;
         updates.qty = goodQty;
         updates[`${job.stage}_date`] = payload.date;
         updates[`${job.stage}_vendor`] = payload.vendor;
         
         if (notGoodQty > 0) {
           const splitId = `${job.id}-NG${Math.floor(Math.random() * 1000)}`;
           const splitItem = {
             ...job,
             id: splitId,
             qty: notGoodQty,
             stage: job.stage,
             status: 'Pending'
           };
           await setDoc(doc(db, 'sales_orders', splitId), splitItem);
         }
      } else if (job.stage === 'Sewing' && payload.goodQty !== undefined) {
         const goodQty = payload.goodQty;
         const notGoodQty = payload.notGoodQty || 0;
         updates.qty = goodQty;
         updates.sewing_receive_date = payload.date;
         updates.sewing_vendor = payload.vendor;
         
         if (notGoodQty > 0) {
           const splitId = `${job.id}-NG${Math.floor(Math.random() * 1000)}`;
           const splitItem = {
             ...job,
             id: splitId,
             qty: notGoodQty,
             stage: job.stage,
             status: 'Pending'
           };
           await setDoc(doc(db, 'sales_orders', splitId), splitItem);
         }
      }

      await updateDoc(doc(db, 'sales_orders', jobId), updates);

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
          await pushNotification(`Purchase Order ${job.poNumber} selesai dikerjakan.`);
        }
      }

      await pushNotification(`Worksheet ${jobId} dipindah ke tahap ${nextStage}`);
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
      await pushNotification(`Hasil QC ${job.id} disimpan: ${qcForm.passed} Lolos, ${qcForm.reject} Reject`);
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
      await pushNotification(`Material ${materialForm.itemCode} ${materialForm.itemName} stok ${materialForm.stock} diperbarui`);
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

  const handleOpenProductionAction = (job: any) => {
    setActiveJobFocus(job.id);
    setCurrentPhoneScreen("production_action");
    setCuttingInputQty(job.qty);
    setProcessGoodQty(job.qty);
    setProcessNotGoodQty(0);
    setProcessDate(new Date().toISOString().split('T')[0]);
    setProcessVendor("");
  };

  const handleBarcodeScanSuccess = (code: string) => {
    setCameraMockActive(false);
    const job = productionJobs.find(j => j.id === code);
    if (job) {
      if (selectedRole === "QC" && (job.stage === "QC" || job.stage === "Sewing")) {
        setActiveJobFocus(job.id);
        setQcForm({ passed: job.qty || 0, rework: 0, reject: 0, defect: "", type: "QC" });
        setCurrentPhoneScreen("qc_form");
      } else if (selectedRole === "Production") {
        handleOpenProductionAction(job);
      } else {
        showToast("Access denied untuk peran " + selectedRole, "warning");
      }
    } else {
      showToast("Barcode tidak valid", "warning");
    }
  };

  if (currentPhoneScreen === "login") {
    return (
      <div className={`min-h-[100dvh] flex flex-col relative w-full h-full sm:max-w-md sm:mx-auto sm:border-x sm:shadow-2xl ${isDarkMode ? 'bg-gradient-to-br from-slate-900 to-slate-950 text-slate-100 sm:border-slate-800' : 'bg-gradient-to-br from-slate-50 to-slate-100 text-slate-900 sm:border-slate-200'} transition-all duration-500 overflow-hidden`}>
        {/* Decorative background blurs */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[20%] bg-amber-500/20 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[20%] bg-emerald-500/20 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="absolute top-5 right-5 z-20">
           <button onClick={() => navigate('/')} className={`px-4 py-2 rounded-full border shadow-sm text-xs font-black tracking-wide transition-all hover:scale-105 active:scale-95 ${isDarkMode ? 'bg-white/10 border-white/20 hover:bg-white/20 text-white' : 'bg-white/50 border-slate-200 hover:bg-white text-slate-700 backdrop-blur-md'}`}>
             Dekstop ERP &rarr;
           </button>
        </div>
        
        <div className="flex-1 flex flex-col justify-center px-8 z-10 pb-8 mt-16 mt:mt-0">
          <div className="text-center flex flex-col items-center mb-10">
            <div className="bg-gradient-to-tr from-amber-600 to-amber-400 text-white p-5 rounded-[2rem] shadow-2xl shadow-amber-500/30 mb-6 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
              <Activity className="h-10 w-10 stroke-[2.5]" />
            </div>
            <h3 className="text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">{APP_BRAND.name}</h3>
            <p className="text-xs font-black uppercase tracking-[0.2em] mt-3 opacity-50">{APP_BRAND.tagline}</p>
          </div>
          
          <div className="w-full max-w-sm mx-auto">
            <div className={`p-1.5 rounded-3xl shadow-xl backdrop-blur-xl border ${isDarkMode ? 'bg-slate-900/50 border-slate-700/50' : 'bg-white/60 border-white'} ring-1 ring-black/5`}>
              <div className="px-6 py-4 border-b border-black/5 dark:border-white/5 mb-2">
                <p className="text-xs font-black uppercase tracking-widest opacity-40 text-center">Pilih Akses Kerja</p>
              </div>
              <div className="flex flex-col gap-2 p-3">
                {[
                    { id: "Owner", label: "Owner Panel", icon: Award },
                    { id: "Production", label: "Operator Produksi", icon: Scissors },
                    { id: "QC", label: "Inspektur QC", icon: ShieldAlert },
                    { id: "Warehouse", label: "Staff Gudang", icon: Package }
                ].map(role => (
                  <button 
                    key={role.id}
                    onClick={() => {
                      setPinModalRole(role.id);
                      setPinInput("");
                    }}
                    className={`w-full ${selectedRole === role.id ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30 scale-[1.02]' : (isDarkMode ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-700' : 'bg-slate-100/50 text-slate-700 hover:bg-slate-200/50')} font-bold py-4 px-5 rounded-2xl transition-all duration-200 flex items-center justify-between text-sm group border ${isDarkMode ? 'border-slate-700/50' : 'border-slate-200/50'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl transition-colors ${selectedRole === role.id ? 'bg-white/20' : (isDarkMode ? 'bg-slate-900 group-hover:bg-slate-800' : 'bg-white group-hover:bg-slate-100')}`}>
                        <role.icon className="h-4 w-4 stroke-[2.5]" />
                      </div>
                      {role.label}
                    </div>
                    <ArrowLeft className="h-4 w-4 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all rotate-180" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* PIN Modal Overlay */}
        {pinModalRole && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className={`w-full max-w-xs ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white/90 border-white'} border rounded-[2rem] p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 backdrop-blur-xl`}>
              <button 
                onClick={() => setPinModalRole(null)}
                className={`absolute top-5 right-5 p-2 rounded-full transition-colors ${isDarkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-400 hover:bg-slate-100'}`}
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
              
              <div className="text-center mb-8 mt-2">
                <div className="w-16 h-16 bg-gradient-to-tr from-amber-200 to-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner shadow-white/50 transform rotate-3">
                  <ShieldAlert className="h-8 w-8 stroke-[2.5]" />
                </div>
                <h3 className="font-black text-2xl tracking-tight">Kode Keamanan</h3>
                <p className="text-xs opacity-60 font-bold mt-1.5 uppercase tracking-wider">{pinModalRole} Access</p>
              </div>

              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="••••••"
                className={`w-full text-center tracking-[0.5em] font-black text-3xl py-4 rounded-2xl border-2 outline-none transition-all ${
                  isDarkMode 
                    ? 'bg-slate-900/50 border-slate-700 focus:border-amber-500 text-white shadow-inner shadow-black/20' 
                    : 'bg-slate-50/50 border-slate-200 focus:border-amber-500 text-slate-900 shadow-inner'
                }`}
                autoFocus
              />

              <button
                onClick={() => {
                  const correctPin = pinModalRole === "Owner" ? "220596" : "123456";
                  if (pinInput === correctPin) {
                    setSelectedRole(pinModalRole);
                    setCurrentPhoneScreen("home");
                    setPinModalRole(null);
                  } else {
                    showToast("PIN Salah!", "warning");
                    setPinInput("");
                  }
                }}
                className="w-full mt-6 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-white font-black py-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">lock_open</span> Buka Akses
              </button>
            </div>
          </div>
        )}
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
            <div className="flex items-center gap-3">
              <button onClick={() => setCurrentPhoneScreen("notifications")} className={`p-2 rounded-xl relative ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                <Bell className="h-4 w-4" />
                {notifications.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />}
              </button>
            </div>
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

                <div className="flex gap-2 pb-2 overflow-x-auto custom-scrollbar">
                  {["Semua", "Pending", "Proses", "Selesai"].map(filterTab => (
                    <button 
                      key={filterTab}
                      onClick={() => setOwnerFilter(filterTab)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                        ownerFilter === filterTab 
                          ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' 
                          : (isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500')
                      }`}
                    >
                      {filterTab}
                    </button>
                  ))}
                </div>

                <div>
                  <h4 className="text-xs font-black uppercase opacity-60 mb-2 px-1">Daftar Pekerjaan ({ownerFilter})</h4>
                  {productionJobs.filter(s => {
                    if (ownerFilter === "Semua") return true;
                    if (ownerFilter === "Pending") return s.status === "Pending";
                    if (ownerFilter === "Selesai") return s.status === "Selesai";
                    if (ownerFilter === "Proses") return s.status !== "Pending" && s.status !== "Selesai";
                    return true;
                  }).map(so => (
                    <div key={so.id} className={`border p-4 rounded-xl shadow-sm mb-3 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="text-[10px] font-mono bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded font-bold">{so.id}</span>
                          <h5 className="text-sm font-bold mt-1">{so.product}</h5>
                          <p className="text-[10px] opacity-60">{so.client} • Qty: {so.qty}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-1 rounded-lg font-bold border ${STATUS_COLORS[so.stage || so.status || 'Pending']}`}>
                          {so.stage || so.status || 'Pending'}
                        </span>
                      </div>
                      
                      {so.status === "Pending" && (
                        <button 
                          onClick={() => handleApproveSO(getBaseId(so.id))}
                          className={`w-full mt-2 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 ${isDarkMode ? 'bg-amber-500 text-white' : 'bg-slate-900 text-white'}`}
                        >
                          <CheckCircle2 className="h-4 w-4" /> Approve ke Produksi
                        </button>
                      )}
                    </div>
                  ))}
                  {productionJobs.filter(s => {
                    if (ownerFilter === "Semua") return true;
                    if (ownerFilter === "Pending") return s.status === "Pending";
                    if (ownerFilter === "Selesai") return s.status === "Selesai";
                    if (ownerFilter === "Proses") return s.status !== "Pending" && s.status !== "Selesai";
                    return true;
                  }).length === 0 && (
                    <p className="text-xs text-center opacity-50 py-4">Tidak ada data ditemukan.</p>
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
                        onClick={() => handleOpenProductionAction(job)}
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
          
          <div className={`border-t py-4 px-8 flex justify-around items-center z-10 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} pb-6`}>
             <button onClick={() => setCurrentPhoneScreen("home")} className={`flex flex-col items-center gap-1.5 text-[10px] font-bold transition-all ${currentPhoneScreen === "home" ? 'text-amber-500 scale-110' : 'text-slate-400 hover:text-amber-500'}`}>
               <LayoutDashboard className={`h-6 w-6 ${currentPhoneScreen === "home" ? 'fill-amber-500/20' : ''}`} /> Home
             </button>
             {selectedRole === "Production" && (
                <button onClick={() => setCameraMockActive(true)} className="flex flex-col items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-amber-500 transition-all hover:scale-110">
                  <div className="bg-amber-500 text-white p-3 rounded-full shadow-lg shadow-amber-500/30 -mt-8 border-4 border-white dark:border-slate-900">
                    <QrCode className="h-6 w-6" />
                  </div>
                </button>
             )}
             <button onClick={() => setCurrentPhoneScreen("profile")} className={`flex flex-col items-center gap-1.5 text-[10px] font-bold transition-all ${currentPhoneScreen === "profile" ? 'text-amber-500 scale-110' : 'text-slate-400 hover:text-amber-500'}`}>
               <User className={`h-6 w-6 ${currentPhoneScreen === "profile" ? 'fill-amber-500/20' : ''}`} /> Profile
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
                           <div className="pt-2">
                             <label className="text-[10px] font-bold opacity-60 block mb-1">Qty Lanjut ke {cuttingRoute}</label>
                             <input type="number" 
                               value={cuttingInputQty || job.qty} 
                               onChange={(e) => setCuttingInputQty(Number(e.target.value))} 
                               className={`w-full border p-3 rounded-xl text-lg text-center font-black outline-none focus:ring-2 focus:ring-amber-500 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} 
                             />
                             {cuttingInputQty > 0 && cuttingInputQty < job.qty && (
                               <p className="text-[10px] text-amber-500 font-bold mt-2">Sisa {job.qty - cuttingInputQty} pcs akan kembali ke status Pending.</p>
                             )}
                           </div>
                           <button onClick={() => handleProcessJob(job.id, { route: cuttingRoute, cuttingQty: cuttingInputQty || job.qty })} className="w-full bg-blue-600 text-white py-3 rounded-xl text-xs font-bold flex justify-center gap-2">
                             <Scissors className="h-4 w-4"/> Selesai Cutting
                           </button>
                         </div>
                       )}

                       {['Bordir', 'Sablon'].includes(job.stage) && (
                         <div className="space-y-4">
                           <div className="grid grid-cols-2 gap-3">
                             <div>
                               <label className="text-[10px] font-bold opacity-60 block mb-1">Qty Good (Ke Sewing)</label>
                               <input type="number" value={processGoodQty || job.qty} onChange={(e) => setProcessGoodQty(Number(e.target.value))} className={`w-full border p-3 rounded-xl text-sm font-bold shadow-inner ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} />
                             </div>
                             <div>
                               <label className="text-[10px] font-bold opacity-60 block mb-1">Qty Not Good</label>
                               <input type="number" value={processNotGoodQty} onChange={(e) => setProcessNotGoodQty(Number(e.target.value))} className={`w-full border p-3 rounded-xl text-sm font-bold shadow-inner ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} />
                             </div>
                           </div>
                           
                           <div>
                             <label className="text-[10px] font-bold opacity-60 block mb-1">Tanggal Dikirim ke Sewing</label>
                             <input type="date" value={processDate} onChange={(e) => setProcessDate(e.target.value)} className={`w-full border p-3 rounded-xl text-sm font-bold ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} />
                           </div>
                           <div>
                             <label className="text-[10px] font-bold opacity-60 block mb-1">Nama PT/Vendor Sewing</label>
                             <input type="text" value={processVendor} onChange={(e) => setProcessVendor(e.target.value)} placeholder="Contoh: PT. ABC Sewing" className={`w-full border p-3 rounded-xl text-sm font-bold ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} />
                           </div>

                           <button onClick={() => handleProcessJob(job.id, { goodQty: processGoodQty || job.qty, notGoodQty: processNotGoodQty, date: processDate, vendor: processVendor })} className="w-full bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 text-white py-3.5 rounded-xl text-xs font-black uppercase tracking-wide">
                             Kirim ke Sewing
                           </button>
                         </div>
                       )}

                       {job.stage === 'Sewing' && (
                         <div className="space-y-4">
                           <div className="grid grid-cols-2 gap-3">
                             <div>
                               <label className="text-[10px] font-bold opacity-60 block mb-1">Qty Good (Ke QC)</label>
                               <input type="number" value={processGoodQty || job.qty} onChange={(e) => setProcessGoodQty(Number(e.target.value))} className={`w-full border p-3 rounded-xl text-sm font-bold shadow-inner ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} />
                             </div>
                             <div>
                               <label className="text-[10px] font-bold opacity-60 block mb-1">Qty Not Good</label>
                               <input type="number" value={processNotGoodQty} onChange={(e) => setProcessNotGoodQty(Number(e.target.value))} className={`w-full border p-3 rounded-xl text-sm font-bold shadow-inner flex ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} />
                             </div>
                           </div>
                           
                           <div>
                             <label className="text-[10px] font-bold opacity-60 block mb-1">Tanggal Diterima dari Sewing</label>
                             <input type="date" value={processDate} onChange={(e) => setProcessDate(e.target.value)} className={`w-full border p-3 rounded-xl text-sm font-bold ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} />
                           </div>
                           <div>
                             <label className="text-[10px] font-bold opacity-60 block mb-1">Nama PT/Vendor Sewing</label>
                             <input type="text" value={processVendor} onChange={(e) => setProcessVendor(e.target.value)} placeholder="Contoh: PT. ABC Sewing" className={`w-full border p-3 rounded-xl text-sm font-bold ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} />
                           </div>

                           <button onClick={() => handleProcessJob(job.id, { goodQty: processGoodQty || job.qty, notGoodQty: processNotGoodQty, date: processDate, vendor: processVendor })} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl text-xs shadow-md shadow-blue-600/20 font-black tracking-wide uppercase">
                             Lanjut Verifikasi QC
                           </button>
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

      {currentPhoneScreen === "notifications" && (
        <div className="flex-1 flex flex-col max-w-md mx-auto w-full shadow-2xl relative">
          <div className={`px-4 py-3 border-b flex items-center gap-3 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white'}`}>
            <button onClick={() => setCurrentPhoneScreen("home")} className={`p-2 rounded-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}><ArrowLeft className="h-4 w-4"/></button>
            <span className="text-sm font-black">Notifikasi Real-time</span>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar">
            {notifications.length === 0 && (
              <div className="text-center py-10 opacity-50">
                <Bell className="w-10 h-10 mx-auto mb-2" />
                <p className="text-sm font-bold">Belum ada notifikasi.</p>
              </div>
            )}
            {notifications.map(notif => (
              <div key={notif.id} className={`p-4 rounded-xl shadow-sm border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} flex gap-3 items-start`}>
                <div className={`p-2 rounded-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'} mt-1 flex-shrink-0`}>
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold tracking-tight">{notif.message}</p>
                  <p className="text-[10px] mt-1.5 font-medium opacity-60 flex items-center gap-1">
                    <User className="w-3 h-3" /> Oleh {notif.role || 'Sistem'}
                    <span className="mx-1">•</span>
                    {notif.createdAt ? new Date(notif.createdAt.toDate ? notif.createdAt.toDate() : notif.createdAt).toLocaleString('id-ID') : 'Baru saja'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {currentPhoneScreen === "profile" && (
        <div className="flex-1 flex flex-col max-w-md mx-auto w-full shadow-2xl relative">
          <div className={`px-4 py-3 border-b flex items-center gap-3 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white'}`}>
            <button onClick={() => setCurrentPhoneScreen("home")} className={`p-2 rounded-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}><ArrowLeft className="h-4 w-4"/></button>
            <span className="text-sm font-black">Profil Akun</span>
          </div>
          
          <div className="flex-1 p-5 overflow-y-auto">
            <div className={`p-6 rounded-3xl border shadow-sm flex flex-col items-center text-center ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
               <div className="w-20 h-20 rounded-full border-4 border-amber-500 overflow-hidden mb-3">
                 <img src={`https://ui-avatars.com/api/?name=${selectedRole}&background=fcd34d&color=b45309`} alt="User" className="w-full h-full object-cover" />
               </div>
               <h2 className="text-xl font-black">{selectedRole}</h2>
               <p className="text-xs font-bold uppercase tracking-widest opacity-50 mt-1 whitespace-nowrap">Hak Akses: {selectedRole} ERP</p>
               
               <div className="w-full h-px bg-slate-200 dark:bg-slate-800 my-5"></div>
               
               <div className="w-full space-y-3">
                 <div className={`flex justify-between items-center p-3 rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                   <span className="text-xs font-bold opacity-70">App Theme</span>
                   <button onClick={() => setIsDarkMode(!isDarkMode)} className="text-xs font-black bg-amber-500 text-white px-3 py-1 rounded-full shadow-sm">
                     {isDarkMode ? 'Ganti ke Terang' : 'Ganti ke Gelap'}
                   </button>
                 </div>
                 
                 <div className={`flex justify-between items-center p-3 rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                   <span className="text-xs font-bold opacity-70">Versi Desktop App</span>
                   <button onClick={() => navigate('/erp')} className="text-xs font-black px-3 py-1 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-full shadow-sm">
                     Buka ERP
                   </button>
                 </div>

                 <div className={`flex justify-between items-center p-3 rounded-xl border border-red-500/20 ${isDarkMode ? 'bg-red-950/30' : 'bg-red-50'}`}>
                   <span className="text-xs font-bold text-red-600 dark:text-red-400">Reset Database</span>
                   <button 
                     onClick={async () => {
                       if (window.confirm("Apakah Anda yakin ingin melakukan RESET seluruh data di database Firestore ke data sampel awal?")) {
                         showToast('Memproses reset database...', 'info');
                         const res = await resetDatabaseData();
                         if (res.success) {
                           showToast(res.message, 'success');
                           setTimeout(() => window.location.reload(), 1000);
                         } else {
                           showToast(res.message, 'warning');
                         }
                       }
                     }} 
                     className="text-xs font-black px-3 py-1 bg-red-600 text-white rounded-full shadow-sm hover:bg-red-700 transition-colors"
                   >
                     Reset DB
                   </button>
                 </div>
               </div>
               
               <button onClick={() => setCurrentPhoneScreen("login")} className="w-full mt-6 bg-red-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-red-500/20 transition-all active:scale-95 flex items-center justify-center gap-2">
                 <LogOut className="w-4 h-4" /> Keluar Akun
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
