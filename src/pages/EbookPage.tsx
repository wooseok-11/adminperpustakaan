import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  ExternalLink,
  X,
  FileText,
  Trash2,
} from 'lucide-react';
import { DatabaseSchema, EbookItem } from '../types';
import { saveRepository } from '../utils/storage';

interface EbookPageProps {
  db: DatabaseSchema;
  onUpdateDb: (updated: DatabaseSchema) => void;
  showToast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const EbookPage: React.FC<EbookPageProps> = ({
  db,
  onUpdateDb,
  showToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Add E-book state
  const [addJudul, setAddJudul] = useState('');
  const [addPenulis, setAddPenulis] = useState('');
  const [addKategori, setAddKategori] = useState('Umum');
  const [addTahun, setAddTahun] = useState('2024');
  const [addDriveLink, setAddDriveLink] = useState('');

  const ebooks = (db.Ebook || []).filter((e) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (e.judul || '').toLowerCase().includes(q) ||
      (e.penulis || '').toLowerCase().includes(q) ||
      (e.kategori || '').toLowerCase().includes(q)
    );
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addJudul.trim() || !addDriveLink.trim()) {
      showToast('Judul dan tautan Google Drive wajib diisi', 'warning');
      return;
    }

    const nextId = `EBK-2026-${String((db.Ebook || []).length + 1).padStart(4, '0')}`;
    const newEb: EbookItem = {
      id: nextId,
      judul: addJudul.trim(),
      penulis: addPenulis.trim() || '-',
      kategori: addKategori.trim() || 'Umum',
      tahun: addTahun.trim() || '2024',
      thumbnail: '',
      driveLink: addDriveLink.trim(),
      status: 'Tersedia',
    };

    const updated = {
      ...db,
      Ebook: [...(db.Ebook || []), newEb],
    };
    saveRepository(updated);
    onUpdateDb(updated);
    setShowAddModal(false);
    showToast(`E-Book "${addJudul}" berhasil ditambahkan ke katalog digital`, 'success');
  };

  const handleDeleteEbook = (id: string, judul: string) => {
    if (!confirm(`Hapus e-book "${judul}"?`)) return;
    const updated = {
      ...db,
      Ebook: (db.Ebook || []).filter((e) => e.id !== id),
    };
    saveRepository(updated);
    onUpdateDb(updated);
    showToast('E-Book dihapus dari katalog digital', 'info');
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari Judul, Penulis, atau Kategori E-Book..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-teal-500"
          />
        </div>

        <button
          onClick={() => {
            setAddJudul('');
            setAddPenulis('');
            setAddKategori('Umum');
            setAddTahun('2024');
            setAddDriveLink('');
            setShowAddModal(true);
          }}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah E-Book</span>
        </button>
      </div>

      {/* Grid of E-Books */}
      {ebooks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400 space-y-2">
          <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-xs">Belum ada koleksi e-book digital.</p>
          <p className="text-[11px] text-slate-400">
            Anda dapat menambahkan e-book di sini atau menyematkan Link Drive saat menambahkan buku.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {ebooks.map((e) => (
            <div
              key={e.id}
              className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div className="p-4 space-y-2 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-teal-700">{e.kategori}</span>
                  <button
                    onClick={() => handleDeleteEbook(e.id, e.judul)}
                    title="Hapus e-book"
                    className="p-1 text-slate-300 hover:text-rose-600 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <h4 className="font-semibold text-slate-900 text-sm leading-snug">{e.judul}</h4>
                <p className="text-xs text-slate-500">
                  {e.penulis} · {e.tahun}
                </p>
              </div>

              <div className="p-4 pt-0">
                <a
                  href={e.driveLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Buka & Baca E-Book</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add E-Book Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-teal-600" />
                <span>Tambah Koleksi E-Book</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Judul E-Book</label>
                <input
                  type="text"
                  required
                  value={addJudul}
                  onChange={(e) => setAddJudul(e.target.value)}
                  placeholder="Contoh: Modul Fisika Kuantum"
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Penulis</label>
                  <input
                    type="text"
                    value={addPenulis}
                    onChange={(e) => setAddPenulis(e.target.value)}
                    placeholder="Prof. Hendra"
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Kategori</label>
                  <input
                    type="text"
                    value={addKategori}
                    onChange={(e) => setAddKategori(e.target.value)}
                    placeholder="Sains"
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Tautan Google Drive / PDF
                </label>
                <input
                  type="url"
                  required
                  value={addDriveLink}
                  onChange={(e) => setAddDriveLink(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium shadow-xs"
                >
                  Simpan E-Book
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
