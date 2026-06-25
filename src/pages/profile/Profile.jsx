import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextField } from '@mui/material';
import { useAuth } from 'context/AuthContext';
import toast from 'react-hot-toast';
import Button from 'components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from 'components/ui/Card';
import { User, Mail, Phone, MapPin, Save, Lock, ArrowLeft, KeyRound, PenTool, Upload, Eraser, X } from 'lucide-react';
import Config from 'config/baseUrl';
import AuthService from 'services/authService';

const Profile = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const initials = useMemo(() => {
    const name = user?.name || user?.username || 'User';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }, [user]);

  // The signature (draw/upload) is only available to users whose role is "employee".
  // The role can live in several fields and shapes (object {role_name}, array of
  // those, or a plain string), so collect role names from every likely source.
  const isEmployee = useMemo(() => {
    const names = [];
    const collect = (v) => {
      if (!v) return;
      if (Array.isArray(v)) { v.forEach(collect); return; }
      if (typeof v === 'object') { if (v.role_name || v.name) names.push(v.role_name || v.name); return; }
      names.push(String(v));
    };
    collect(user?.role_permission);
    collect(user?.role);
    collect(user?.roles);
    collect(user?.user_role);
    const roleNames = names.map((n) => n.trim().toLowerCase()).filter(Boolean);
    return roleNames.includes('employee');
  }, [user]);

  const [form, setForm] = useState({
    name: user?.name || user?.username || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
    username: user?.username || '',
  });

  const [passwords, setPasswords] = useState({
    current: '',
    next: '',
    confirm: '',
  });

  const [passkey, setPasskey] = useState(['', '', '', '']);
  const [generatingPasskey, setGeneratingPasskey] = useState(false);
  const passkeyRefs = useRef([]);

  /* ── Signature: user chooses ONE of draw or upload ── */
  const [sigMode, setSigMode] = useState('draw'); // 'draw' | 'upload'
  const [sigHasDrawn, setSigHasDrawn] = useState(false);
  const [sigUploadPreview, setSigUploadPreview] = useState(user?.signature || '');
  const sigCanvasRef = useRef(null);
  const sigFileInputRef = useRef(null);
  const sigDrawing = useRef(false);
  const sigLastPos = useRef({ x: 0, y: 0 });

  const switchSigMode = (mode) => {
    setSigMode(mode);
    // Canvas remounts blank when returning to draw mode.
    if (mode === 'draw') setSigHasDrawn(false);
  };

  const getSigPos = (e) => {
    const canvas = sigCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDraw = (e) => {
    e.preventDefault();
    if (!sigCanvasRef.current) return;
    sigDrawing.current = true;
    sigLastPos.current = getSigPos(e);
  };

  const draw = (e) => {
    if (!sigDrawing.current) return;
    e.preventDefault();
    const ctx = sigCanvasRef.current.getContext('2d');
    const pos = getSigPos(e);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(sigLastPos.current.x, sigLastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    sigLastPos.current = pos;
    if (!sigHasDrawn) setSigHasDrawn(true);
  };

  const endDraw = () => { sigDrawing.current = false; };

  const clearDrawnSignature = () => {
    const canvas = sigCanvasRef.current;
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setSigHasDrawn(false);
  };

  const handleSigUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      e.target.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Signature must not be larger than 2 MB');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setSigUploadPreview(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const clearUploadedSignature = () => setSigUploadPreview('');

  const onPasskeyChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    setPasskey((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    if (value && index < passkeyRefs.current.length - 1) {
      passkeyRefs.current[index + 1]?.focus();
    }
  };

  const onPasskeyKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !passkey[index] && index > 0) {
      passkeyRefs.current[index - 1]?.focus();
    }
  };

  const generatePasskey = async (e) => {
    e.preventDefault();
    if (passkey.some((d) => d === '')) {
      toast.error('Please enter all 4 digits');
      return;
    }

    setGeneratingPasskey(true);
    try {
      const res = await fetch(`${Config.apiUrl}/store-passkey`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${AuthService.getToken()}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ passkey: passkey.join('') }),
      });
      const result = await res.json();
      if (res.ok && (result.success || result.status === 200)) {
        toast.success('Passkey generated successfully');
        setPasskey(['', '', '', '']);
      } else {
        toast.error(result.message || 'Failed to generate passkey');
      }
    } catch {
      toast.error('Failed to generate passkey');
    } finally {
      setGeneratingPasskey(false);
    }
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const saveProfile = async (e) => {
    e.preventDefault();

    const payload = {
      name: form.name,
      email: form.email,
      phone: form.phone,
      address: form.address,
      username: form.username,
    };

    // Signature is an employee-only field — only resolve and send it for employees.
    if (isEmployee) {
      let signature = '';
      if (sigMode === 'draw') {
        if (sigHasDrawn && sigCanvasRef.current) {
          signature = sigCanvasRef.current.toDataURL('image/png');
        }
      } else {
        signature = sigUploadPreview || '';
      }
      // Sent as a base64 data-URL string in the JSON body.
      payload.signature = signature;
    }

    const hashId = user?.hash_id || user?.id;
    if (!hashId) {
      toast.error('Unable to determine your account id');
      return;
    }

    const loadingToast = toast.loading('Updating profile...');
    try {
      const res = await fetch(`${Config.apiUrl}/employee/update/${hashId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${AuthService.getToken()}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-API-KEY': Config.apiKey,
        },
        body: JSON.stringify(payload),
      });
      const result = await res.json().catch(() => null);

      if (!res.ok || result?.success === false) {
        toast.error(result?.message || 'Failed to update profile', { id: loadingToast });
        return;
      }

      // Sync local state/storage with whatever the backend saved.
      updateUser({ ...payload, ...(result?.data || {}) });
      toast.success(result?.message || 'Profile updated', { id: loadingToast });
    } catch (err) {
      toast.error(err?.message || 'Network error while updating profile', { id: loadingToast });
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (!passwords.current || !passwords.next) {
      toast.error('Please fill all password fields');
      return;
    }
    if (passwords.next !== passwords.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    // Integrate with backend here if available
    setPasswords({ current: '', next: '', confirm: '' });
    toast.success('Password updated');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-emerald-950 px-6 py-4 rounded-xl text-white shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-800 hover:bg-emerald-700 rounded-lg transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="font-medium">Back</span>
          </button>
          <div>
            <h1 className="text-2xl font-bold">My Profile</h1>
            <p className="text-sm text-emerald-100">Manage your personal information and security</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Overview */}
        <Card className="lg:col-span-1">
          <CardContent>
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-24 h-24 rounded-full bg-emerald-100 text-emerald-900 flex items-center justify-center text-2xl font-bold">
                {initials}
              </div>
              <div>
                <div className="text-xl font-semibold text-slate-900">{user?.name || user?.username}</div>
                <div className="text-slate-500">{user?.email || '—'}</div>
              </div>
              <div className="w-full grid grid-cols-1 gap-3 mt-2">
                <div className="flex items-center gap-3 text-slate-700">
                  <Mail size={16} className="text-emerald-700" />
                  <span className="truncate">{user?.email || 'No email set'}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-700">
                  <Phone size={16} className="text-emerald-700" />
                  <span>{user?.phone || 'No phone set'}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-700">
                  <MapPin size={16} className="text-emerald-700" />
                  <span className="truncate">{user?.address || 'No address set'}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Details */}
        <Card className="lg:col-span-2">
          <CardHeader className="bg-slate-50">
            <CardTitle className="flex items-center gap-2">
              <User size={18} className="text-emerald-700" /> Edit Profile
            </CardTitle>
          </CardHeader>
          <form onSubmit={saveProfile}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextField label="Full Name" name="name" value={form.name} onChange={onChange} fullWidth />
                <TextField label="Username" name="username" value={form.username} onChange={onChange} fullWidth />
                <TextField type="email" label="Email" name="email" value={form.email} onChange={onChange} fullWidth />
                <TextField label="Phone" name="phone" value={form.phone} onChange={onChange} fullWidth />
              </div>
              <TextField label="Address" name="address" value={form.address} onChange={onChange} fullWidth multiline rows={3} />

              {/* Signature — choose ONE: draw or upload. Employees only. */}
              {isEmployee && (
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <PenTool size={16} className="text-emerald-700" /> Signature
                  </label>
                  <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => switchSigMode('draw')}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                        sigMode === 'draw' ? 'bg-emerald-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Draw
                    </button>
                    <button
                      type="button"
                      onClick={() => switchSigMode('upload')}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-slate-200 ${
                        sigMode === 'upload' ? 'bg-emerald-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Upload
                    </button>
                  </div>
                </div>

                {sigMode === 'draw' ? (
                  <div>
                    <div className="relative border-2 border-dashed border-slate-300 rounded-lg bg-slate-50">
                      <canvas
                        ref={sigCanvasRef}
                        width={600}
                        height={180}
                        onPointerDown={startDraw}
                        onPointerMove={draw}
                        onPointerUp={endDraw}
                        onPointerLeave={endDraw}
                        className="w-full h-[180px] rounded-lg touch-none cursor-crosshair"
                      />
                      {!sigHasDrawn && (
                        <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-400 italic">
                          Draw your signature here
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={clearDrawnSignature}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-red-600"
                    >
                      <Eraser size={14} /> Clear
                    </button>
                  </div>
                ) : (
                  <div>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => sigFileInputRef.current?.click()}
                      onKeyDown={(e) => e.key === 'Enter' && sigFileInputRef.current?.click()}
                      className="relative border-2 border-dashed border-slate-300 rounded-lg p-4 text-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-colors"
                    >
                      {sigUploadPreview ? (
                        <>
                          <img src={sigUploadPreview} alt="Signature" className="max-h-28 mx-auto object-contain" />
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); clearUploadedSignature(); }}
                            className="absolute top-1 right-1 p-0.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-full"
                          >
                            <X size={14} />
                          </button>
                          <p className="text-xs text-slate-400 mt-2">Click to replace image</p>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-slate-400 py-4">
                          <Upload size={24} />
                          <span className="text-sm font-medium text-slate-500">Click to upload signature</span>
                          <span className="text-xs">PNG, JPG, JPEG — max 2 MB</span>
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      ref={sigFileInputRef}
                      accept="image/png,image/jpeg,image/jpg"
                      className="hidden"
                      onChange={handleSigUpload}
                    />
                  </div>
                )}
              </div>
              )}
            </CardContent>
            <CardFooter>
              <Button type="submit" className="gap-2">
                <Save size={16} /> Save Changes
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>

      {/* Security */}
      <Card>
        <CardHeader className="bg-slate-50">
          <CardTitle className="flex items-center gap-2">
            <Lock size={18} className="text-emerald-700" /> Change Password
          </CardTitle>
        </CardHeader>
        <form onSubmit={changePassword}>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TextField
              type="password"
              label="Current Password"
              value={passwords.current}
              onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
              fullWidth
            />
            <TextField
              type="password"
              label="New Password"
              value={passwords.next}
              onChange={(e) => setPasswords((p) => ({ ...p, next: e.target.value }))}
              fullWidth
            />
            <TextField
              type="password"
              label="Confirm New Password"
              value={passwords.confirm}
              onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
              fullWidth
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" className="gap-2">
              <Save size={16} /> Update Password
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Passkey */}
      <Card>
        <CardHeader className="bg-slate-50">
          <CardTitle className="flex items-center gap-2">
            <KeyRound size={18} className="text-emerald-700" /> Passkey
          </CardTitle>
        </CardHeader>
        <form onSubmit={generatePasskey}>
          <CardContent>
            <p className="text-sm text-slate-500 mb-3">Enter a 4-digit passkey to secure your account.</p>
            <div className="flex gap-3">
              {passkey.map((digit, index) => (
                <TextField
                  key={index}
                  inputRef={(el) => (passkeyRefs.current[index] = el)}
                  value={digit}
                  onChange={(e) => onPasskeyChange(index, e.target.value)}
                  onKeyDown={(e) => onPasskeyKeyDown(index, e)}
                  inputProps={{
                    maxLength: 1,
                    inputMode: 'numeric',
                    pattern: '[0-9]*',
                    style: { textAlign: 'center', fontSize: '1.25rem' },
                  }}
                  sx={{ width: 56 }}
                />
              ))}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="gap-2" disabled={generatingPasskey}>
              <KeyRound size={16} /> {generatingPasskey ? 'Generating...' : 'Generate Passkey'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default Profile;
