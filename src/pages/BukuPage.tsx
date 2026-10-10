import React, { useState } from 'react';
import {
  Book,
  Search,
  Camera,
  Plus,
  FileSpreadsheet,
  Download,
  Trash2,
  CheckSquare,
  X,
  QrCode,
  Edit2,
  Printer,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Barcode,
  RotateCcw,
  RotateCw,
  AlertCircle,
} from 'lucide-react';
import { DatabaseSchema, BukuItem } from '../types';
import {
  generateNextBookId,
  buildEksemplarList,
  compressImage,
  saveRepository,
} from '../utils/storage';
import { parseExcelFile, importBukuFromRows, exportToExcel } from '../utils/excel';
import { QRCodeView } from '../components/QRCodeView';
import {
  saveItemToCloud,
  deleteItemFromCloud,
  setCloudSyncPaused,
} from '../services/firebase';

interface BukuPageProps {
  db: DatabaseSchema;
  onUpdateDb: (updated: DatabaseSchema) => void;
  onOpenScanner: (type: 'buku', onScan: (code: string) => void) => void;
  onPrintA4Barcodes: (buku: BukuItem) => void;
  showToast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const BukuPage: React.FC<BukuPageProps> = ({
  db,
  onUpdateDb,
  onOpenScanner,
  onPrintA4Barcodes,
  showToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Selection mode
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showRegenModal, setShowRegenModal] = useState(false);
  const [regenPrefix, setRegenPrefix] = useState('ANTON');
  const [regenDigits, setRegenDigits] = useState<'3' | '4'>('3');
  const [regenSortBy, setRegenSortBy] = useState<'judul' | 'kategori' | 'urutan'>('judul');

  // Active book
  const [selectedBuku, setSelectedBuku] = useState<BukuItem | null>(null);

  // Add book form
  const [addId, setAddId] = useState('');
  const [addIsbn, setAddIsbn] = useState('');
  const [addJudul, setAddJudul] = useState('');
  const [addPenulis, setAddPenulis] = useState('');
  const [addPenerbit, setAddPenerbit] = useState('');
  const [addTahun, setAddTahun] = useState('2024');
  const [addKategori, setAddKategori] = useState('Umum');
  const [addRak, setAddRak] = useState('R-01');
  const [addJumlah, setAddJumlah] = useState(1);
  const [addDriveLink, setAddDriveLink] = useState('');
  const [addCover, setAddCover] = useState('');

  // Edit book form
  const [editId, setEditId] = useState('');
  const [editIsbn, setEditIsbn] = useState('');
  const [editJudul, setEditJudul] = useState('');
  const [editPenulis, setEditPenulis] = useState('');
  const [editPenerbit, setEditPenerbit] = useState('');
  const [editTahun, setEditTahun] = useState('2024');
  const [editKategori, setEditKategori] = useState('');
  const [editRak, setEditRak] = useState('');
  const [editJumlah, setEditJumlah] = useState(1);
  const [editDriveLink, setEditDriveLink] = useState('');

  // Excel import file
  const [importFile, setImportFile] = useState<File | null>(null);

  const filteredBuku = (db.Buku || []).filter((b) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (b.judul || '').toLowerCase().includes(q) ||
      (b.id || '').toLowerCase().includes(q) ||
      (b.isbn || '').toLowerCase().includes(q) ||
      (b.penulis || '').toLowerCase().includes(q) ||
      (b.penerbit || '').toLowerCase().includes(q) ||
      (b.kategori || '').toLowerCase().includes(q) ||
      (b.rak || '').toLowerCase().includes(q)
    );
  });

  const totalRecords = filteredBuku.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;
  const validPage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = (validPage - 1) * pageSize;
  const paginatedData = filteredBuku.slice(startIndex, startIndex + pageSize);

  const toggleSelectBuku = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSelectAllOnPage = () => {
    const allChecked = paginatedData.every((b) => selectedIds.has(b.id));
    const next = new Set(selectedIds);
    if (allChecked) {
      paginatedData.forEach((b) => next.delete(b.id));
    } else {
      paginatedData.forEach((b) => next.add(b.id));
    }
    setSelectedIds(next);
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Hapus ${selectedIds.size} buku terpilih dari katalog?`)) return;

    const updated = {
      ...db,
      Buku: db.Buku.filter((b) => !selectedIds.has(b.id)),
    };
    selectedIds.forEach((id) => deleteItemFromCloud('buku', id));
    saveRepository(updated);
    onUpdateDb(updated);
    setSelectedIds(new Set());
    setIsSelectMode(false);
    showToast(`${selectedIds.size} judul buku berhasil dihapus`, 'success');
  };

  const handleDeleteAll = () => {
    if (db.Buku.length === 0) return;
    if (!confirm('PERINGATAN: Apakah Anda yakin ingin mengosongkan SEMUA data buku?')) return;

    db.Buku.forEach((b) => deleteItemFromCloud('buku', b.id));
    const updated = { ...db, Buku: [] };
    saveRepository(updated);
    onUpdateDb(updated);
    setSelectedIds(new Set());
    showToast('Seluruh data katalog buku berhasil dihapus', 'info');
  };

  const handleDeleteSingle = (id: string, judul: string) => {
    if (!confirm(`Hapus buku "${judul}" (${id})?`)) return;
    deleteItemFromCloud('buku', id);
    const updated = {
      ...db,
      Buku: db.Buku.filter((b) => b.id !== id),
    };
    saveRepository(updated);
    onUpdateDb(updated);
    showToast(`Buku "${judul}" dihapus`, 'info');
  };

  const openAddModal = () => {
    const autoId = generateNextBookId(db, 'BUK');
    setAddId(autoId);
    setAddIsbn('');
    setAddJudul('');
    setAddPenulis('');
    setAddPenerbit('');
    setAddTahun('2024');
    setAddKategori('Umum');
    setAddRak('R-01');
    setAddJumlah(1);
    setAddDriveLink('');
    setAddCover('');
    setShowAddModal(true);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = addId.trim().toUpperCase() || generateNextBookId(db, 'BUK');
    const cleanJudul = addJudul.trim();
    const jumlahStok = Math.max(1, Number(addJumlah) || 1);

    if (!cleanJudul) {
      showToast('Judul buku tidak boleh kosong', 'warning');
      return;
    }

    if (db.Buku.some((b) => b.id.toUpperCase() === cleanId)) {
      showToast('Kode buku sudah dipakai! Gunakan kode lain.', 'error');
      return;
    }

    const newBuku: BukuItem = {
      id: cleanId,
      isbn: addIsbn.trim() || '-',
      judul: cleanJudul,
      penulis: addPenulis.trim() || '-',
      penerbit: addPenerbit.trim() || '-',
      tahun: addTahun.trim() || '2024',
      kategori: addKategori.trim() || 'Umum',
      rak: addRak.trim() || 'R-01',
      jumlah: jumlahStok,
      tersedia: jumlahStok,
      kondisi: 'Baik',
      driveLink: addDriveLink.trim(),
      cover: addCover,
      eksemplar: buildEksemplarList(cleanId, jumlahStok),
    };

    let updatedEbooks = db.Ebook || [];
    if (newBuku.driveLink && newBuku.driveLink.startsWith('http')) {
      const ebId = `EBK-2026-${String(updatedEbooks.length + 1).padStart(4, '0')}`;
      updatedEbooks = [
        ...updatedEbooks,
        {
          id: ebId,
          judul: newBuku.judul,
          penulis: newBuku.penulis,
          kategori: newBuku.kategori,
          tahun: newBuku.tahun,
          thumbnail: newBuku.cover || '',
          driveLink: newBuku.driveLink,
          status: 'Tersedia',
        },
      ];
    }

    saveItemToCloud('buku', newBuku.id, newBuku as unknown as Record<string, unknown>);

    const updated = {
      ...db,
      Buku: [...db.Buku, newBuku],
      Ebook: updatedEbooks,
    };
    saveRepository(updated);
    onUpdateDb(updated);
    setShowAddModal(false);
    showToast(`Buku "${cleanJudul}" berhasil ditambahkan (${jumlahStok} eksemplar)`, 'success');
  };

  const openEditModal = (buku: BukuItem) => {
    setSelectedBuku(buku);
    setEditId(buku.id);
    setEditIsbn(buku.isbn || '');
    setEditJudul(buku.judul);
    setEditPenulis(buku.penulis || '');
    setEditPenerbit(buku.penerbit || '');
    setEditTahun(buku.tahun || '2024');
    setEditKategori(buku.kategori || '');
    setEditRak(buku.rak || '');
    setEditJumlah(buku.jumlah || 1);
    setEditDriveLink(buku.driveLink || '');
    setShowEditModal(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBuku) return;

    const oldId = selectedBuku.id;
    const newId = editId.trim().toUpperCase();
    const newJumlah = Math.max(1, Number(editJumlah) || 1);
    const dipinjam = (selectedBuku.jumlah || 0) - (selectedBuku.tersedia || 0);

    if (newJumlah < dipinjam) {
      showToast(`Jumlah tidak boleh kurang dari ${dipinjam} (sedang dipinjam)`, 'warning');
      return;
    }

    if (newId !== oldId && db.Buku.some((b) => b.id.toUpperCase() === newId)) {
      showToast('Kode buku sudah dipakai oleh buku lain', 'error');
      return;
    }

    const selisih = newJumlah - (selectedBuku.jumlah || 0);
    const updatedTersedia = Math.max(0, (selectedBuku.tersedia || 0) + selisih);

    const updatedBukuList = db.Buku.map((b) => {
      if (b.id === oldId) {
        return {
          ...b,
          id: newId,
          isbn: editIsbn.trim() || '-',
          judul: editJudul.trim(),
          penulis: editPenulis.trim() || '-',
          penerbit: editPenerbit.trim() || '-',
          tahun: editTahun.trim() || '2024',
          kategori: editKategori.trim() || 'Umum',
          rak: editRak.trim() || 'R-01',
          jumlah: newJumlah,
          tersedia: updatedTersedia,
          driveLink: editDriveLink.trim(),
          eksemplar:
            newJumlah !== b.jumlah || newId !== oldId
              ? buildEksemplarList(newId, newJumlah)
              : b.eksemplar,
        };
      }
      return b;
    });

    let updatedLoans = db.Peminjaman;
    if (newId !== oldId) {
      updatedLoans = db.Peminjaman.map((p) =>
        p.idBuku === oldId ? { ...p, idBuku: newId } : p
      );
      deleteItemFromCloud('buku', oldId);
    }
    const targetBook = updatedBukuList.find((b) => b.id === newId);
    if (targetBook) {
      saveItemToCloud('buku', newId, targetBook as unknown as Record<string, unknown>);
    }

    const updated = {
      ...db,
      Buku: updatedBukuList,
      Peminjaman: updatedLoans,
    };
    saveRepository(updated);
    onUpdateDb(updated);
    setShowEditModal(false);
    showToast(`Buku "${editJudul}" berhasil diperbarui`, 'success');
  };

  const openQRModal = (buku: BukuItem) => {
    setSelectedBuku(buku);
    setShowQRModal(true);
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 300, 0.7);
      setAddCover(compressed);
      showToast('Foto sampul buku siap diunggah', 'info');
    } catch {
      showToast('Gagal memproses gambar sampul', 'error');
    }
  };

  const handleRegenerateBookCodesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = regenPrefix.trim().toUpperCase() || 'ANTON';
    const padLen = regenDigits === '4' ? 4 : 3;
    const formatSample = `${p}-${'1'.padStart(padLen, '0')}`;

    if (
      !confirm(
        `Konfirmasi regenerasi seluruh Kode Buku dengan prefix "${p}" (format contoh: ${formatSample})? Data barcode eksemplar fisik dan transaksi peminjaman akan otomatis diperbarui.`
      )
    ) {
      return;
    }

    setCloudSyncPaused(true);

    try {
      const oldToNew: Record<string, string> = {};
      const oldExToNewEx: Record<string, string> = {};

      let sorted = [...(db.Buku || [])];
      if (regenSortBy === 'kategori') {
        sorted.sort((a, b) => {
          const catCompare = (a.kategori || '').localeCompare(b.kategori || '');
          if (catCompare !== 0) return catCompare;
          return (a.judul || '').localeCompare(b.judul || '');
        });
      } else if (regenSortBy === 'judul') {
        sorted.sort((a, b) => (a.judul || '').localeCompare(b.judul || ''));
      }
      // If 'urutan', keep current array index

      const updatedBukuList = sorted.map((b, idx) => {
        const newId = `${p}-${String(idx + 1).padStart(padLen, '0')}`;
        if (b.id !== newId) {
          oldToNew[b.id] = newId;
          deleteItemFromCloud('buku', b.id);
        }

        // Re-map exemplars
        const oldExemplars = b.eksemplar || [];
        const jumlahStok = Math.max(1, parseInt(String(b.jumlah), 10) || 1);
        const newExemplars = buildEksemplarList(newId, jumlahStok);

        // Preserve status (Tersedia / Dipinjam) from old exemplars
        newExemplars.forEach((newEx, exIdx) => {
          const oldEx = oldExemplars[exIdx];
          if (oldEx) {
            newEx.status = oldEx.status;
            oldExToNewEx[oldEx.kode] = newEx.kode;
          }
        });

        const updatedBook: BukuItem = {
          ...b,
          id: newId,
          jumlah: jumlahStok,
          tersedia: typeof b.tersedia === 'number' ? b.tersedia : jumlahStok,
          eksemplar: newExemplars,
        };

        saveItemToCloud('buku', newId, updatedBook as unknown as Record<string, unknown>);
        return updatedBook;
      });

      // Update active and returned loans
      const updatedLoans = (db.Peminjaman || []).map((l) => {
        let changed = false;
        let newBookId = l.idBuku;
        let newExCode = l.kodeEksemplar;

        if (oldToNew[l.idBuku]) {
          newBookId = oldToNew[l.idBuku];
          changed = true;
        }
        if (l.kodeEksemplar && oldExToNewEx[l.kodeEksemplar]) {
          newExCode = oldExToNewEx[l.kodeEksemplar];
          changed = true;
        }

        if (changed) {
          const updatedLoan = {
            ...l,
            idBuku: newBookId,
            kodeEksemplar: newExCode,
          };
          saveItemToCloud('peminjaman', l.id, updatedLoan as unknown as Record<string, unknown>);
          return updatedLoan;
        }
        return l;
      });

      const updatedDb: DatabaseSchema = {
        ...db,
        Buku: updatedBukuList,
        Peminjaman: updatedLoans,
      };

      saveRepository(updatedDb);
      onUpdateDb(updatedDb);
      setShowRegenModal(false);
      showToast(
        `Berhasil meregenerasi ${updatedBukuList.length} Kode Buku dengan format ${formatSample}`,
        'success'
      );
    } catch (err) {
      console.error('Gagal regenerasi kode buku:', err);
      showToast('Terjadi kesalahan saat regenerasi kode buku', 'error');
    } finally {
      setCloudSyncPaused(false);
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      showToast('Pilih file Excel terlebih dahulu', 'warning');
      return;
    }

    try {
      const rows = await parseExcelFile(importFile);
      if (rows.length === 0) {
        showToast('File Excel kosong atau tidak terbaca', 'error');
        return;
      }

      const { inserted, skipped, updatedDb } = importBukuFromRows(rows, db);
      saveRepository(updatedDb);
      onUpdateDb(updatedDb);
      setShowImportModal(false);
      setImportFile(null);
      showToast(`Import selesai: ${inserted} buku berhasil masuk, ${skipped} dilewati`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Gagal memproses file Excel', 'error');
    }
  };

  const handleExportExcel = () => {
    const exportData = (db.Buku || []).map((b) => ({
      'Kode Buku': b.id,
      ISBN: b.isbn,
      Judul: b.judul,
      Penulis: b.penulis,
      Penerbit: b.penerbit,
      Tahun: b.tahun,
      Kategori: b.kategori,
      Rak: b.rak,
      'Jumlah Eksemplar': b.jumlah,
      'Tersedia di Rak': b.tersedia,
      'Link E-Book': b.driveLink || '',
    }));
    exportToExcel(
      exportData,
      `Katalog_Buku_${new Date().toISOString().split('T')[0]}`,
      'Katalog_Buku'
    );
    showToast('Katalog buku berhasil diekspor ke Excel', 'success');
  };

  return (
    <div className="space-y-4">
      {/* Search and Action Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari Judul, Kode Buku, ISBN, Penulis, Rak..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <button
            onClick={() => {
              onOpenScanner('buku', (code) => {
                const found = db.Buku.find(
                  (b) =>
                    b.id.toUpperCase() === code.toUpperCase() ||
                    b.isbn.replace(/[^0-9Xx]/g, '').toUpperCase() ===
                      code.replace(/[^0-9Xx]/g, '').toUpperCase()
                );
                if (found) openQRModal(found);
                else showToast(`Buku dengan kode "${code}" tidak ditemukan`, 'error');
              });
            }}
            title="Pindai Barcode Buku"
            className="px-3 py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-xl text-xs font-medium border border-teal-200 transition-colors flex items-center gap-1.5 shrink-0"
          >
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">Pindai</span>
          </button>

          <button
            onClick={() => {
              setIsSelectMode(!isSelectMode);
              if (isSelectMode) setSelectedIds(new Set());
            }}
            className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors flex items-center gap-1.5 shrink-0 ${
              isSelectMode
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span className="hidden sm:inline">{isSelectMode ? 'Batal Pilih' : 'Pilih'}</span>
          </button>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center gap-1 text-xs text-slate-500 shrink-0 border-r border-slate-100 pr-2">
            <span>Baris:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg outline-none"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>

          <button
            onClick={openAddModal}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Buku</span>
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-medium border border-slate-200 transition-colors flex items-center gap-1.5 shrink-0"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Import</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-medium border border-slate-200 transition-colors flex items-center gap-1.5 shrink-0"
          >
            <Download className="w-4 h-4 text-teal-600" />
            <span>Export</span>
          </button>

          <button
            onClick={() => setShowRegenModal(true)}
            title="Regenerasi Kode Buku Seluruh Koleksi"
            className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-medium border border-slate-200 transition-colors flex items-center gap-1.5 shrink-0"
          >
            <RotateCw className="w-4 h-4 text-teal-600" />
            <span>Regenerasi Kode</span>
          </button>

          <button
            onClick={handleDeleteAll}
            title="Hapus Seluruh Data Buku"
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-slate-200 transition-colors shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Batch Selection Banner */}
      {isSelectMode && (
        <div className="bg-teal-50 border border-teal-200 p-3 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-teal-900 font-medium">
            <CheckSquare className="w-4 h-4 text-teal-600" />
            <span>
              {selectedIds.size} buku terpilih dari {totalRecords} judul
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1 bg-white border border-slate-200 text-slate-600 rounded-lg font-medium hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              onClick={handleDeleteSelected}
              disabled={selectedIds.size === 0}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white rounded-lg font-medium transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus ({selectedIds.size})</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                {isSelectMode && (
                  <th className="p-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        paginatedData.length > 0 &&
                        paginatedData.every((b) => selectedIds.has(b.id))
                      }
                      onChange={handleSelectAllOnPage}
                      className="rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                    />
                  </th>
                )}
                <th className="p-3 w-12 text-center">Sampul</th>
                <th className="p-3">Kode Buku</th>
                <th className="p-3">ISBN</th>
                <th className="p-3">Judul Buku</th>
                <th className="p-3">Penulis & Penerbit</th>
                <th className="p-3">Kategori & Rak</th>
                <th className="p-3 text-center">Ketersediaan</th>
                <th className="p-3 text-center">Digital</th>
                <th className="p-3 text-center">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={isSelectMode ? 10 : 9}
                    className="p-8 text-center text-slate-400 italic"
                  >
                    Tidak ada koleksi buku ditemukan.
                  </td>
                </tr>
              ) : (
                paginatedData.map((b) => {
                  const isChecked = selectedIds.has(b.id);
                  const isAvailable = b.tersedia > 0;
                  return (
                    <tr
                      key={b.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isChecked ? 'bg-teal-50/60' : ''
                      }`}
                    >
                      {isSelectMode && (
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectBuku(b.id)}
                            className="rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="p-2 text-center">
                        <div className="w-8 h-11 mx-auto bg-slate-100 rounded overflow-hidden border border-slate-200 flex items-center justify-center">
                          {b.cover ? (
                            <img
                              src={b.cover}
                              alt={b.judul}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Book className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </div>
                      </td>
                      <td className="p-3 font-mono font-medium text-teal-700">{b.id}</td>
                      <td className="p-3 font-mono text-[11px] text-slate-500">{b.isbn || '-'}</td>
                      <td className="p-3 font-semibold text-slate-900 max-w-xs truncate">
                        {b.judul}
                      </td>
                      <td className="p-3 text-slate-600 max-w-xs truncate">
                        <span>{b.penulis}</span>{' '}
                        <span className="text-slate-400">· {b.penerbit}</span>
                      </td>
                      <td className="p-3 text-slate-600">
                        <span>{b.kategori}</span>{' '}
                        <span className="text-slate-400 text-[11px] font-mono">({b.rak})</span>
                      </td>
                      <td className="p-3 text-center font-mono tabular-nums">
                        <span
                          className={`font-semibold ${
                            isAvailable ? 'text-slate-800' : 'text-rose-600 font-bold'
                          }`}
                        >
                          {b.tersedia}
                        </span>{' '}
                        <span className="text-slate-400 text-[11px]">/ {b.jumlah}</span>
                      </td>
                      <td className="p-3 text-center">
                        {b.driveLink ? (
                          <a
                            href={b.driveLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:text-teal-800 hover:underline"
                          >
                            <span>E-Book</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-slate-300 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openQRModal(b)}
                            title="Lihat Kode QR & Label Barcode"
                            className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(b)}
                            title="Edit Buku"
                            className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteSingle(b.id, b.judul)}
                            title="Hapus"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Menampilkan <span className="font-semibold text-slate-700">{totalRecords > 0 ? startIndex + 1 : 0}</span> –{' '}
            <span className="font-semibold text-slate-700">
              {Math.min(startIndex + pageSize, totalRecords)}
            </span>{' '}
            dari <span className="font-semibold text-slate-700">{totalRecords}</span> judul buku
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={validPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 font-mono text-slate-700 font-medium">
              Hal {validPage} dari {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={validPage === totalPages || totalPages === 0}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-50 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Tambah Buku */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Book className="w-4 h-4 text-teal-600" />
                <span>Tambah Koleksi Buku Baru</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-medium text-slate-700">Kode Buku</label>
                    <button
                      type="button"
                      onClick={() => setAddId(generateNextBookId(db, 'BUK'))}
                      className="text-[10px] text-teal-600 hover:underline flex items-center gap-0.5"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Ulang</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={addId}
                    onChange={(e) => setAddId(e.target.value)}
                    placeholder="Contoh: BUK-2026-0003"
                    className="w-full p-2.5 font-mono font-medium text-teal-800 border border-slate-200 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-medium text-slate-700">ISBN / Barcode</label>
                    <button
                      type="button"
                      onClick={() => {
                        onOpenScanner('buku', (scanned) => {
                          setAddIsbn(scanned);
                          showToast(`ISBN terpindai: ${scanned}`, 'info');
                        });
                      }}
                      className="text-[10px] text-teal-600 hover:underline flex items-center gap-0.5"
                    >
                      <Camera className="w-3 h-3" />
                      <span>Pindai</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={addIsbn}
                    onChange={(e) => setAddIsbn(e.target.value)}
                    placeholder="Scan ISBN / ketik"
                    className="w-full p-2.5 font-mono border border-slate-200 rounded-xl outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Judul Buku</label>
                <input
                  type="text"
                  required
                  value={addJudul}
                  onChange={(e) => setAddJudul(e.target.value)}
                  placeholder="Contoh: Sang Pemimpi"
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Nama Penulis</label>
                  <input
                    type="text"
                    value={addPenulis}
                    onChange={(e) => setAddPenulis(e.target.value)}
                    placeholder="Andrea Hirata"
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Penerbit</label>
                  <input
                    type="text"
                    value={addPenerbit}
                    onChange={(e) => setAddPenerbit(e.target.value)}
                    placeholder="Bentang Pustaka"
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Kategori</label>
                  <input
                    type="text"
                    value={addKategori}
                    onChange={(e) => setAddKategori(e.target.value)}
                    placeholder="Novel / Sains"
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Lokasi Rak</label>
                  <input
                    type="text"
                    value={addRak}
                    onChange={(e) => setAddRak(e.target.value)}
                    placeholder="R-01"
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Jumlah Fisik</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={addJumlah}
                    onChange={(e) => setAddJumlah(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none font-mono focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Cover & E-Book Link */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <span className="font-medium text-slate-800 text-[11px] block">
                  Media & Tautan Digital (Opsional)
                </span>
                <div>
                  <label className="block text-slate-500 text-[11px] mb-1">
                    Tautan Google Drive (E-Book)
                  </label>
                  <input
                    type="url"
                    value={addDriveLink}
                    onChange={(e) => setAddDriveLink(e.target.value)}
                    placeholder="https://drive.google.com/file/..."
                    className="w-full p-2 text-xs border border-slate-200 rounded-lg outline-none bg-white focus:border-teal-500"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-16 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                    {addCover ? (
                      <img src={addCover} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                      <Book className="w-4 h-4 text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="block text-[11px] text-slate-500 mb-1">
                      Unggah Gambar Sampul
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverUpload}
                      className="text-[11px] text-slate-500"
                    />
                  </div>
                </div>
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
                  Simpan Buku
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Buku */}
      {showEditModal && selectedBuku && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-teal-600" />
                <span>Edit Informasi Buku</span>
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Kode Buku</label>
                  <input
                    type="text"
                    required
                    value={editId}
                    onChange={(e) => setEditId(e.target.value)}
                    className="w-full p-2.5 font-mono font-medium text-teal-800 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">ISBN</label>
                  <input
                    type="text"
                    value={editIsbn}
                    onChange={(e) => setEditIsbn(e.target.value)}
                    className="w-full p-2.5 font-mono border border-slate-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Judul Buku</label>
                <input
                  type="text"
                  required
                  value={editJudul}
                  onChange={(e) => setEditJudul(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Penulis</label>
                  <input
                    type="text"
                    value={editPenulis}
                    onChange={(e) => setEditPenulis(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Penerbit</label>
                  <input
                    type="text"
                    value={editPenerbit}
                    onChange={(e) => setEditPenerbit(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Kategori</label>
                  <input
                    type="text"
                    value={editKategori}
                    onChange={(e) => setEditKategori(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Rak</label>
                  <input
                    type="text"
                    value={editRak}
                    onChange={(e) => setEditRak(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Jumlah</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editJumlah}
                    onChange={(e) => setEditJumlah(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Tautan E-Book</label>
                <input
                  type="url"
                  value={editDriveLink}
                  onChange={(e) => setEditDriveLink(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View QR Code & Exemplars Barcode */}
      {showQRModal && selectedBuku && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <QrCode className="w-4 h-4 text-teal-600" />
                <span>QR Code & Barcode Buku</span>
              </h3>
              <button
                onClick={() => setShowQRModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center py-2 space-y-2">
              <div className="w-36 h-36 mx-auto bg-slate-50 p-2 rounded-xl border border-slate-200 flex items-center justify-center">
                <QRCodeView value={selectedBuku.id} size={130} />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">{selectedBuku.judul}</h4>
              <p className="font-mono text-xs text-teal-700 font-semibold">{selectedBuku.id}</p>
              <p className="text-[11px] text-slate-400">
                Rak: {selectedBuku.rak} · Kategori: {selectedBuku.kategori}
              </p>
            </div>

            {/* Exemplars list */}
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-800">
                  Daftar Barcode Eksemplar ({selectedBuku.jumlah} eks)
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Tersedia: {selectedBuku.tersedia}
                </span>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1.5 custom-scrollbar">
                {(
                  selectedBuku.eksemplar ||
                  buildEksemplarList(selectedBuku.id, selectedBuku.jumlah)
                ).map((ex) => (
                  <div
                    key={ex.kode}
                    className="p-2 bg-white rounded-lg border border-slate-200 text-[11px] flex items-center justify-between"
                  >
                    <span className="font-mono font-medium text-slate-800">{ex.kode}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                        ex.status === 'Dipinjam'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-teal-50 text-teal-700 border border-teal-200'
                      }`}
                    >
                      {ex.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowQRModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-medium"
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  setShowQRModal(false);
                  onPrintA4Barcodes(selectedBuku);
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Label Barcode A4</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Import Excel */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Import Buku dari Excel</span>
              </h4>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Sistem akan memetakan kolom secara otomatis (Judul Buku, ISBN, Penulis, Penerbit,
              Jumlah, Rak, dll.) tanpa harus urut.
            </p>

            <form onSubmit={handleImportSubmit} className="space-y-4 text-xs">
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50"
              />

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!importFile}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl font-medium shadow-xs"
                >
                  Proses Import
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Regenerasi Kode Buku */}
      {showRegenModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                <RotateCw className="w-4 h-4 text-teal-600" />
                <span>Regenerasi Kode Buku</span>
              </h4>
              <button
                onClick={() => setShowRegenModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs space-y-1.5">
              <p className="font-semibold flex items-center gap-1.5 text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                Perhatian:
              </p>
              <p className="leading-relaxed text-[11px]">
                Nomor kode seluruh buku akan diurutkan ulang berurutan ({regenDigits === '4' ? '0001, 0002, ...' : '001, 002, ...'}) berdasarkan urutan yang Anda tentukan. Riwayat peminjaman dan kode barcode eksemplar fisik otomatis diperbarui mengikuti nomor baru.
              </p>
            </div>

            <form onSubmit={handleRegenerateBookCodesSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Prefix Kode Buku</label>
                <input
                  type="text"
                  required
                  value={regenPrefix}
                  onChange={(e) => setRegenPrefix(e.target.value.toUpperCase())}
                  placeholder="Contoh: ANTON atau BUK"
                  className="w-full p-2.5 font-mono uppercase font-bold text-teal-700 border border-slate-200 rounded-xl outline-none focus:border-teal-500 bg-slate-50/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Panjang Digit</label>
                  <select
                    value={regenDigits}
                    onChange={(e) => setRegenDigits(e.target.value as '3' | '4')}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none bg-white font-mono"
                  >
                    <option value="3">3 Digit (001, 002)</option>
                    <option value="4">4 Digit (0001, 0002)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Urutan Koleksi</label>
                  <select
                    value={regenSortBy}
                    onChange={(e) => setRegenSortBy(e.target.value as 'judul' | 'kategori' | 'urutan')}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none bg-white font-medium"
                  >
                    <option value="judul">Judul (A - Z)</option>
                    <option value="kategori">Kategori, lalu Judul</option>
                    <option value="urutan">Pertahankan Urutan Saat Ini</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-[11px] font-mono space-y-1">
                <p className="text-slate-500 font-sans font-medium text-[11px]">Pratinjau Format Kode:</p>
                <p className="text-teal-700 font-bold">
                  Format: {regenPrefix || 'ANTON'}-{'1'.padStart(regenDigits === '4' ? 4 : 3, '0')}, {regenPrefix || 'ANTON'}-{'2'.padStart(regenDigits === '4' ? 4 : 3, '0')}, ...
                </p>
                <p className="text-slate-500">
                  Eksemplar: {regenPrefix || 'ANTON'}-{'1'.padStart(regenDigits === '4' ? 4 : 3, '0')}-001, ...
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRegenModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-medium shadow-xs"
                >
                  Terapkan & Urutkan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
