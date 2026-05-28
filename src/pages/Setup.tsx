import { useState } from 'react';

export default function Setup() {
  const [activeTab, setActiveTab] = useState('Profile');
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);

  return (
    <div className="flex-1 flex flex-col h-full bg-surface w-full max-w-[1600px] mx-auto overflow-hidden">
      <main className="flex-1 overflow-y-auto pt-4 md:pt-8 px-4 md:px-12 pb-8 w-full">
        <header className="mb-8">
          <h1 className="text-3xl font-headline font-bold text-on-surface tracking-tight mb-2">System Setup</h1>
          <p className="text-on-surface-variant font-label text-sm max-w-xl">
            Configure your application preferences, WMS integration settings, and user profile.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Settings Sidebar */}
          <div className="md:col-span-3 flex flex-col gap-2">
            {['Profile', 'WMS Integration', 'WIP Stages', 'Notifications', 'Data Management'].map(tab => (
               <button
                 key={tab}
                 onClick={() => setActiveTab(tab)}
                 className={`flex items-center justify-between px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                   activeTab === tab 
                     ? 'bg-surface-container-highest text-primary shadow-sm'
                     : 'text-secondary hover:bg-surface-container-low'
                 }`}
               >
                 {tab}
                 {activeTab === tab && <span className="material-symbols-outlined text-[18px]">chevron_right</span>}
               </button>
            ))}
          </div>

          {/* Settings Content */}
          <div className="md:col-span-9 flex flex-col gap-6">
            {activeTab === 'Profile' && (
              <div className="bg-surface-container-lowest rounded-xl p-8 ghost-border ambient-shadow">
                <h3 className="text-xl font-bold text-on-surface mb-6">User Profile</h3>
                
                <div className="flex items-center gap-6 mb-8">
                  <div className="w-20 h-20 rounded-full bg-surface-container-high overflow-hidden border-4 border-surface-container-lowest shadow-sm flex-shrink-0">
                    <img src="https://picsum.photos/seed/user/200/200" alt="Profile" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <button className="bg-surface-container-low text-primary font-medium px-4 py-2 rounded-lg hover:bg-surface-container-highest transition-colors text-sm mb-2">
                      Change Avatar
                    </button>
                    <p className="text-xs text-outline">JPG, GIF or PNG. Max size of 2MB.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-outline font-medium tracking-wider uppercase">Full Name</label>
                    <input type="text" defaultValue="Admin User" className="w-full bg-surface-container-low text-on-surface py-3 px-4 rounded-xl border-none outline-none focus:ring-2 focus:ring-primary/40 ghost-border text-sm" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-outline font-medium tracking-wider uppercase">Email Address</label>
                    <input type="email" defaultValue="admin@parahita.com" className="w-full bg-surface-container-low text-on-surface py-3 px-4 rounded-xl border-none outline-none focus:ring-2 focus:ring-primary/40 ghost-border text-sm" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-outline font-medium tracking-wider uppercase">Role</label>
                    <input type="text" disabled defaultValue="Production Planner" className="w-full bg-surface-container-low text-outline py-3 px-4 rounded-xl border-none outline-none ghost-border text-sm opacity-70" />
                  </div>
                </div>
                
                <div className="mt-8 flex justify-end">
                  <button className="bg-gradient-to-b from-primary to-primary-container text-on-primary font-medium px-8 py-3 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all text-sm shadow-sm">
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'WMS Integration' && (
              <div className="bg-surface-container-lowest rounded-xl p-8 ghost-border ambient-shadow">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-on-surface mb-1">WMS Integration</h3>
                    <p className="text-sm text-outline">Configure connection to the central Warehouse Management System.</p>
                  </div>
                  <div className="bg-secondary-container text-on-secondary-container text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span> Connected
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-outline font-medium tracking-wider uppercase">API Endpoint URL</label>
                    <input type="text" defaultValue="https://api.parahita-wms.com/v1/inventory" className="w-full bg-surface-container-low text-on-surface py-3 px-4 rounded-xl border-none outline-none focus:ring-2 focus:ring-primary/40 ghost-border text-sm font-mono" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-outline font-medium tracking-wider uppercase">Authentication Token</label>
                    <div className="relative">
                      <input type="password" defaultValue="************************" className="w-full bg-surface-container-low text-on-surface py-3 pl-4 pr-12 rounded-xl border-none outline-none focus:ring-2 focus:ring-primary/40 ghost-border text-sm font-mono" />
                      <button className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface">
                        <span className="material-symbols-outlined text-[18px]">visibility</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <button className="bg-surface-container-lowest text-primary font-medium px-5 py-2.5 rounded-xl hover:bg-surface-container-low transition-colors text-sm ghost-border">
                      Test Connection
                    </button>
                    <button className="bg-gradient-to-b from-primary to-primary-container text-on-primary font-medium px-6 py-2.5 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all text-sm shadow-sm">
                      Update Settings
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Notifications' && (
              <div className="bg-surface-container-lowest rounded-xl p-8 ghost-border ambient-shadow">
                <h3 className="text-xl font-bold text-on-surface mb-6">Notification Preferences</h3>
                <div className="space-y-4">
                  {[
                    { title: 'Email Alerts for Urgent SO', desc: 'Receive emails when a Sales Order is close to deadline.' },
                    { title: 'WMS Sync Status', desc: 'Notify when inventory synchronization fails.' },
                    { title: 'Daily Digest', desc: 'A summary of completed SOs sent at 18:00 every day.' }
                  ].map((notif, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl ghost-border">
                      <div>
                        <h4 className="text-sm font-semibold text-on-surface mb-1">{notif.title}</h4>
                        <p className="text-xs text-outline max-w-sm">{notif.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer ml-4 shrink-0">
                        <input type="checkbox" className="sr-only peer" defaultChecked={i !== 2} />
                        <div className="w-11 h-6 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {activeTab === 'WIP Stages' && (
              <div className="bg-surface-container-lowest rounded-xl p-8 ghost-border ambient-shadow">
                <h3 className="text-xl font-bold text-on-surface mb-2">Production Stages</h3>
                <p className="text-sm text-outline mb-6">Manage the default columns visible in the WIP Kanban board.</p>
                
                <div className="space-y-3">
                  {['Antrean', 'Cutting', 'Bordir/Sablon', 'CMT', 'Selesai'].map((stage, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 bg-surface-container-low rounded-xl ghost-border group">
                      <span className="material-symbols-outlined text-outline hover:text-on-surface cursor-grab">drag_indicator</span>
                      <input type="text" defaultValue={stage} className="bg-transparent border-none outline-none font-medium text-on-surface text-sm flex-1 focus:ring-0 p-0" />
                      <button className="text-outline hover:text-error opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  ))}
                  <button className="flex items-center gap-2 text-primary font-medium text-sm mt-4 p-2 hover:bg-surface-container-low rounded-lg transition-colors">
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Add Stage
                  </button>
                </div>
                <div className="mt-8 flex justify-end">
                  <button className="bg-gradient-to-b from-primary to-primary-container text-on-primary font-medium px-8 py-3 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all text-sm shadow-sm">
                    Save Layout
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'Data Management' && (
              <div className="bg-surface-container-lowest rounded-xl p-8 ghost-border ambient-shadow border border-error/20">
                <h3 className="text-xl font-bold text-error mb-2">Danger Zone</h3>
                <p className="text-sm text-outline mb-6">Permanently delete local data or reset the application state.</p>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-error-container/10 border border-error/20 rounded-xl">
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-error mb-1">Reset All Local Data</h4>
                      <p className="text-xs text-outline max-w-md">This action will clear all local storage including Input SO data, kanban board state, stock checks, and inventory status. The page will reload.</p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      {isConfirmingReset ? (
                        <>
                          <button 
                            onClick={() => setIsConfirmingReset(false)}
                            className="bg-surface-container hover:bg-surface-container-high text-on-surface font-medium px-4 py-2.5 rounded-xl transition-all shadow-sm shrink-0 whitespace-nowrap text-sm"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={() => {
                              localStorage.clear();
                              window.location.reload();
                            }}
                            className="bg-error hover:bg-error/90 text-on-error font-medium px-4 py-2.5 rounded-xl transition-all shadow-sm shrink-0 whitespace-nowrap text-sm"
                          >
                            Yes, Reset Now
                          </button>
                        </>
                      ) : (
                        <button 
                          onClick={() => setIsConfirmingReset(true)}
                          className="bg-error hover:bg-error/90 text-on-error font-medium px-6 py-2.5 rounded-xl transition-all shadow-sm shrink-0 whitespace-nowrap text-sm"
                        >
                          Reset App Data
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
