import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  const isTransaksiActive = location.pathname === '/erp/input-so' || location.pathname === '/erp/input-po' || location.pathname === '/erp/daftar-po';
  const isKanbanActive = location.pathname.startsWith('/erp/kanban');

  const toggleAccordion = (name: string) => {
    setOpenAccordion(prev => prev === name ? null : name);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userName = currentUser?.name || 'Admin PPS';
  const userRole = currentUser?.role || 'Admin';
  const userEmail = currentUser?.email || 'admin.pps@parahita.com';
  const userAvatar = currentUser?.avatar || 'https://ui-avatars.com/api/?name=Admin+PPS&background=1e293b&color=ffffff';

  return (
    <div className="bg-[#F6F8FB] text-[#1E293B] flex h-screen overflow-hidden font-sans selection:bg-rose-100 selection:text-rose-900">
      {/* Mobile Top Navigation */}
      <nav className="md:hidden fixed top-0 w-full z-40 bg-white border-b border-gray-100 flex justify-between items-center px-4 h-16">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="text-gray-500 p-2"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <div className="flex items-center gap-2 font-bold text-lg text-gray-800">
            <span className="material-symbols-outlined text-rose-500">local_fire_department</span>
            Parahita
          </div>
        </div>
        <div className="flex items-center gap-2">
           <img alt="User Profile" src={userAvatar} className="w-8 h-8 rounded-full border border-gray-200" />
        </div>
      </nav>

      {/* Desktop Side Navigation */}
      <aside className="hidden md:flex flex-col h-screen w-64 fixed left-0 top-0 z-50 bg-white border-r border-gray-200/60 py-6 space-y-6">
        {/* Brand / Header */}
        <div className="px-8 flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <div className="text-rose-500 flex items-center justify-center">
                <span className="material-symbols-outlined text-[28px]">local_fire_department</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Parahita</h1>
          </div>
          <span className="text-[10px] font-extrabold bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase">
            {userRole}
          </span>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 flex flex-col space-y-6 overflow-y-auto custom-scrollbar px-6 mt-4">
          
          <div>
            <div className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-3 px-2">Menu</div>
            <div className="space-y-1">
              <NavLink
                to="/erp"
                end
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                  location.pathname === '/erp' || location.pathname === '/erp/' ? 'bg-white shadow-[0_2px_10px_rgba(0,0,0,0.06)] text-gray-900 font-bold' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <span className={`material-symbols-outlined text-[20px] ${location.pathname === '/erp' || location.pathname === '/erp/' ? 'text-gray-900' : 'text-gray-400'}`}>other_houses</span>
                <span className="text-[14px]">Dashboard</span>
              </NavLink>

              {/* Transaksi Dropdown */}
              <div className="flex flex-col">
                <button
                  onClick={() => toggleAccordion('transaksi-desktop')}
                  className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                    isTransaksiActive && openAccordion !== 'transaksi-desktop' ? 'bg-white shadow-[0_2px_10px_rgba(0,0,0,0.06)] text-gray-900 font-bold' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`material-symbols-outlined text-[20px] ${isTransaksiActive && openAccordion !== 'transaksi-desktop' ? 'text-gray-900' : 'text-gray-400'}`}>receipt_long</span>
                    <span className="text-[14px]">Transaksi SO/PO</span>
                  </div>
                  <span className={`material-symbols-outlined transition-transform duration-200 text-[18px] ${openAccordion === 'transaksi-desktop' ? 'rotate-180' : ''}`}>expand_more</span>
                </button>
                
                {/* Dropdown Content */}
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openAccordion === 'transaksi-desktop' || isTransaksiActive ? 'max-h-40 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                  <div className="pl-9 pr-2 space-y-1 py-1">
                    <NavLink
                      to="/erp/input-po"
                      className={`flex items-center gap-3 px-3 py-2 text-[13px] rounded-lg transition-all duration-200 group ${
                        location.pathname === '/erp/input-po' ? 'bg-rose-50 text-rose-600 font-bold' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                       <span>Pesanan (Purchase Order)</span>
                    </NavLink>
                    <NavLink
                      to="/erp/input-so"
                      className={`flex items-center gap-3 px-3 py-2 text-[13px] rounded-lg transition-all duration-200 group ${
                        location.pathname === '/erp/input-so' ? 'bg-rose-50 text-rose-600 font-bold' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                       <span>Sales Order</span>
                    </NavLink>
                  </div>
                </div>
              </div>

              {/* Kanban Dropdown */}
              <div className="flex flex-col">
                <button
                  onClick={() => toggleAccordion('kanban-desktop')}
                  className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                    isKanbanActive && openAccordion !== 'kanban-desktop' ? 'bg-white shadow-[0_2px_10px_rgba(0,0,0,0.06)] text-gray-900 font-bold' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`material-symbols-outlined text-[20px] ${isKanbanActive && openAccordion !== 'kanban-desktop' ? 'text-gray-900' : 'text-gray-400'}`}>view_kanban</span>
                    <span className="text-[14px]">WIP Kanban</span>
                  </div>
                  <span className={`material-symbols-outlined transition-transform duration-200 text-[18px] ${openAccordion === 'kanban-desktop' ? 'rotate-180' : ''}`}>expand_more</span>
                </button>
                
                {/* Dropdown Content */}
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openAccordion === 'kanban-desktop' || isKanbanActive ? 'max-h-[500px] opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                  <div className="pl-9 pr-2 space-y-1 py-1">
                    <NavLink
                      to="/erp/kanban"
                      end
                      className={`flex items-center gap-3 px-3 py-2 text-[13px] rounded-lg transition-all duration-200 group ${
                        location.pathname === '/erp/kanban' && !location.search ? 'bg-rose-50 text-rose-600 font-bold' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                       <span>Semua Board</span>
                    </NavLink>
                    <NavLink
                      to="/erp/kanban?stage=pending"
                      className={`flex items-center gap-3 px-3 py-2 text-[13px] rounded-lg transition-all duration-200 group ${
                        location.search === '?stage=pending' ? 'bg-rose-50 text-rose-600 font-bold' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                       <span>Pending</span>
                    </NavLink>
                    <NavLink
                      to="/erp/kanban?stage=patterning"
                      className={`flex items-center gap-3 px-3 py-2 text-[13px] rounded-lg transition-all duration-200 group ${
                        location.search === '?stage=patterning' ? 'bg-rose-50 text-rose-600 font-bold' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                       <span>Patterning</span>
                    </NavLink>
                    <NavLink
                      to="/erp/kanban?stage=cutting"
                      className={`flex items-center gap-3 px-3 py-2 text-[13px] rounded-lg transition-all duration-200 group ${
                        location.search === '?stage=cutting' ? 'bg-rose-50 text-rose-600 font-bold' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                       <span>Cutting</span>
                    </NavLink>
                    <NavLink
                      to="/erp/kanban?stage=sablon"
                      className={`flex items-center gap-3 px-3 py-2 text-[13px] rounded-lg transition-all duration-200 group ${
                        location.search === '?stage=sablon' ? 'bg-rose-50 text-rose-600 font-bold' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                       <span>Sablon</span>
                    </NavLink>
                    <NavLink
                      to="/erp/kanban?stage=bordir"
                      className={`flex items-center gap-3 px-3 py-2 text-[13px] rounded-lg transition-all duration-200 group ${
                        location.search === '?stage=bordir' ? 'bg-rose-50 text-rose-600 font-bold' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                       <span>Bordir</span>
                    </NavLink>
                    <NavLink
                      to="/erp/kanban?stage=sewing"
                      className={`flex items-center gap-3 px-3 py-2 text-[13px] rounded-lg transition-all duration-200 group ${
                        location.search === '?stage=sewing' ? 'bg-rose-50 text-rose-600 font-bold' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                       <span>Sewing</span>
                    </NavLink>
                    <NavLink
                      to="/erp/kanban?stage=qc"
                      className={`flex items-center gap-3 px-3 py-2 text-[13px] rounded-lg transition-all duration-200 group ${
                        location.search === '?stage=qc' ? 'bg-rose-50 text-rose-600 font-bold' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                       <span>Quality Control</span>
                    </NavLink>
                    <NavLink
                      to="/erp/kanban?stage=packing"
                      className={`flex items-center gap-3 px-3 py-2 text-[13px] rounded-lg transition-all duration-200 group ${
                        location.search === '?stage=packing' ? 'bg-rose-50 text-rose-600 font-bold' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                       <span>Packing</span>
                    </NavLink>
                    <NavLink
                      to="/erp/kanban?stage=shipping"
                      className={`flex items-center gap-3 px-3 py-2 text-[13px] rounded-lg transition-all duration-200 group ${
                        location.search === '?stage=shipping' ? 'bg-rose-50 text-rose-600 font-bold' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                       <span>Shipping</span>
                    </NavLink>
                  </div>
                </div>
              </div>
              
              <NavLink
                to="/erp/bom-costing"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                  location.pathname === '/erp/bom-costing' ? 'bg-white shadow-[0_2px_10px_rgba(0,0,0,0.06)] text-gray-900 font-bold' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <span className={`material-symbols-outlined text-[20px] ${location.pathname === '/erp/bom-costing' ? 'text-gray-900' : 'text-gray-400'}`}>request_quote</span>
                <span className="text-[14px]">Menu BOM & Costing</span>
              </NavLink>

              <NavLink
                to="/erp/inventory"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                  location.pathname === '/erp/inventory' ? 'bg-white shadow-[0_2px_10px_rgba(0,0,0,0.06)] text-gray-900 font-bold' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <span className={`material-symbols-outlined text-[20px] ${location.pathname === '/erp/inventory' ? 'text-gray-900' : 'text-gray-400'}`}>inventory_2</span>
                <span className="text-[14px]">WMS Inventory</span>
              </NavLink>

              <NavLink
                to="/erp/master-product"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                  location.pathname === '/erp/master-product' ? 'bg-white shadow-[0_2px_10px_rgba(0,0,0,0.06)] text-gray-900 font-bold' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <span className={`material-symbols-outlined text-[20px] ${location.pathname === '/erp/master-product' ? 'text-gray-900' : 'text-gray-400'}`}>category</span>
                <span className="text-[14px]">Master Product</span>
              </NavLink>

              <NavLink
                to="/erp/gudang"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                  location.pathname === '/erp/gudang' ? 'bg-white shadow-[0_2px_10px_rgba(0,0,0,0.06)] text-gray-900 font-bold' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <span className={`material-symbols-outlined text-[20px] ${location.pathname === '/erp/gudang' ? 'text-gray-900' : 'text-gray-400'}`}>warehouse</span>
                <span className="text-[14px]">Data Gudang</span>
              </NavLink>

              <NavLink
                to="/erp/reports"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                  location.pathname === '/erp/reports' ? 'bg-white shadow-[0_2px_10px_rgba(0,0,0,0.06)] text-gray-900 font-bold' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <span className={`material-symbols-outlined text-[20px] ${location.pathname === '/erp/reports' ? 'text-gray-900' : 'text-gray-400'}`}>bar_chart</span>
                <span className="text-[14px]">Reports</span>
              </NavLink>
            </div>
          </div>

          <div>
             <div className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-3 px-2">Setup</div>
             <div className="space-y-1">
                <NavLink
                  to="/erp/setup"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                    location.pathname === '/erp/setup' ? 'bg-white shadow-[0_2px_10px_rgba(0,0,0,0.06)] text-gray-900 font-bold' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <span className={`material-symbols-outlined text-[20px] ${location.pathname === '/erp/setup' ? 'text-gray-900' : 'text-gray-400'}`}>settings</span>
                  <span className="text-[14px]">Settings</span>
                </NavLink>
             </div>
          </div>
          
          <div>
            <div className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-3 px-2 mt-4">Help</div>
            <div className="space-y-1">
              <NavLink 
                to="/erp/user-guide" 
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                  location.pathname === '/erp/user-guide' ? 'bg-white shadow-[0_2px_10px_rgba(0,0,0,0.06)] text-gray-900 font-bold' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <span className={`material-symbols-outlined text-[20px] ${location.pathname === '/erp/user-guide' ? 'text-gray-900' : 'text-gray-400'}`}>menu_book</span>
                <span className="text-[14px]">User Guide</span>
              </NavLink>
              <NavLink 
                to="/erp/support" 
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                  location.pathname === '/erp/support' ? 'bg-white shadow-[0_2px_10px_rgba(0,0,0,0.06)] text-gray-900 font-bold' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <span className={`material-symbols-outlined text-[20px] ${location.pathname === '/erp/support' ? 'text-gray-900' : 'text-gray-400'}`}>help</span>
                <span className="text-[14px]">Support</span>
              </NavLink>
            </div>
          </div>

        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 md:ml-64 flex flex-col h-screen pt-16 md:pt-0 overflow-hidden relative">
        {/* Sena Topbar */}
        <header className="hidden md:flex h-20 items-center justify-between px-8 bg-transparent">
            {/* Search */}
            <div className="flex-1 max-w-md relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">search</span>
                <input 
                  type="text" 
                  placeholder="Search..." 
                  className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-full text-sm outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all placeholder:text-gray-400 shadow-sm"
                />
            </div>
            
            {/* Right Tools */}
            <div className="flex items-center gap-4 relative">
                <NavLink 
                  to="/mobile" 
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 font-bold rounded-full text-xs transition-colors border border-amber-500/20"
                  title="Tampilan Aplikasi HP/Mobile"
                >
                    <span className="material-symbols-outlined text-[16px]">smartphone</span>
                    <span>Versi Mobile</span>
                </NavLink>

                <button className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:text-gray-900 shadow-sm transition-colors">
                    <span className="material-symbols-outlined text-[20px]">notifications_none</span>
                </button>
                <div 
                  className="flex items-center gap-3 cursor-pointer group" 
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                >
                    <img src={userAvatar} className="w-10 h-10 rounded-full border border-gray-200" alt="profile" />
                    <div>
                        <div className="text-sm font-bold text-gray-900">{userName}</div>
                        <div className="text-[11px] text-gray-500">{userRole} ({currentUser?.username || 'adminpps'})</div>
                    </div>
                    <span className={`material-symbols-outlined text-gray-400 text-lg transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}>expand_more</span>
                </div>
                
                {userMenuOpen && (
                  <div className="absolute top-14 right-0 w-56 bg-white border border-gray-100 rounded-xl shadow-lg z-50 overflow-hidden animate-fade-in">
                    <div className="px-4 py-3 border-b border-gray-100 bg-slate-50">
                       <div className="text-xs font-bold text-gray-900">{userName}</div>
                       <div className="text-[10px] text-amber-600 font-bold mt-0.5">Role: {userRole}</div>
                       <div className="text-[10px] text-gray-400 font-mono mt-0.5">{userEmail}</div>
                    </div>
                    <div className="py-1">
                      <NavLink to="/login" className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-amber-500">vpn_key</span>
                        Ganti User / Login Form
                      </NavLink>
                      <NavLink to="/portal" className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-gray-400">devices</span>
                        Portal Platform
                      </NavLink>
                      <NavLink to="/erp/setup" className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-gray-400">settings</span>
                        Pengaturan & Reset
                      </NavLink>
                    </div>
                    <div className="border-t border-gray-100 py-1">
                      <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium">
                        <span className="material-symbols-outlined text-[18px]">logout</span>
                        Keluar / Logout
                      </button>
                    </div>
                  </div>
                )}
            </div>
        </header>

        <main className="flex-1 overflow-auto bg-transparent pb-8">
            <Outlet />
        </main>
      </div>
    </div>
  );
}

