import React, { useState, useRef } from 'react';
import {
  User,
  Camera,
  Upload,
  Trash2,
  Lock,
  Save,
  CheckCircle2,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import { DatabaseSchema, AdministratorItem } from '../types';
import {
  compressImage,
  setCurrentLoggedInUser,
  saveRepository,
} from '../utils/storage';

interface ProfilPageProps {
  db: DatabaseSchema;
  currentUser: AdministratorItem | null;
  onUpdateCurrentUser: (user: AdministratorItem) => void;
  onUpdateDb: (updated: DatabaseSchema) => void;
  showToast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const ProfilPage: React.FC<ProfilPageProps> = ({
  db,
  currentUser,
  onUpdateCurrentUser,
  onUpdateDb,
  showToast,
}) => {
  if (!currentUser) {
    return (
      <div className="p-8 text-center text-slate-400">
        Sesi tidak terdeteksi. Silakan masuk kembali.
      </div>
    );
  }

  const [nama, setNama] = useState(currentUser.nama || '');
  const [username, setUsername] = useState(currentUser.username || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [role, setRole] = useState(currentUser.role || 'Administrator');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(currentUser.foto || '');

  // Webcam snapshot modal
  const [showWebcamModal, setShowWebcamModal] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 400, 0.75);
      setPhotoPreview(compressed);
      showToast('Foto profil baru siap disimpan', 'info');
    } catch {
      showToast('Gagal memproses gambar', 'error');
    }
  };

  const startWebcam = async () => {
    setShowWebcamModal(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 480, height: 480 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      showToast('Tidak dapat mengakses webcam kamera', 'error');
      setShowWebcamModal(false);
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setShowWebcamModal(false);
  };

  const captureWebcamSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, 400, 400);
      const data = canvas.toDataURL('image/jpeg', 0.75);
      setPhotoPreview(data);
      showToast('Foto webcam berhasil diambil', 'success');
    }
    stopWebcam();
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim() || !username.trim()) {
      showToast('Nama dan nama pengguna tidak boleh kosong', 'warning');
      return;
    }

    if (newPassword && newPassword.length < 6) {
      showToast('Kata sandi baru minimal 6 karakter', 'warning');
      return;
    }

    const updatedUser: AdministratorItem = {
      ...currentUser,
      nama: nama.trim(),
      username: username.trim().toLowerCase(),
      email: email.trim(),
      role: role.trim(),
      foto: photoPreview,
      ...(newPassword ? { password: newPassword } : {}),
    };

    const updatedAdminList = (db.Administrator || []).map((a) =>
      a.id === currentUser.id ? updatedUser : a
    );

    const updatedDb = {
      ...db,
      Administrator: updatedAdminList,
    };

    setCurrentLoggedInUser(updatedUser);
    onUpdateCurrentUser(updatedUser);
    saveRepository(updatedDb);
    onUpdateDb(updatedDb);
    setNewPassword('');
    showToast('Profil akun berhasil diperbarui!', 'success');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile Header Card */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-6 relative overflow-hidden border border-slate-800 shadow-xs flex items-center gap-5">
        <div className="w-18 h-18 rounded-full bg-teal-500/20 border-2 border-teal-400/40 flex items-center justify-center font-bold text-2xl shrink-0 overflow-hidden text-teal-300">
          {photoPreview ? (
            <img src={photoPreview} alt={nama} className="w-full h-full object-cover" />
          ) : (
            <span>{(nama || 'AP').substring(0, 2).toUpperCase()}</span>
          )}
        </div>

        <div className="space-y-0.5">
          <h3 className="text-base font-bold text-white">{nama}</h3>
          <p className="text-xs text-teal-300 font-mono">
            {currentUser.id} · {role}
          </p>
          <p className="text-xs text-slate-400">{email || 'Belum ada email'}</p>
        </div>
      </div>

      {/* Profile Edit Form */}
      <form
        onSubmit={handleSaveProfile}
        className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5 text-xs"
      >
        <h4 className="font-semibold text-slate-900 text-sm border-b border-slate-100 pb-3">
          Pengaturan Identitas & Kredensial
        </h4>

        {/* Foto section */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div className="w-14 h-14 rounded-full bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
            {photoPreview ? (
              <img src={photoPreview} alt={nama} className="w-full h-full object-cover" />
            ) : (
              <User className="w-6 h-6 text-slate-400" />
            )}
          </div>

          <div className="space-y-1.5 flex-1">
            <span className="block font-medium text-slate-700">Foto Profil</span>
            <div className="flex flex-wrap gap-2">
              <label className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-medium cursor-pointer transition-colors flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-teal-600" />
                <span>Pilih Foto</span>
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </label>

              <button
                type="button"
                onClick={startWebcam}
                className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-medium transition-colors flex items-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5 text-teal-600" />
                <span>Ambil Kamera</span>
              </button>

              {photoPreview && (
                <button
                  type="button"
                  onClick={() => setPhotoPreview('')}
                  className="px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg font-medium hover:bg-rose-100 transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-medium text-slate-700 mb-1">ID Petugas</label>
            <input
              type="text"
              readOnly
              value={currentUser.id}
              className="w-full p-2.5 font-mono font-medium text-teal-800 bg-slate-50 border border-slate-200 rounded-xl outline-none"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Peran Akses</label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-teal-500"
            />
          </div>
        </div>

        <div>
          <label className="block font-medium text-slate-700 mb-1">Nama Lengkap</label>
          <input
            type="text"
            required
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-teal-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Nama Pengguna</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-2.5 font-mono border border-slate-200 rounded-xl outline-none focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-teal-500"
            />
          </div>
        </div>

        <div>
          <label className="block font-medium text-slate-700 mb-1">
            Kata Sandi Baru (Kosongkan jika tidak diubah)
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              className="w-full pl-3 pr-10 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-teal-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium transition-colors flex items-center gap-2 shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Perubahan Profil</span>
          </button>
        </div>
      </form>

      {/* Webcam Snapshot Modal */}
      {showWebcamModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="font-semibold text-slate-900 text-xs">Ambil Foto Webcam</h4>
              <button onClick={stopWebcam} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative bg-black rounded-xl overflow-hidden aspect-square">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={stopWebcam}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={captureWebcamSnapshot}
                className="px-4 py-1.5 text-xs bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium"
              >
                Ambil Foto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
