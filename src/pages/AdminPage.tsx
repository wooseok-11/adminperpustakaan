import React, { useState } from 'react';
import {
  UserCheck,
  KeyRound,
  Plus,
  Search,
  Camera,
  X,
  User,
  ShieldCheck,
  Edit2,
} from 'lucide-react';
import { DatabaseSchema, AdministratorItem } from '../types';
import { compressImage, saveRepository } from '../utils/storage';

interface AdminPageProps {
  db: DatabaseSchema;
  currentUser: AdministratorItem | null;
  onUpdateDb: (updated: DatabaseSchema) => void;
  onNavigateToProfile: () => void;
  showToast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({
  db,
  currentUser,
  onUpdateDb,
  onNavigateToProfile,
  showToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showEditTokenModal, setShowEditTokenModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Edit token state
  const [tokenInput, setTokenInput] = useState(db.Pengaturan?.adminToken || 'ADMIN-SIP-2026');

  // Add admin state
  const [addNama, setAddNama] = useState('');
  const [addUser, setAddUser] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPass, setAddPass] = useState('');
  const [addRole, setAddRole] = useState('Administrator');
  const [addFoto, setAddFoto] = useState('');

  const currentToken = db.Pengaturan?.adminToken || 'ADMIN-SIP-2026';

  const adminList = (db.Administrator || []).filter((a) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (a.nama || '').toLowerCase().includes(q) ||
      (a.username || '').toLowerCase().includes(q) ||
      (a.email || '').toLowerCase().includes(q) ||
      (a.id || '').toLowerCase().includes(q)
    );
  });

  const handleSaveToken = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanToken = tokenInput.trim().toUpperCase();
    if (!cleanToken) {
      showToast('Token tidak boleh kosong', 'warning');
      return;
    }

    const updated = {
      ...db,
      Pengaturan: {
        ...db.Pengaturan,
        adminToken: cleanToken,
      },
    };
    saveRepository(updated);
    onUpdateDb(updated);
    setShowEditTokenModal(false);
    showToast(`Token registrasi diperbarui: ${cleanToken}`, 'success');
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 300, 0.75);
      setAddFoto(compressed);
      showToast('Foto profil dikompres & siap disimpan', 'info');
    } catch {
      showToast('Gagal memproses foto', 'error');
    }
  };

  const handleAddAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = addUser.trim().toLowerCase();
    if (db.Administrator.some((a) => a.username.toLowerCase() === cleanUser)) {
      showToast('Nama pengguna sudah dipakai!', 'error');
      return;
    }

    const nextId = `ADM-${String((db.Administrator || []).length + 1).padStart(2, '0')}`;
    const newAdmin: AdministratorItem = {
      id: nextId,
      nama: addNama.trim(),
      username: cleanUser,
      email: addEmail.trim() || '-',
      password: addPass,
      role: addRole,
      foto: addFoto,
      createdAt: new Date().toISOString(),
    };

    const updated = {
      ...db,
      Administrator: [...(db.Administrator || []), newAdmin],
    };
    saveRepository(updated);
    onUpdateDb(updated);
    setShowAddModal(false);
    showToast(`Akun petugas "${newAdmin.nama}" berhasil didaftarkan`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Authority Token Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-5 sm:p-6 border border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-medium text-teal-400">Otoritas Pendaftaran Petugas</span>
          </div>
          <h3 className="text-xl font-mono font-bold tracking-wider text-teal-300">
            {currentToken}
          </h3>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Token ini wajib dimasukkan oleh calon petugas saat mendaftar akun baru pada portal login.
          </p>
        </div>

        <button
          onClick={() => {
            setTokenInput(currentToken);
            setShowEditTokenModal(true);
          }}
          className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0 shadow-xs"
        >
          <KeyRound className="w-4 h-4" />
          <span>Ubah Token Otoritas</span>
        </button>
      </div>

      {/* Admin Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="font-semibold text-slate-900 text-sm">Daftar Petugas Perpustakaan</h4>
            <p className="text-xs text-slate-400 mt-0.5">Seluruh akun yang memiliki hak akses sistem</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama atau username..."
                className="pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl outline-none focus:border-teal-500 w-48 sm:w-60"
              />
            </div>

            <button
              onClick={() => {
                setAddNama('');
                setAddUser('');
                setAddEmail('');
                setAddPass('');
                setAddRole('Administrator');
                setAddFoto('');
                setShowAddModal(true);
              }}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Petugas</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="p-3 w-12 text-center">Foto</th>
                <th className="p-3">ID Petugas</th>
                <th className="p-3">Nama Lengkap</th>
                <th className="p-3">Nama Pengguna</th>
                <th className="p-3">Email</th>
                <th className="p-3">Peran Akses</th>
                <th className="p-3 text-center">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {adminList.map((adm) => {
                const isSelf =
                  adm.id === currentUser?.id || adm.username === currentUser?.username;
                return (
                  <tr
                    key={adm.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isSelf ? 'bg-teal-50/40' : ''
                    }`}
                  >
                    <td className="p-2 text-center">
                      <div className="w-8 h-8 rounded-full bg-slate-100 mx-auto overflow-hidden border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-600">
                        {adm.foto ? (
                          <img src={adm.foto} alt={adm.nama} className="w-full h-full object-cover" />
                        ) : (
                          <span>{(adm.nama || 'AP').substring(0, 2).toUpperCase()}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 font-mono font-medium text-teal-700">{adm.id}</td>
                    <td className="p-3 font-semibold text-slate-900">
                      <span>{adm.nama}</span>
                      {isSelf && (
                        <span className="ml-2 text-[10px] bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded font-medium">
                          Anda
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-slate-700">{adm.username}</td>
                    <td className="p-3 text-slate-500">{adm.email || '-'}</td>
                    <td className="p-3 text-slate-700 font-medium">{adm.role || 'Administrator'}</td>
                    <td className="p-3 text-center">
                      {isSelf ? (
                        <button
                          onClick={onNavigateToProfile}
                          className="px-3 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg font-medium text-xs border border-teal-200 transition-colors"
                        >
                          Edit Profil
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">Tersimpan</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Token Modal */}
      {showEditTokenModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-teal-600" />
                <span>Ubah Token Otoritas Pendaftaran</span>
              </h4>
              <button
                onClick={() => setShowEditTokenModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveToken} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Token Registrasi Baru
                </label>
                <input
                  type="text"
                  required
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                  className="w-full p-2.5 font-mono uppercase font-bold text-teal-700 border border-slate-200 rounded-xl outline-none focus:border-teal-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Token ini wajib diberikan kepada petugas baru yang ingin mendaftar.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditTokenModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium shadow-xs"
                >
                  Simpan Token
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Admin Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-teal-600" />
                <span>Tambah Akun Petugas Baru</span>
              </h4>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddAdminSubmit} className="space-y-3.5 text-xs">
              <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-14 h-14 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                  {addFoto ? (
                    <img src={addFoto} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div className="flex-1">
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Unggah Foto Profil
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="text-[11px] text-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={addNama}
                  onChange={(e) => setAddNama(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Nama Pengguna</label>
                  <input
                    type="text"
                    required
                    value={addUser}
                    onChange={(e) => setAddUser(e.target.value)}
                    placeholder="bsantoso"
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    placeholder="budi@perpus.sch.id"
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Kata Sandi</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={addPass}
                    onChange={(e) => setAddPass(e.target.value)}
                    placeholder="Min. 6 karakter"
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Peran Akses</label>
                  <select
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-teal-500 bg-white"
                  >
                    <option value="Administrator">Administrator</option>
                    <option value="Petugas Sirkulasi">Petugas Sirkulasi</option>
                    <option value="Kepala Perpustakaan">Kepala Perpustakaan</option>
                  </select>
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
                  Simpan Petugas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
