import React, { useState } from 'react';

export default function Support() {
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject || !ticketMessage) return;
    alert("Tiket bantuan telah dikirim! Tim support akan membalas ke email Anda.");
    setTicketSubject("");
    setTicketMessage("");
  };

  return (
    <div className="flex-1 bg-[#F8FAFC] min-h-screen">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-[28px] text-indigo-600">help_center</span>
            <h1 className="text-2xl font-bold text-gray-900 font-headline">Pusat Bantuan (Support)</h1>
          </div>
          <p className="text-sm text-gray-500 max-w-2xl">
            Butuh bantuan teknis atau memiliki pertanyaan terkait sistem? Hubungi tim support kami melalui kontak di bawah ini.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Contact Info */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-start gap-4">
             <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined">call</span>
             </div>
             <div>
                <h3 className="font-bold text-gray-900 mb-1">Telepon / WhatsApp</h3>
                <p className="text-sm text-gray-500 mb-2">Jam Kerja: 08:00 - 17:00</p>
                <span className="font-mono text-sm font-bold text-gray-800">+62 812-3456-7890</span>
             </div>
          </div>
          
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-start gap-4">
             <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined">mail</span>
             </div>
             <div>
                <h3 className="font-bold text-gray-900 mb-1">Email Support</h3>
                <p className="text-sm text-gray-500 mb-2">Balasan maksimal 1x24 jam</p>
                <span className="font-medium text-sm text-blue-600">support@parahita.com</span>
             </div>
          </div>
        </div>

        {/* Ticket Form */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-100 p-5 bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900">Kirim Tiket Bantuan</h2>
              <p className="text-sm text-gray-500 mt-1">Sertakan detail masalah agar kami dapat membantu lebih cepat.</p>
            </div>
            <form onSubmit={handleSubmitTicket} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">Subjek Masalah</label>
                <input 
                  type="text" 
                  value={ticketSubject}
                  onChange={e => setTicketSubject(e.target.value)}
                  placeholder="Contoh: Gagal memindahkan status Kanban"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">Deskripsi Detail</label>
                <textarea 
                  value={ticketMessage}
                  onChange={e => setTicketMessage(e.target.value)}
                  rows={6}
                  placeholder="Jelaskan langkah apa yang Anda lakukan sebelum menemukan kendala ini..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors align-top"
                  required
                ></textarea>
              </div>
              <div className="flex justify-end">
                <button 
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-lg text-sm transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">send</span>
                  Kirim Pesan
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
