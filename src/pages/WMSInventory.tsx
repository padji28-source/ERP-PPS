import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchProductionData, ProductionOrder } from '../services/dataService';

export default function WMSInventory() {
  const [data, setData] = useState<(ProductionOrder & { synced: boolean })[]>([]);
  const [filterType, setFilterType] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      const orders = await fetchProductionData();
      const finished = orders
        .filter(o => o.status === 'Selesai' || o.id.includes('-R'))
        .map(o => ({ ...o, synced: false }));
      
      // Simulate that some are already synced (say, randomly or first half)
      const mapped = finished.map((item, idx) => ({
        ...item,
        synced: idx % 3 !== 0 // 2/3 are synced, 1/3 pending
      }));

      setData(mapped);
      setIsLoading(false);
    }
    load();
  }, []);

  const handleSync = (id: string) => {
    setData(prev => prev.map(item => item.id === id ? { ...item, synced: true } : item));
  };

  const filteredData = data.filter(d => {
    if (filterType === 'Sisa') return d.id.includes('-R');
    if (filterType === 'Selesai') return !d.id.includes('-R');
    return true;
  });

  const pendingCount = filteredData.filter(d => !d.synced).length;
  const syncedCount = filteredData.filter(d => d.synced).length;

  return (
    <div className="flex-1 flex flex-col h-full bg-surface w-full max-w-[1600px] mx-auto overflow-hidden">
      <main className="flex-1 overflow-y-auto pt-4 md:pt-8 px-4 md:px-12 pb-8 w-full relative">
        {isLoading && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-surface/50 backdrop-blur-sm">
            <span className="material-symbols-outlined animate-spin text-primary text-4xl mb-4">refresh</span>
            <p className="text-sm font-medium text-on-surface-variant">Gathering WMS Inventory Data...</p>
          </div>
        )}

        {/* Page Header Section */}
        <header className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-headline font-bold text-on-surface tracking-tight mb-2">Inventory Integration</h1>
            <p className="text-on-surface-variant font-label text-sm max-w-xl">
              Review finished production orders ('Selesai') and manage their transfer status to the central Warehouse Management System.
            </p>
          </div>
          
          {/* Contextual Quick Stats (Bento Grid Mini) */}
          <div className="flex gap-4">
            <div className="bg-surface-container-lowest ghost-border rounded-xl p-4 flex flex-col justify-center min-w-[140px]">
              <span className="text-on-surface-variant font-label text-xs uppercase tracking-wider mb-1">Pending Sync</span>
              <span className="font-headline text-2xl font-bold text-on-surface tabular-nums">{isLoading ? '...' : pendingCount}</span>
            </div>
            <div className="bg-surface-container-lowest ghost-border rounded-xl p-4 flex flex-col justify-center min-w-[140px]">
              <span className="text-on-surface-variant font-label text-xs uppercase tracking-wider mb-1">Synced Today</span>
              <span className="font-headline text-2xl font-bold text-on-surface tabular-nums text-primary">{isLoading ? '...' : syncedCount}</span>
            </div>
          </div>
        </header>

        {/* Filters */}
        <div className="mb-6 flex space-x-2 overflow-x-auto border-b border-outline-variant/20 pb-4">
          {['All', 'Selesai', 'Sisa'].map(tab => (
            <button
              key={tab}
              onClick={() => setFilterType(tab)}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                filterType === tab 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-secondary hover:text-on-surface'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Data Grid Canvas */}
        <section className="bg-surface-container-low rounded-[1.25rem] p-2 md:p-4 ghost-border">
          {/* Grid Header (Semantic columns) */}
          <div className="hidden md:grid grid-cols-[1.2fr_2fr_1fr_1.2fr_1fr_1.5fr] gap-6 px-6 py-4 text-xs font-label text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/10 mb-2">
            <div>SO ID</div>
            <div>Product Name</div>
            <div className="text-right">Quantity</div>
            <div>Finish Date</div>
            <div>Sync Status</div>
            <div className="text-right text-transparent">Action</div>
          </div>

          {/* List Container (No internal borders, zebra striping) */}
          <div className="flex flex-col gap-2 relative">
            {!isLoading && filteredData.length === 0 && (
              <div className="py-16 flex flex-col items-center justify-center text-outline">
                <span className="material-symbols-outlined text-4xl mb-4 opacity-50">inventory_2</span>
                <p>No completed inventory found.</p>
              </div>
            )}
            
            {!isLoading && filteredData.map((item, idx) => {
              const isSisa = item.id.includes('-R');
              return (
              <div key={`${item.id}-${idx}`} className={`bg-surface-container-lowest rounded-xl p-4 md:px-6 md:py-5 flex flex-col md:grid md:grid-cols-[1.2fr_2fr_1fr_1.2fr_1fr_1.5fr] gap-4 md:gap-6 items-start md:items-center ghost-border transition-all hover:bg-surface-bright even:bg-surface-container-high/30 ${item.synced ? 'opacity-80' : ''} ${isSisa ? 'border-l-4 border-l-yellow-500' : ''}`}>
                <div className="flex flex-col items-start">
                  <span className="font-label text-xs text-outline mb-1 md:hidden">SO ID</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-on-surface tracking-tight">{item.id}</span>
                    {isSisa && (
                      <span className="bg-yellow-500/20 text-yellow-600 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Sisa</span>
                    )}
                  </div>
                  <span className="text-[10px] text-outline uppercase tracking-wider mt-0.5">{item.client}</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label text-xs text-outline mb-1 md:hidden">Product</span>
                  <span className="text-sm text-on-surface-variant line-clamp-1" title={item.product}>{item.product}</span>
                  <span className="text-xs text-outline mt-0.5 truncate max-w-[200px]">{item.note ? `Note: ${item.note}` : 'No notes'}</span>
                </div>
                <div className="flex flex-col md:items-end w-full md:w-auto">
                  <span className="font-label text-xs text-outline mb-1 md:hidden">Qty</span>
                  <span className="text-2xl font-bold text-on-surface tabular-nums">{item.qty.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label text-xs text-outline mb-1 md:hidden">Finish Date</span>
                  <span className={`text-sm font-medium ${item.synced ? 'text-on-surface-variant' : 'text-tertiary'}`}>
                    {item.deadline || '-'}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label text-xs text-outline mb-1 md:hidden">Status</span>
                  {item.synced ? (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary-container text-on-secondary-container w-fit">
                      <span className="material-symbols-outlined text-[14px]">check_circle</span>
                      <span className="text-xs font-medium">Synced</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-dim text-on-surface-variant w-fit">
                      <div className="w-1.5 h-1.5 rounded-full bg-outline"></div>
                      <span className="text-xs font-medium">Pending</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-end w-full mt-4 md:mt-0">
                  {item.synced ? (
                    <button 
                      className="text-primary font-label text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-surface-container-high transition-colors flex items-center gap-2 w-full md:w-auto justify-center"
                      onClick={() => navigate('/gudang')}
                    >
                      <span className="material-symbols-outlined text-[18px]">inventory</span>
                      View in WMS
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleSync(item.id)}
                      className={`font-label text-sm font-medium px-5 py-2.5 rounded-xl shadow-sm hover:opacity-90 active:scale-[0.98] transition-all flex items-center gap-2 w-full md:w-auto justify-center ${isSisa ? 'bg-gradient-to-b from-yellow-500 to-yellow-600 text-white' : 'bg-gradient-to-b from-primary to-primary-container text-on-primary'}`}
                    >
                      <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
                      Kirim ke Gudang
                    </button>
                  )}
                </div>
              </div>
            )})}
          </div>
        </section>
      </main>
    </div>
  );
}
