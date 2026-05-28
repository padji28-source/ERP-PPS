import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { fetchProductionData, ProductionOrder, getDeadlineDelta, formatDeadlineLabel } from "../services/dataService";

export default function WIPKanban() {
  const [data, setData] = useState<ProductionOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ProductionOrder | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isQCVerified, setIsQCVerified] = useState(false);
  const [statusQC, setStatusQC] = useState("Pending");
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    qtyKirim: "",
    tglKirim: "",
    qtyMasuk: "",
    selisih: "",
    target: "",
    aktual: "",
    vendor: "",
    note: "",
    confirmQty: "",
    qtyReject: "",
    qtyGood: "",
    qtyNotGood: "",
    qtySisaBahan: "",
    noteSisaBahan: "",
    qcRedirectTarget: "Cutting",
  });
  const [qtyWarning, setQtyWarning] = useState(false);
  const location = useLocation();

  const isQCValid = () => {
    if (!selectedItem) return false;
    if (statusQC !== "Selesai") return false;

    const confirm = parseInt(formData.confirmQty || "0");
    const reject = parseInt(formData.qtyReject || "0");
    const total = confirm + reject;

    // wajib sesuai total qty
    if (total !== selectedItem.qty) return false;

    // tidak boleh lebih
    if (confirm > selectedItem.qty) return false;

    // kalau ada reject wajib isi note
    if (reject > 0 && formData.note.trim() === "") return false;

    return true;
  };

  const queryParams = new URLSearchParams(location.search);
  const activeStageFilter = queryParams.get("stage")?.toLowerCase();
  const initialSearchParam = queryParams.get("search") || "";

  useEffect(() => {
    if (initialSearchParam) {
      setSearchQuery(initialSearchParam);
    }
  }, [initialSearchParam]);

  useEffect(() => {
    if (selectedItem) {
      setIsQCVerified(false);
      setStatusQC("Pending");
      setQtyWarning(false);
      setFormData({
        qtyKirim: selectedItem.qtyKirim || "",
        tglKirim: selectedItem.tglKirim || "",
        qtyMasuk:
          selectedItem.qtyMasuk || selectedItem.qty?.toString() || "",
        selisih: selectedItem.selisih || "0",
        target: selectedItem.target || selectedItem.qty?.toString() || "",
        aktual: selectedItem.aktual || "",
        vendor: selectedItem.vendor || "",
        note: selectedItem.note || "",
        confirmQty:
          selectedItem.confirmQty?.toString() ||
          selectedItem.qty?.toString() ||
          "",
        qtyReject: "",
        qtyGood: selectedItem.qty?.toString() || "",
        qtyNotGood: "0",
        qtySisaBahan: "0",
        noteSisaBahan: "",
        qcRedirectTarget: "Cutting",
      });
    }
  }, [selectedItem]);
  useEffect(() => {
    async function load() {
      const orders = await fetchProductionData();
      setData(orders);
      setIsLoading(false);
    }
    load();
  }, []);

  const STAGES = [
    { title: "PENDING", param: "pending", ids: ["Pending"] },
    { title: "PATTERNING", param: "patterning", ids: ["Patterning"] },
    { title: "CUTTING", param: "cutting", ids: ["Cutting"] },
    { title: "BORDIR", param: "bordir", ids: ["Bordir"] },
    { title: "SABLON", param: "sablon", ids: ["Sablon"] },
    { title: "SEWING", param: "sewing", ids: ["Sewing", "CMT"] },
    { title: "QC", param: "qc", ids: ["QC"] },
    { title: "PACKING", param: "packing", ids: ["Packing"] },
    { title: "SHIPPING", param: "shipping", ids: ["Shipping", "Selesai"] },
  ];

  const handleCardClick = (item: ProductionOrder) => {
    if (item.stage !== "Selesai") {
      setSelectedItem(item);
    }
  };

  const confirmMove = async (newStage: string) => {
    if (!selectedItem) return;

    let moveQty = selectedItem.qty;
    let sisa = 0; // Stays in current stage
    let isPendingReturn = false;
    let pendingNote = "";
    
    let qGood = parseInt(formData.qtyGood, 10) || 0;
    let qNotGood = parseInt(formData.qtyNotGood, 10) || 0;
    let qKekurangan = parseInt(formData.qtySisaBahan, 10) || 0;

    let updates: any = {};
    let currentDataAppend: ProductionOrder[] = [];

    if (selectedItem.stage === "QC") {
      // For QC, we process the splits manually
      // 1. GOOD goes to Packing
      // 2. NOT GOOD goes to qcRedirectTarget
      
      const qcRedirect = formData.qcRedirectTarget || "Patterning";
      
      // Update original item to be the GOOD one (Packing)
      if (qGood > 0) {
        updates = {
          stage: "Packing",
          status: "Pending",
          qty: qGood,
          confirmQty: qGood,
        };
      } else {
        // If no good, the original item becomes the NOT GOOD one
        updates = {
          stage: qcRedirect,
          status: "Pending",
          qty: qNotGood,
          confirmQty: qNotGood,
          note: `Dikembalikan oleh QC ke ${qcRedirect}`
        };
      }

      // If both Good and Not Good exist, split them
      if (qGood > 0 && qNotGood > 0) {
        const splitId = `${selectedItem.id}-NG${Math.floor(Math.random() * 1000)}`;
        const splitItem: ProductionOrder = {
          ...selectedItem,
          id: splitId,
          stage: qcRedirect,
          status: "Pending",
          qty: qNotGood,
          confirmQty: qNotGood,
          note: `Dikembalikan oleh QC ke ${qcRedirect}`,
        };
        currentDataAppend.push(splitItem);
        try {
          const existingSplits = JSON.parse(localStorage.getItem("split_orders") || "[]");
          existingSplits.push(splitItem);
          localStorage.setItem("split_orders", JSON.stringify(existingSplits));
        } catch (e) {}
      }
    } else {
      // Standard stages
      if (
        selectedItem.stage === "Sablon" ||
        selectedItem.stage === "Bordir"
      ) {
        const kir = parseInt(formData.qtyKirim, 10) || 0;
        moveQty = kir;
        sisa = qNotGood;
        if (qKekurangan > 0) {
          isPendingReturn = true;
          pendingNote = formData.noteSisaBahan || "Kekurangan bahan pada tahap produksi";
        }
      } else {
        moveQty = qGood;
        sisa = qNotGood;
        if (qKekurangan > 0) {
          isPendingReturn = true;
          pendingNote = formData.noteSisaBahan || "Kekurangan bahan pada tahap produksi";
        }
      }

      // Not Good stays in current stage
      if (sisa > 0) {
        const splitId = `${selectedItem.id}-NG${Math.floor(Math.random() * 1000)}`;
        const splitItem: ProductionOrder = {
          ...selectedItem,
          id: splitId,
          qty: sisa,
          confirmQty: sisa,
          qtyKirim: "",
          qtyMasuk: "",
          selisih: "",
          target: "",
          aktual: "",
          note: `Sisa reject/tidak lolos pada ${selectedItem.stage}`,
        };
        currentDataAppend.push(splitItem);
        try {
          const existingSplits = JSON.parse(localStorage.getItem("split_orders") || "[]");
          existingSplits.push(splitItem);
          localStorage.setItem("split_orders", JSON.stringify(existingSplits));
        } catch (e) {}
      }
      
      // Kekurangan bahan goes to Pending
      if (isPendingReturn && qKekurangan > 0) {
        const splitId = `${selectedItem.id}-KB${Math.floor(Math.random() * 1000)}`;
        const splitItem: ProductionOrder = {
          ...selectedItem,
          id: splitId,
          stage: "Pending",
          status: "Pending",
          qty: qKekurangan,
          confirmQty: qKekurangan,
          qtyKirim: "",
          qtyMasuk: "",
          selisih: "",
          target: "",
          aktual: "",
          note: `Kekurangan Bahan: ${pendingNote}`,
        };
        currentDataAppend.push(splitItem);
        try {
          const existingSplits = JSON.parse(localStorage.getItem("split_orders") || "[]");
          existingSplits.push(splitItem);
          localStorage.setItem("split_orders", JSON.stringify(existingSplits));
        } catch (e) {}
      }

      updates = {
        stage: newStage,
        status: newStage === "Shipping" ? "Selesai" : "Pending",
        qty: moveQty,
        confirmQty: moveQty,
        ...(selectedItem.stage === "Bordir" || selectedItem.stage === "Sablon" ||
        selectedItem.stage === "Patterning" ||
        newStage === "Cutting"
          ? {
              qtyKirim: formData.qtyKirim,
              tglKirim: formData.tglKirim,
              qtyMasuk: formData.qtyMasuk,
              selisih: formData.selisih,
              target: formData.target,
              aktual: formData.aktual,
              vendor: formData.vendor,
              note: formData.note,
            }
          : {}),
      };
    }

    // Apply updates and write splits directly to Firestore
    try {
      const { setDoc, doc, writeBatch } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      const { getDocs, query, collection, where } = await import('firebase/firestore');
      const batch = writeBatch(db);

      // Update the selected item
      batch.update(doc(db, 'sales_orders', selectedItem.id), updates);
      
      if (updates.status === 'Selesai' && selectedItem.poNumber) {
        const poDocId = selectedItem.poNumber.replace(/\//g, '-');
        
        // Fetch all jobs for this PO to check if all are Selesai
        const q = query(collection(db, 'sales_orders'), where('poNumber', '==', selectedItem.poNumber));
        const allJobsSnap = await getDocs(q);
        
        let allSelesai = true;
        allJobsSnap.forEach(doc => {
          const job = doc.data();
          if (doc.id === selectedItem.id) {
            if (updates.status !== 'Selesai') allSelesai = false;
          } else {
            if (job.status !== 'Selesai' && job.stage !== 'Selesai' && job.stage !== 'Shipping') allSelesai = false;
          }
        });

        if (allSelesai) {
          batch.update(doc(db, 'purchase_orders', poDocId), { status: 'Close' });
        }
      }

      // Add any splits
      currentDataAppend.forEach(splitItem => {
        batch.set(doc(db, 'sales_orders', splitItem.id), splitItem);
      });

      await batch.commit();
    } catch (e) {
      console.error('Failed to save KanBan updates to Firestore', e);
      alert('Gagal menyimpan data ke database. Cek koneksi.');
      return;
    }

    setData((prev) => {
      const mapped = prev.map((item) =>
        item.id === selectedItem.id && item.product === selectedItem.product
          ? { ...item, ...updates }
          : item,
      );
      return [...mapped, ...currentDataAppend];
    });

    setSelectedItem(null);
    if (newStage === "Shipping" || updates.stage === "Shipping") {
      setTimeout(() => navigate("/inventory"), 300);
    }
  };

  // Filter & Sort
  const processedData = data
    .filter(
      (item) =>
        item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.poNumber && item.poNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.product.toLowerCase().includes(searchQuery.toLowerCase()),
    )
    .sort((a, b) => {
      // Urgent (Blocked) first
      if (a.status === "Blocked" && b.status !== "Blocked") return -1;
      if (a.status !== "Blocked" && b.status === "Blocked") return 1;

      return getDeadlineDelta(a.deadline) - getDeadlineDelta(b.deadline);
    });

  const visibleStages = activeStageFilter
    ? STAGES.filter((s) => s.param === activeStageFilter)
    : STAGES;
  const getQCStatus = (item) => {
    if (!item.confirmQty) return "Pending";
    if (item.confirmQty === item.qty) return "Perfect";
    if (item.confirmQty >= item.qty * 0.8) return "Minor Issue";
    return "Critical";
  };
  return (
    <div className="flex-1 flex flex-col h-full bg-surface-container-low w-full overflow-hidden mx-auto relative">
      {/* Header */}
      <header className="flex-none px-4 lg:px-8 py-5 lg:py-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/50 backdrop-blur-md border-b border-[#E2E8F0] shadow-sm relative z-10">
        <div>
          <h2 className="text-2xl lg:text-3xl font-extrabold text-[#1E293B] tracking-tight flex items-center gap-2">
            {activeStageFilter
              ? `${activeStageFilter.charAt(0).toUpperCase() + activeStageFilter.slice(1)} List`
              : "Production Kanban Board"}
          </h2>
          <p className="text-[#64748B] mt-1.5 text-sm font-medium">
            {activeStageFilter
              ? `Manage all orders currently in ${activeStageFilter.toUpperCase()} stage`
              : `Last updated: ${new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`}
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          {isLoading && (
            <span className="text-sm font-medium text-blue-600 flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
              <span className="material-symbols-outlined animate-spin text-[16px]">
                sync
              </span>{" "}
              Syncing
            </span>
          )}
          <div className="relative w-full md:w-auto">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] text-[20px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search SO, Client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 pr-4 py-2.5 rounded-full bg-white border border-[#CBD5E1] hover:border-[#94A3B8] outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent text-sm font-medium w-full md:w-80 placeholder:text-[#94A3B8] shadow-sm transition-all duration-200"
            />
          </div>
        </div>
      </header>

      {/* Kanban Board Area */}
      {visibleStages.length === 1 ? (
        // TABLE / LIST VIEW for SINGLE STAGE
        <div className="flex-1 overflow-hidden px-4 lg:px-8 py-6 flex w-full bg-[#F1F5F9]">
          <div className="flex-1 overflow-hidden flex flex-col w-full max-w-[1400px] mx-auto">
            {/* Table Header */}
            <div className="hidden md:grid md:grid-cols-12 gap-4 text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-3 px-6 bg-white/50 backdrop-blur-sm py-3 rounded-xl border border-[#E2E8F0]">
              <div className="col-span-3">ORDER / CLIENT</div>
              <div className="col-span-3">PRODUCT DETAILS</div>
              <div className="col-span-1 text-center">QUANTITY</div>
              <div className="col-span-2">DEADLINE</div>
              <div className="col-span-1">STATUS</div>
              <div className="col-span-2 text-right">ACTION</div>
            </div>
            {/* Table Body (Cards) */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pb-8 px-1">
              {processedData
                .filter((d) => visibleStages[0].ids.includes(d.stage))
                .sort((a, b) => {
                  const aIsSisa = a.id.includes("-R");
                  const bIsSisa = b.id.includes("-R");
                  if (aIsSisa && !bIsSisa) return 1;
                  if (!aIsSisa && bIsSisa) return -1;
                  return 0;
                })
                .map((item) => {
                  const isClickable = visibleStages[0].title !== "SELESAI";
                  const isSisa = item.id.includes("-R");

                  return (
                    <div
                      key={item.id + item.product}
                      className={`bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border px-5 py-5 grid grid-cols-1 md:grid-cols-12 gap-5 items-start md:items-center transition-all duration-300
                        ${item.confirmQty && item.confirmQty < item.qty ? "border-[#FECACA] bg-[#FEF2F2]" : "border-[#E2E8F0]"}
                        ${isClickable ? "hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] cursor-pointer hover:-translate-y-1 hover:border-[#93C5FD]" : ""}
                      `}
                      onClick={() => isClickable && handleCardClick(item)}
                    >
                      {/* SO ID & Client */}
                      <div className="col-span-1 md:col-span-3 flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span
                            className="font-extrabold text-[#0F172A] text-lg tracking-tight truncate max-w-[180px]"
                            title={item.id}
                          >
                            {item.id}
                          </span>
                          {isSisa && (
                            <span className="bg-[#FEF08A] text-[#A16207] text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shadow-sm">
                              SISA
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[#64748B] text-sm font-semibold truncate max-w-[200px]">
                          <span className="material-symbols-outlined text-[16px]">domain</span>
                          <span title={item.client}>{item.client}</span>
                        </div>
                        {item.poNumber && (
                          <div className="flex items-center gap-1.5 text-[#64748B] text-xs font-semibold truncate max-w-[200px] mt-1">
                            <span className="material-symbols-outlined text-[14px]">receipt_long</span>
                            <span title={item.poNumber}>PO: {item.poNumber}</span>
                          </div>
                        )}
                      </div>

                      {/* Product Name & Note */}
                      <div className="col-span-1 md:col-span-3 flex flex-col justify-center gap-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[#3B82F6]">
                            <span className="material-symbols-outlined text-[16px]">checkroom</span>
                          </div>
                          <span className="text-[14px] font-bold text-[#1E293B] truncate uppercase">
                            {item.product}
                          </span>
                        </div>
                        <span className="text-[12px] text-[#64748B] truncate w-full flex items-center gap-1 ml-10">
                          <span className="material-symbols-outlined text-[14px]">edit_note</span>
                          {item.note || "No special instructions"}
                        </span>
                      </div>

                      {/* Quantity */}
                      <div className="col-span-1 md:col-span-1 flex md:block items-center justify-between text-left md:text-center mt-3 md:mt-0 bg-[#F8FAFC] md:bg-transparent p-3 md:p-0 rounded-xl">
                        <span className="text-[11px] font-bold text-[#94A3B8] md:hidden uppercase tracking-wider">Quantity</span>
                        <div className="flex flex-col items-center">
                          <span className="font-extrabold text-[#0F172A] text-[24px] tabular-nums tracking-tighter leading-none">
                            {item.qty}
                          </span>
                          <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mt-1 hidden md:block">PCS</span>
                        </div>
                      </div>

                      {/* Finish Date */}
                      <div className="col-span-1 md:col-span-2 flex items-center justify-between md:justify-start text-sm font-semibold text-[#334155] gap-2 mt-3 md:mt-0 bg-[#F8FAFC] md:bg-transparent p-3 md:p-0 rounded-xl">
                        <span className="text-[11px] font-bold text-[#94A3B8] md:hidden uppercase tracking-wider">Deadline</span>
                        <div className="flex flex-col md:gap-1">
                          <span className="flex items-center gap-1.5 line-clamp-1">
                            <span className="material-symbols-outlined text-[16px] text-[#94A3B8]">calendar_today</span>
                            {item.deadline}
                          </span>
                          <span className={`text-[11px] font-bold uppercase tracking-widest ${getDeadlineDelta(item.deadline) <= 3 ? "text-[#EF4444]" : "text-[#10B981]"}`}>
                            {formatDeadlineLabel(item.deadline) || "ON TRACK"}
                          </span>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="col-span-1 md:col-span-1 flex items-center justify-between md:block mt-3 md:mt-0 bg-[#F8FAFC] md:bg-transparent p-3 md:p-0 rounded-xl">
                        <span className="text-[11px] font-bold text-[#94A3B8] md:hidden uppercase tracking-wider">Status</span>
                        <div
                          onClick={async (e) => {
                            e.stopPropagation();
                            const newStatus =
                              item.status === "Selesai" ? "Pending" : "Selesai";

                            try {
                              const { doc, updateDoc, writeBatch } = await import('firebase/firestore');
                              const { db } = await import('../firebase');
                              
                              const batch = writeBatch(db);
                              batch.update(doc(db, 'sales_orders', item.id), { status: newStatus });
                              
                              if (newStatus === "Selesai" && item.poNumber) {
                                const poDocId = item.poNumber.replace(/\//g, '-');
                                batch.update(doc(db, 'purchase_orders', poDocId), { status: 'Close' });
                              }
                              
                              await batch.commit();
                            } catch (e) {
                              console.error('Failed to update status in Firestore', e);
                            }

                            setData((prev) =>
                              prev.map((d) =>
                                d.id === item.id
                                  ? { ...d, status: newStatus }
                                  : d,
                              ),
                            );
                          }}
                          className={`w-full md:w-max mx-auto px-3 py-1.5 rounded-lg text-[12px] font-bold cursor-pointer text-center whitespace-nowrap shadow-sm transition-all
                                    ${
                                      item.status === "Selesai"
                                        ? "bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0] hover:bg-[#A7F3D0]"
                                        : "bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] hover:bg-[#FDE68A]"
                                    }`}
                        >
                          {item.status || "Pending"}
                        </div>
                      </div>

                      {/* Verifikasi QC */}
                      <div className="col-span-1 md:col-span-2 flex items-center justify-between md:justify-end gap-3 mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-none border-[#F1F5F9]">
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm uppercase tracking-wider ${
                              getQCStatus(item) === "Perfect"
                                ? "bg-[#DCFCE7] text-[#166534]"
                                : getQCStatus(item) === "Minor Issue"
                                  ? "bg-[#FEF9C3] text-[#854D0E]"
                                  : getQCStatus(item) === "Critical"
                                    ? "bg-[#FEE2E2] text-[#991B1B]"
                                    : "bg-[#F1F5F9] text-[#64748B]"
                            }`}
                          >
                            {getQCStatus(item)}
                          </span>
                          {/* OPTIONAL: ANGKA */}
                          {item.confirmQty && (
                            <span className="text-[11px] font-bold text-[#94A3B8]">
                              {item.confirmQty}/{item.qty} Good
                            </span>
                          )}
                        </div>

                        {isClickable && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // penting!
                              handleCardClick(item);
                            }}
                            disabled={
                              (item.status === "Pending" || item.status === "On Proses") &&
                              item.stage !== "Pending"
                            }
                            className={`text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2 border ${(item.status === "Pending" || item.status === "On Proses") && item.stage !== "Pending" ? "bg-[#94A3B8] border-[#94A3B8] cursor-not-allowed opacity-60" : "bg-gradient-to-b from-[#2563EB] to-[#1D4ED8] hover:from-[#1D4ED8] hover:to-[#1E3A8A] border-[#1D4ED8]"}`}
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              rocket_launch
                            </span>{" "}
                            Process
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

              {processedData.filter((d) =>
                visibleStages[0].ids.includes(d.stage),
              ).length === 0 &&
                !isLoading && (
                  <div className="flex flex-col items-center justify-center p-20 text-[#64748B] bg-white rounded-2xl border border-dashed border-[#CBD5E1] shadow-sm">
                    <div className="w-20 h-20 bg-[#F1F5F9] rounded-full flex items-center justify-center mb-4 text-[#94A3B8]">
                      <span className="material-symbols-outlined text-4xl">
                        inbox
                      </span>
                    </div>
                    <p className="text-lg font-bold text-[#1E293B] mb-1">No Orders Found</p>
                    <p className="text-sm font-medium">
                      There are no active production orders in this stage.
                    </p>
                  </div>
                )}
            </div>
          </div>
        </div>
      ) : (
        // RECENT PRODUCTION WORKFLOW (LIST VIEW for ALL STAGES)
        <div className="flex-1 overflow-y-auto px-4 lg:px-8 py-6 bg-[#F1F5F9] w-full custom-scrollbar">
          <div className="max-w-[1400px] mx-auto bg-white rounded-3xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-[#E2E8F0] overflow-hidden">
            {/* Table Header */}
            <div className="hidden md:grid md:grid-cols-12 gap-4 px-8 py-4 bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <div className="col-span-2 text-[10px] font-black text-[#64748B] uppercase tracking-widest">
                ISSUE DATE
              </div>
              <div className="col-span-6 text-[10px] font-black text-[#64748B] uppercase tracking-widest">
                ORDER DETAILS
              </div>
              <div className="col-span-1 text-[10px] font-black text-[#64748B] uppercase tracking-widest text-center">
                QUANTITY
              </div>
              <div className="col-span-3 text-[10px] font-black text-[#64748B] uppercase tracking-widest text-center">
                PROCESS & STATUS
              </div>
            </div>

            {/* Table Content */}
            <div className="divide-y divide-[#E2E8F0]">
              {(() => {
                const grouped = processedData.reduce(
                  (acc, item) => {
                    const sId = item.id;
                    if (!acc[sId]) {
                      acc[sId] = {
                        id: sId,
                        client: item.client,
                        poNumber: item.poNumber,
                        deadline: item.deadline,
                        items: [],
                        totalQty: 0,
                        currentStage: item.stage,
                      };
                    }
                    acc[sId].items.push(item);
                    acc[sId].totalQty += item.qty;

                    const stageOrder = [
                      "Pending",
                      "Patterning",
                      "Cutting",
                      "Bordir",
                      "Sablon",
                      "Sewing",
                      "QC",
                      "Packing",
                      "Shipping"
                    ];
                    const activeIdx = stageOrder.indexOf(acc[sId].currentStage);
                    const itemIdx = stageOrder.indexOf(item.stage);
                    if (item.stage !== "Shipping") {
                      if (
                        acc[sId].currentStage === "Shipping" ||
                        itemIdx < activeIdx
                      ) {
                        acc[sId].currentStage = item.stage;
                      }
                    }
                    return acc;
                  },
                  {} as Record<string, any>,
                );

                const groups = Object.values(grouped);

                if (groups.length === 0) {
                  return (
                    <div className="py-24 flex flex-col items-center justify-center text-[#64748B]">
                      <div className="w-24 h-24 bg-[#F1F5F9] rounded-full flex items-center justify-center mb-6 text-[#94A3B8]">
                        <span className="material-symbols-outlined text-5xl">
                          inventory_2
                        </span>
                      </div>
                      <p className="text-xl font-extrabold text-[#1E293B] mb-2">
                        No Active Workflows
                      </p>
                      <p className="text-sm font-medium">
                        There are no production orders being processed right now.
                      </p>
                    </div>
                  );
                }

                return groups.map((so: any) => {
                    const stageOrder = [
                      "Pending",
                      "Patterning",
                      "Cutting",
                      "Bordir",
                      "Sablon",
                      "Sewing",
                      "QC",
                      "Packing",
                      "Shipping"
                    ];
                  const currentIdx = stageOrder.indexOf(so.currentStage);

                  return (
                    <div
                      key={so.id}
                      className="grid grid-cols-1 md:grid-cols-12 gap-5 px-6 md:px-8 py-6 md:py-8 hover:bg-[#F8FAFC] transition-colors cursor-pointer border-b border-[#E2E8F0] md:border-b-0 group"
                      onClick={() => navigate(`/kanban?search=${so.id}`)}
                    >
                      <div className="col-span-1 md:col-span-2 flex flex-row md:flex-col justify-between md:justify-start items-center md:items-start gap-2">
                        <span className="text-[14px] text-[#475569] font-bold">
                          {(() => {
                            if (so.deadline === '-') return 'Invalid Date';
                            try {
                                const d = new Date(so.deadline);
                                if (isNaN(d.getTime())) return 'Invalid Date';
                                d.setDate(d.getDate() - 15);
                                return d.toLocaleDateString("en-GB", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                });
                            } catch (e) {
                                return 'Invalid Date';
                            }
                          })()}
                        </span>
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${getDeadlineDelta(so.deadline) <= 3 ? "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]" : "bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0]"}`}>
                          <span className="material-symbols-outlined text-[16px]">
                            schedule
                          </span>
                          <span className="text-[11px] font-bold uppercase tracking-widest">
                            DL: {so.deadline}
                          </span>
                        </div>
                      </div>

                      <div className="col-span-1 md:col-span-6 flex flex-col gap-4 mt-2 md:mt-0">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-[#1E293B] to-[#334155] rounded-lg shadow-sm flex items-center justify-center text-[10px] text-white font-black tracking-wider">
                            SO
                          </div>
                          <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                            <span className="text-[18px] font-extrabold text-[#0F172A] tracking-tight group-hover:text-[#2563EB] transition-colors">
                              {so.id}
                            </span>
                            <span className="text-[14px] font-bold text-[#64748B] flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[16px]">domain</span>
                              {so.client}
                            </span>
                            {so.poNumber && (
                              <span className="text-[13px] font-bold text-[#64748B] flex items-center gap-1.5 mt-1 md:mt-0">
                                <span className="material-symbols-outlined text-[14px]">receipt_long</span>
                                PO: {so.poNumber}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 mt-1">
                          {so.items.map((it: any) => (
                            <div
                              key={it.product}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCardClick(it);
                              }}
                              className="bg-white border border-[#E2E8F0] shadow-sm rounded-xl px-4 py-3 flex flex-col gap-2 hover:border-[#93C5FD] hover:shadow-md transition-all group/item"
                            >
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  <span className="material-symbols-outlined text-[16px] text-[#94A3B8] group-hover/item:text-[#2563EB]">checkroom</span>
                                  <span className="font-bold text-[14px] text-[#1E293B] group-hover/item:text-[#2563EB] transition-colors">
                                    {it.product}
                                  </span>
                                </div>
                                <span className="text-[#64748B] font-bold tabular-nums text-[13px]">
                                  x {it.qty}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2 ml-6">
                                <div className="flex items-center gap-1 bg-[#F8FAFC] text-[#475569] text-[11px] font-semibold px-2 py-1 rounded border border-[#E2E8F0]">
                                  <span className="material-symbols-outlined text-[14px] text-[#64748B]">
                                    notes
                                  </span>
                                  {it.note || "Standard Production"}
                                </div>
                                <div className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md border ${it.status === 'Selesai' ? 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]' : 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]'}`}>
                                  {it.status || 'Pending'}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="col-span-1 md:col-span-1 flex items-center justify-between md:justify-center border-t md:border-t-0 pt-4 md:pt-0 mt-3 md:mt-0">
                        <span className="text-[11px] font-bold text-[#94A3B8] tracking-widest uppercase md:hidden">Total Qty</span>
                        <div className="flex flex-col items-center">
                          <span className="text-[20px] font-extrabold text-[#0F172A] tabular-nums tracking-tight">
                            {so.totalQty.toLocaleString("id-ID")}
                          </span>
                          <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest hidden md:block">PCS</span>
                        </div>
                      </div>

                      <div className="col-span-1 md:col-span-3 flex flex-col items-center justify-center gap-5 mt-4 md:mt-0 border-t border-[#F1F5F9] md:border-none pt-5 md:pt-0 px-2">
                        <div className="flex items-center gap-2 bg-[#EFF6FF] text-[#2563EB] px-5 py-2 rounded-xl border border-[#BFDBFE] cursor-pointer hover:bg-[#DBEAFE] transition-all group/stage w-full justify-center shadow-sm">
                          <span className="text-[12px] font-black uppercase tracking-widest">
                            {so.currentStage === "Shipping" ? "SELESAI" : so.currentStage.toUpperCase()}
                          </span>
                          <span className="material-symbols-outlined text-[18px] group-hover/stage:translate-y-0.5 transition-transform">
                            expand_more
                          </span>
                        </div>

                        <div className="relative w-full flex items-center justify-between px-2 py-4 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]">
                          <div className="absolute top-1/2 left-6 right-6 h-[2px] bg-[#E2E8F0] -translate-y-1/2 z-0"></div>

                          {stageOrder.map((st, idx) => {
                            const isPastOrCurrent = idx <= currentIdx;
                            const isLastStage = idx === stageOrder.length - 1;

                            return (
                              <div key={st} className="relative z-10 flex flex-col items-center" title={st}>
                                {isLastStage ? (
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shadow-sm ring-4 ring-[#F8FAFC] transition-colors ${isPastOrCurrent ? "bg-[#1E293B] text-white" : "bg-white border-2 border-[#CBD5E1] text-[#CBD5E1]"}`}>
                                    <span className="material-symbols-outlined text-[14px] font-bold">
                                      check
                                    </span>
                                  </div>
                                ) : (
                                  <div
                                    className={`w-3.5 h-3.5 rounded-full ring-4 ring-[#F8FAFC] shadow-sm transition-colors ${isPastOrCurrent ? "bg-[#3B82F6]" : "bg-white border-2 border-[#CBD5E1]"}`}
                                  ></div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Action Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSelectedItem(null)}
          ></div>
          <div className="bg-surface rounded-2xl p-5 md:p-6 w-full max-w-lg shadow-ambient border border-outline-variant/20 relative z-10 animate-fade-in overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-surface-tint"></div>

            <h3 className="text-xl font-headline font-bold text-on-surface mb-2">
              Konfirmasi Proses
            </h3>

            <div className="flex flex-col mb-4">
              <span className="text-[11px] text-outline font-label uppercase mb-1">
                Special Instruction / Keterangan
              </span>
              <span className="text-[12px] text-on-surface-variant bg-yellow-500/10 px-3 py-2.5 rounded-lg border border-yellow-500/20 leading-relaxed max-h-24 overflow-y-auto">
                {selectedItem.note && selectedItem.note.trim() !== ""
                  ? selectedItem.note
                  : "Tidak ada instruksi khusus."}
              </span>
            </div>

            <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/20 mb-6 space-y-3">
              <div className="flex justify-between border-b border-surface-container-highest pb-2">
                <span className="text-[11px] text-outline font-label uppercase">
                  Client
                </span>
                <span className="text-sm font-semibold text-on-surface">
                  {selectedItem.client}
                </span>
              </div>
              <div className="flex justify-between border-b border-surface-container-highest pb-2">
                <span className="text-[11px] text-outline font-label uppercase">
                  PO Number
                </span>
                <span className="text-sm font-medium text-on-surface">
                  {selectedItem.poNumber || "-"}
                </span>
              </div>
              <div className="flex justify-between border-b border-surface-container-highest pb-2">
                <span className="text-[11px] text-outline font-label uppercase">
                  SO Name
                </span>
                <span className="text-sm font-bold text-primary">
                  {selectedItem.id}
                </span>
              </div>
              <div className="flex justify-between border-b border-surface-container-highest pb-2">
                <span className="text-[11px] text-outline font-label uppercase">
                  Product Name
                </span>
                <span
                  className="text-sm font-medium text-on-surface truncate max-w-[200px]"
                  title={selectedItem.product}
                >
                  {selectedItem.product}
                </span>
              </div>
              {selectedItem.bom && selectedItem.bom.length > 0 && (
                <div className="flex flex-col border-b border-surface-container-highest pb-2 gap-1.5">
                  <span className="text-[11px] text-outline font-label uppercase">
                    Bill of Materials (BOM)
                  </span>
                  <div className="flex flex-col gap-1 mt-1">
                    {selectedItem.bom.map((b: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-xs bg-surface-container-low px-2 py-1.5 rounded text-on-surface">
                        <span className="font-medium">{b.material}</span>
                        <span className="text-secondary font-bold">{b.qty} {b.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-between border-b border-surface-container-highest pb-2">
                <span className="text-[11px] text-outline font-label uppercase">
                  Qty SO
                </span>
                <span className="text-sm font-bold text-on-surface tabular-nums">
                  {selectedItem.qty.toLocaleString("id-ID")}
                </span>
              </div>

              {(selectedItem.stage !== "Pending") && (
                <div className="pt-2 border-b border-surface-container-highest pb-4">
                  <span className="text-[11px] text-outline font-label uppercase mb-3 block">
                    Konfirmasi Kuantiti Proses
                  </span>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="flex flex-col">
                      <label className="text-[10px] text-on-surface-variant font-medium mb-1">
                        Qty Good (Lolos)
                      </label>
                      <input
                        type="number"
                        className="bg-surface border border-[#10B981]/30 bg-[#10B981]/5 rounded-lg px-3 py-1.5 text-xs text-[#065F46] font-bold focus:outline-none focus:border-[#10B981]"
                        value={formData.qtyGood}
                        onChange={(e) => setFormData({...formData, qtyGood: e.target.value})}
                        placeholder="0"
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-[10px] text-on-surface-variant font-medium mb-1">
                        Qty Not Good (Reject)
                      </label>
                      <input
                        type="number"
                        className="bg-surface border border-[#EF4444]/30 bg-[#EF4444]/5 rounded-lg px-3 py-1.5 text-xs text-[#991B1B] font-bold focus:outline-none focus:border-[#EF4444]"
                        value={formData.qtyNotGood}
                        onChange={(e) => setFormData({...formData, qtyNotGood: e.target.value})}
                        placeholder="0"
                      />
                    </div>

                    {selectedItem.stage !== "QC" && (
                      <div className="flex flex-col">
                        <label className="text-[10px] text-on-surface-variant font-medium mb-1 line-clamp-1" title="Sisa Kekurangan Bahan">
                          Kekurangan Bahan
                        </label>
                        <input
                          type="number"
                          className="bg-surface border border-yellow-500/30 bg-yellow-500/5 rounded-lg px-3 py-1.5 text-xs text-yellow-800 font-bold focus:outline-none focus:border-yellow-500"
                          value={formData.qtySisaBahan}
                          onChange={(e) => setFormData({...formData, qtySisaBahan: e.target.value})}
                          placeholder="0"
                        />
                      </div>
                    )}
                  </div>

                  {parseInt(formData.qtySisaBahan || "0", 10) > 0 && selectedItem.stage !== "QC" && (
                    <div className="flex flex-col mt-3">
                      <label className="text-[10px] text-yellow-700 font-bold mb-1">
                        Keterangan Kekurangan Bahan (Akan kembali ke Pending)
                      </label>
                      <textarea
                        className="bg-surface border border-yellow-500/30 rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-yellow-500"
                        value={formData.noteSisaBahan}
                        onChange={(e) => setFormData({...formData, noteSisaBahan: e.target.value})}
                        placeholder="Jelaskan alasan kekurangan bahan..."
                        rows={2}
                      ></textarea>
                    </div>
                  )}

                  {selectedItem.stage === "QC" && parseInt(formData.qtyNotGood || "0", 10) > 0 && (
                    <div className="flex flex-col mt-3">
                      <label className="text-[10px] text-red-700 font-bold mb-1">
                        Kembalikan Not Good (Reject) Ke:
                      </label>
                      <select
                        className="w-full bg-surface border border-red-500/30 rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-red-500 font-bold"
                        value={formData.qcRedirectTarget}
                        onChange={(e) => setFormData({...formData, qcRedirectTarget: e.target.value})}
                      >
                        <option value="Patterning">Patterning</option>
                        <option value="Cutting">Cutting</option>
                        <option value="Bordir">Bordir</option>
                        <option value="Sablon">Sablon</option>
                        <option value="Sewing">Sewing</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              {(selectedItem.stage === "Sablon" ||
                selectedItem.stage === "Bordir") && (
                <div className="pt-2 border-b border-surface-container-highest pb-4">
                  <span className="text-[11px] text-outline font-label uppercase mb-3 block">
                    Form Input Gudang
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col">
                      <label className="text-[10px] text-on-surface-variant font-medium mb-1">
                        Qty Kirim
                      </label>
                      <input
                        type="text"
                        className="bg-surface border border-outline-variant/30 rounded-lg px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary"
                        value={formData.qtyKirim}
                        onChange={(e) => {
                          const val = e.target.value;
                          const k = parseInt(val) || 0;
                          const m = parseInt(formData.qtyMasuk) || 0;
                          const selisihVal = m > k ? (m - k).toString() : "0";
                          setFormData({
                            ...formData,
                            qtyKirim: val,
                            selisih: selisihVal,
                            aktual: selisihVal,
                          });
                        }}
                        placeholder="0"
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-[10px] text-on-surface-variant font-medium mb-1">
                        Tgl Kirim
                      </label>
                      <input
                        type="date"
                        className="bg-surface border border-outline-variant/30 rounded-lg px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary"
                        value={formData.tglKirim}
                        onChange={(e) =>
                          setFormData({ ...formData, tglKirim: e.target.value })
                        }
                        placeholder="DD/MM/YYYY"
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-[10px] text-on-surface-variant font-medium mb-1">
                        Qty Masuk
                      </label>
                      <input
                        type="text"
                        className="bg-surface border border-outline-variant/30 rounded-lg px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary"
                        value={formData.qtyMasuk}
                        onChange={(e) => {
                          const val = e.target.value;
                          const m = parseInt(val) || 0;
                          const k = parseInt(formData.qtyKirim) || 0;
                          const selisihVal = m > k ? (m - k).toString() : "0";
                          setFormData({
                            ...formData,
                            qtyMasuk: val,
                            selisih: selisihVal,
                            aktual: selisihVal,
                          });
                        }}
                        placeholder="0"
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-[10px] text-on-surface-variant font-medium mb-1">
                        Selisih
                      </label>
                      <input
                        type="text"
                        className="bg-surface border border-outline-variant/30 rounded-lg px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary"
                        value={formData.selisih}
                        onChange={(e) =>
                          setFormData({ ...formData, selisih: e.target.value })
                        }
                        placeholder="0"
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-[10px] text-on-surface-variant font-medium mb-1">
                        Target
                      </label>
                      <input
                        type="text"
                        className="bg-surface border border-outline-variant/30 rounded-lg px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary"
                        value={formData.target}
                        onChange={(e) =>
                          setFormData({ ...formData, target: e.target.value })
                        }
                        placeholder="Target"
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-[10px] text-on-surface-variant font-medium mb-1">
                        Aktual
                      </label>
                      <input
                        type="text"
                        className="bg-surface border border-outline-variant/30 rounded-lg px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary"
                        value={formData.aktual}
                        onChange={(e) =>
                          setFormData({ ...formData, aktual: e.target.value })
                        }
                        placeholder="Aktual"
                      />
                    </div>
                    <div className="flex flex-col col-span-2">
                      <label className="text-[10px] text-on-surface-variant font-medium mb-1">
                        Tempat / Vendor
                      </label>
                      <input
                        type="text"
                        className="bg-surface border border-outline-variant/30 rounded-lg px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary"
                        value={formData.vendor}
                        onChange={(e) =>
                          setFormData({ ...formData, vendor: e.target.value })
                        }
                        placeholder="Nama Vendor"
                      />
                    </div>
                    <div className="flex flex-col col-span-2">
                      <label className="text-[10px] text-on-surface-variant font-medium mb-1">
                        Special Instruction
                      </label>
                      <textarea
                        className="bg-surface border border-outline-variant/30 rounded-lg px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary"
                        value={formData.note}
                        onChange={(e) =>
                          setFormData({ ...formData, note: e.target.value })
                        }
                        placeholder="Instruksi Khusus..."
                        rows={2}
                      ></textarea>
                    </div>
                  </div>
                </div>
              )}

              {selectedItem.stage === "CMT" && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-b border-surface-container-highest pb-3 pt-1">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-outline font-label uppercase">
                      Qty Kirim
                    </span>
                    <span className="text-sm font-medium text-on-surface tabular-nums">
                      {selectedItem.qtyKirim || "-"}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-outline font-label uppercase">
                      Tgl Kirim
                    </span>
                    <span className="text-sm font-medium text-on-surface">
                      {selectedItem.tglKirim || "-"}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-outline font-label uppercase">
                      Qty Masuk
                    </span>
                    <span className="text-sm font-medium text-on-surface tabular-nums">
                      {selectedItem.qtyMasuk || "-"}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-outline font-label uppercase">
                      Selisih
                    </span>
                    <span className="text-sm font-medium text-on-surface tabular-nums">
                      {selectedItem.selisih || "-"}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-outline font-label uppercase">
                      Target
                    </span>
                    <span className="text-sm font-medium text-on-surface tabular-nums">
                      {selectedItem.target || "-"}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-outline font-label uppercase">
                      Aktual
                    </span>
                    <span className="text-sm font-medium text-on-surface">
                      {selectedItem.aktual || "-"}
                    </span>
                  </div>
                  <div className="col-span-2 flex flex-col pt-2 border-t border-surface-container-highest/50">
                    <span className="text-[10px] text-outline font-label uppercase">
                      Date Line
                    </span>
                    <span
                      className={`text-sm font-bold mt-0.5 ${getDeadlineDelta(selectedItem.deadline) <= 3 ? "text-error" : "text-on-surface"}`}
                    >
                      {selectedItem.deadline || "-"}{" "}
                      {getDeadlineDelta(selectedItem.deadline) <= 3 &&
                        selectedItem.deadline !== "-" && (
                          <span className="ml-1 text-[10px] text-error font-medium">
                            ({formatDeadlineLabel(selectedItem.deadline)})
                          </span>
                        )}
                    </span>
                  </div>
                  <div className="col-span-2 flex flex-col pt-1 mt-1 border-t border-surface-container-highest/50">
                    <span className="text-[10px] text-outline font-label uppercase">
                      Tempat / Vendor
                    </span>
                    <span className="text-sm font-bold text-tertiary mt-0.5">
                      {selectedItem.vendor && selectedItem.vendor.trim() !== ""
                        ? selectedItem.vendor
                        : "Belum Ditentukan"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3 mb-6">
              {selectedItem.stage === "Pending" && (
                <button
                  onClick={() => confirmMove("Patterning")}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-outline-variant/30 bg-surface-container-lowest hover:bg-primary-container/30 hover:border-primary/40 transition-all group"
                >
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-semibold text-sm text-on-surface group-hover:text-primary transition-colors">
                      Kirim ke Patterning
                    </span>
                    <span className="text-[11px] text-outline">
                      Proses pembuatan pola
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors">
                    architecture
                  </span>
                </button>
              )}

              {selectedItem.stage === "Patterning" && (
                <button
                  onClick={() => confirmMove("Cutting")}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-outline-variant/30 bg-surface-container-lowest hover:bg-primary-container/30 hover:border-primary/40 transition-all group"
                >
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-semibold text-sm text-on-surface group-hover:text-primary transition-colors">
                      Kirim ke Cutting
                    </span>
                    <span className="text-[11px] text-outline">
                      Proses pemotongan bahan
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors">
                    content_cut
                  </span>
                </button>
              )}

              {selectedItem.stage === "Cutting" && (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => confirmMove("Bordir")}
                    className="w-full flex items-center justify-between p-4 rounded-xl border border-outline-variant/30 bg-surface-container-lowest hover:bg-primary-container/30 hover:border-primary/40 transition-all group"
                  >
                    <div className="flex flex-col items-start gap-1">
                      <span className="font-semibold text-sm text-on-surface group-hover:text-primary transition-colors">
                        Kirim ke Bordir
                      </span>
                    </div>
                    <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors">
                      gesture
                    </span>
                  </button>
                  <button
                    onClick={() => confirmMove("Sablon")}
                    className="w-full flex items-center justify-between p-4 rounded-xl border border-outline-variant/30 bg-surface-container-lowest hover:bg-primary-container/30 hover:border-primary/40 transition-all group"
                  >
                    <div className="flex flex-col items-start gap-1">
                      <span className="font-semibold text-sm text-on-surface group-hover:text-primary transition-colors">
                        Kirim ke Sablon
                      </span>
                    </div>
                    <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors">
                      layers
                    </span>
                  </button>
                  <button
                    onClick={() => confirmMove("Sewing")}
                    className="w-full flex items-center justify-between p-4 rounded-xl border border-outline-variant/30 bg-surface-container-lowest hover:bg-blue-50 hover:border-blue-300 transition-all group"
                  >
                    <div className="flex flex-col items-start gap-1">
                      <span className="font-semibold text-sm text-on-surface group-hover:text-blue-600 transition-colors">
                        Langsung Sewing
                      </span>
                    </div>
                    <span className="material-symbols-outlined text-outline group-hover:text-blue-600 transition-colors">
                      precision_manufacturing
                    </span>
                  </button>
                </div>
              )}

              {selectedItem.stage === "Bordir" && (
                <button
                  onClick={() => confirmMove("Sewing")}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-outline-variant/30 bg-surface-container-lowest hover:bg-blue-50 hover:border-blue-300 transition-all group"
                >
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-semibold text-sm text-on-surface group-hover:text-blue-600 transition-colors">
                      Kirim ke Sewing
                    </span>
                    <span className="text-[11px] text-outline">
                      Proses penjahitan
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-outline group-hover:text-blue-600 transition-colors">
                    precision_manufacturing
                  </span>
                </button>
              )}

              {selectedItem.stage === "Sablon" && (
                <button
                  onClick={() => confirmMove("Sewing")}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-outline-variant/30 bg-surface-container-lowest hover:bg-blue-50 hover:border-blue-300 transition-all group"
                >
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-semibold text-sm text-on-surface group-hover:text-blue-600 transition-colors">
                      Kirim ke Sewing
                    </span>
                    <span className="text-[11px] text-outline">
                      Proses penjahitan
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-outline group-hover:text-blue-600 transition-colors">
                    precision_manufacturing
                  </span>
                </button>
              )}

              {selectedItem.stage === "Sewing" && (
                <button
                  onClick={() => confirmMove("QC")}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-outline-variant/30 bg-surface-container-lowest hover:bg-primary-container/30 hover:border-primary/40 transition-all group"
                >
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-semibold text-sm text-on-surface group-hover:text-primary transition-colors">
                      Kirim ke QC
                    </span>
                    <span className="text-[11px] text-outline">
                      Pengecekan kualitas produksi
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors">
                    fact_check
                  </span>
                </button>
              )}

              {selectedItem.stage === "QC" && (
                <div className="space-y-4">
                  <div className="bg-surface-container-highest/30 p-4 rounded-xl border border-outline-variant/30 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#10B981]"></div>
                    <div className="flex items-center space-x-2 mb-4">
                      <span className="material-symbols-outlined text-[#10B981] text-[20px]">
                        verified
                      </span>
                      <h4 className="text-[13px] font-bold text-on-surface uppercase tracking-wide">
                        Finalisasi & QC
                      </h4>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-2">
                      <div>
                        <label className="text-[11px] font-bold text-outline uppercase mb-1.5 block">
                          Status QC
                        </label>
                        <div className="relative">
                          <select
                            className="w-full appearance-none bg-surface border border-outline-variant/50 rounded-lg px-3 py-2 text-sm text-on-surface font-semibold focus:border-primary outline-none transition-colors"
                            value={statusQC}
                            onChange={(e) => setStatusQC(e.target.value)}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Selesai">Selesai (Lolos QC)</option>
                          </select>
                          <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-outline-variant pointer-events-none text-[18px]">
                            expand_more
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => confirmMove("QC_Result")}
                    disabled={statusQC === "Pending"}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border border-outline-variant/30 transition-all group ${statusQC === "Pending" ? "bg-surface-container-highest/20 opacity-50 cursor-not-allowed" : "bg-surface-container-lowest hover:bg-[#10B981]/10 hover:border-[#10B981]/40"}`}
                  >
                    <div className="flex flex-col items-start gap-1">
                      <span
                        className={`font-semibold text-sm transition-colors ${statusQC === "Pending" ? "text-outline" : "text-[#10B981]"}`}
                      >
                        Konfirmasi Hasil QC
                      </span>
                      <span className="text-[11px] text-outline">
                        Proses QC (Lolos ke Gudang, Reject ke perbaikan)
                      </span>
                    </div>
                    <span
                      className={`material-symbols-outlined transition-colors ${statusQC === "Pending" ? "text-outline-variant" : "text-[#10B981]"}`}
                    >
                      done_all
                    </span>
                  </button>
                </div>
              )}
              {selectedItem.stage === "Packing" && (
                <button
                  onClick={() => confirmMove("Shipping")}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-outline-variant/30 bg-surface-container-lowest hover:bg-primary-container/30 hover:border-primary/40 transition-all group"
                >
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-semibold text-sm text-on-surface group-hover:text-primary transition-colors">
                      Kirim ke Shipping
                    </span>
                    <span className="text-[11px] text-outline">
                      Proses pengiriman produk
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors">
                    local_shipping
                  </span>
                </button>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-surface-container-highest">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-5 py-2.5 rounded-xl font-label text-sm font-semibold text-secondary hover:bg-surface-container-low transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
