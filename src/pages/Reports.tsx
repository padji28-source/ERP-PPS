import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fetchProductionData, ProductionOrder } from '../services/dataService';

export default function Reports() {
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('All');
  const [data, setData] = useState<ProductionOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const orders = await fetchProductionData();
      setData(orders);
      setIsLoading(false);
    }
    load();
  }, []);

  const filteredData = data.filter(item => {
    let matchTab = true;
    if (activeTab === 'Sisa') {
      matchTab = item.id.includes('-R');
    } else if (activeTab !== 'All') {
      matchTab = item.status === activeTab;
    }
    const matchStage = stageFilter === 'All' ? true : item.stage === stageFilter;
    const searchLower = searchQuery.toLowerCase();
    const matchSearch = item.id.toLowerCase().includes(searchLower) ||
                        item.client.toLowerCase().includes(searchLower) ||
                        (item.poNumber && item.poNumber.toLowerCase().includes(searchLower)) ||
                        item.product.toLowerCase().includes(searchLower);
    return matchTab && matchStage && matchSearch;
  });

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredData.map(row => ({
      'SO ID': row.id,
      'Client': row.client,
      'PO Number': row.poNumber || '-',
      'Product': row.product,
      'Target Qty': row.qty,
      'Stage': row.stage,
      'Vendor / Tempat': row.vendor || '-',
      'Status': row.status,
      'Deadline': row.deadline,
      'Note': row.note
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Production_Report");
    XLSX.writeFile(wb, "Production_Report_PT_Parahita.xlsx");
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("PT Parahita - Production Report", 14, 20);
    doc.setFontSize(11);
    doc.setTextColor(100);
    const dateStr = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(`Generated on: ${dateStr} | Filter: ${activeTab}`, 14, 28);

    autoTable(doc, {
      startY: 35,
      head: [['SO ID', 'Client', 'Product', 'Qty', 'Stage', 'Vendor', 'Status', 'Deadline']],
      body: filteredData.map(row => [
        row.id, 
        row.client, 
        row.product, 
        row.qty.toLocaleString(), 
        row.stage, 
        row.vendor || '-',
        row.status, 
        row.deadline
      ]),
      theme: 'grid',
      headStyles: { fillColor: [0, 40, 142] },
      alternateRowStyles: { fillColor: [242, 244, 246] },
      styles: { fontSize: 8, cellPadding: 3 },
    });

    doc.save("Production_Report_PT_Parahita.pdf");
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-surface w-full max-w-[1600px] mx-auto overflow-hidden">
      <main className="flex-1 overflow-y-auto pt-4 md:pt-8 px-4 md:px-12 pb-8 w-full">
        {/* Page Header Section */}
        <header className="mb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-headline font-bold text-on-surface tracking-tight mb-2">Production Reports</h1>
            <p className="text-on-surface-variant font-label text-sm max-w-xl">
              Comprehensive overview of all production orders, synchronized securely from the Master Data Sheet.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              onClick={handleExportExcel}
              disabled={isLoading || filteredData.length === 0}
              className="disabled:opacity-50 disabled:cursor-not-allowed bg-surface-container-lowest text-primary font-label text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-surface-bright transition-colors flex items-center justify-center gap-2 ghost-border shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">table_view</span>
              Export Excel
            </button>
            <button 
              onClick={handleExportPDF}
              disabled={isLoading || filteredData.length === 0}
              className="disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-b from-primary to-primary-container text-on-primary font-label text-sm font-medium px-5 py-2.5 rounded-xl shadow-sm hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
              Export PDF
            </button>
          </div>
        </header>

        {/* Filters */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/20 pb-4">
          <div className="flex space-x-2 overflow-x-auto">
            {['All', 'On Process', 'Selesai', 'Sisa'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-secondary hover:text-on-surface'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:w-auto">
              <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-outline text-sm">search</span>
              <input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 w-full sm:w-64 bg-surface-container-lowest border border-outline-variant/50 rounded-xl text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary focus:outline-none transition-all text-on-surface placeholder:text-outline" 
                placeholder="Search Client, SO, Product..." 
                type="text"
              />
            </div>
            
            <select 
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="w-full sm:w-auto px-4 py-2 bg-surface-container-lowest border border-outline-variant/50 rounded-xl text-sm text-on-surface focus:ring-2 focus:ring-primary/40 focus:border-primary focus:outline-none transition-all"
            >
              <option value="All">Semua Stage</option>
              <option value="Pending">Pending</option>
              <option value="Patterning">Patterning</option>
              <option value="Cutting">Cutting</option>
              <option value="Bordir">Bordir</option>
              <option value="Sablon">Sablon</option>
              <option value="Sewing">Sewing</option>
              <option value="QC">QC</option>
              <option value="Shipping">Shipping</option>
            </select>
          </div>
        </div>

        {/* Data Grid Canvas */}
        <section className="bg-surface-container-low rounded-[1.25rem] p-2 md:p-4 ghost-border min-h-[400px]">
          {/* Grid Header */}
          <div className="hidden md:grid grid-cols-[1.2fr_1.5fr_2fr_1fr_1.2fr_1fr_1.2fr] gap-6 px-6 py-4 text-[11px] font-label text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/10 mb-2">
            <div>SO ID</div>
            <div>Client</div>
            <div>Product Name</div>
            <div className="text-right">Quantity</div>
            <div>Stage / Vendor</div>
            <div>Status</div>
            <div>Deadline</div>
          </div>

          {/* List Container */}
          <div className="flex flex-col gap-2 relative">
            {isLoading && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-surface-container-low/50 backdrop-blur-sm min-h-[300px]">
                <span className="material-symbols-outlined animate-spin text-primary text-4xl mb-4">settings</span>
                <p className="text-sm font-medium text-on-surface-variant">Syncing from Google Sheet...</p>
              </div>
            )}
            
            {!isLoading && filteredData.map((row, idx) => (
              <div key={`${row.id}-${idx}`} className="bg-surface-container-lowest rounded-xl p-4 md:px-6 md:py-5 flex flex-col md:grid md:grid-cols-[1.2fr_1.5fr_2fr_1fr_1.2fr_1fr_1.2fr] gap-4 md:gap-6 items-start md:items-center ghost-border transition-all hover:bg-surface-bright even:bg-surface-container-high/30">
                <div className="flex flex-col">
                  <span className="font-label text-xs text-outline mb-1 md:hidden">SO ID</span>
                  <span className="font-semibold text-sm text-on-surface tracking-tight">{row.id}</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label text-xs text-outline mb-1 md:hidden">Client</span>
                  <span className="text-sm font-medium text-on-surface-variant">{row.client}</span>
                  {row.poNumber && <span className="text-[11px] text-outline truncate" title={row.poNumber}>PO: {row.poNumber}</span>}
                </div>
                <div className="flex flex-col">
                  <span className="font-label text-xs text-outline mb-1 md:hidden">Product</span>
                  <span className="text-sm text-on-surface leading-tight line-clamp-2" title={row.product}>{row.product}</span>
                </div>
                <div className="flex flex-col md:items-end w-full md:w-auto">
                  <span className="font-label text-xs text-outline mb-1 md:hidden">Qty</span>
                  <span className="text-xl font-bold text-on-surface tabular-nums">{row.qty.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label text-xs text-outline mb-1 md:hidden">Stage / Vendor</span>
                  <span className="bg-surface-container-high text-on-surface-variant text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider w-fit mb-1">{row.stage}</span>
                  {row.vendor && <span className="text-[11px] text-outline truncate" title={row.vendor}>{row.vendor}</span>}
                </div>
                <div className="flex flex-col">
                  <span className="font-label text-xs text-outline mb-1 md:hidden">Status</span>
                  <div className="inline-flex flex-col gap-1 w-fit">
                    {row.status === 'Selesai' && (
                      <span className="bg-secondary-container text-on-secondary-container text-[11px] font-medium px-2 py-1 rounded-md flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">check_circle</span>
                        Selesai
                      </span>
                    )}
                    {row.status === 'On Process' && (
                      <span className="bg-surface-dim text-on-surface text-[11px] font-medium px-2 py-1 rounded-md flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                        On Process
                      </span>
                    )}
                    {row.status === 'Blocked' && (
                      <span className="bg-error-container text-on-error-container text-[11px] font-medium px-2 py-1 rounded-md flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">warning</span>
                        Blocked
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="font-label text-xs text-outline mb-1 md:hidden">Deadline</span>
                  <span className={`text-[13px] ${row.status === 'Selesai' ? 'text-outline line-through' : 'text-on-surface font-medium'}`}>
                    {row.deadline}
                  </span>
                </div>
              </div>
            ))}
            
            {!isLoading && filteredData.length === 0 && (
              <div className="py-16 flex flex-col items-center justify-center text-outline">
                <span className="material-symbols-outlined text-4xl mb-4 opacity-50">search_off</span>
                <p>No records found for this filter.</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
