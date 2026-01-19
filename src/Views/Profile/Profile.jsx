import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextField } from '@mui/material';
import { useAuth } from 'context/AuthContext';
import toast from 'react-hot-toast';
import Button from 'Components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from 'Components/ui/Card';
import { User, Mail, Phone, MapPin, Save, Lock, ArrowLeft } from 'lucide-react';

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

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    updateUser({
      name: form.name,
      email: form.email,
      phone: form.phone,
      address: form.address,
      username: form.username,
    });
    toast.success('Profile updated');
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
            <Lock size={18} className="text-emerald-700" /> Security
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
    </div>
  );
};

export default Profile;
