import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthService from 'Services/AuthService';
import { Button, Input, Card } from 'Components/ui';
import Label from 'Components/ui/Label';

export default function Auth() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [captcha, setCaptcha] = useState({ token: null, image: null });
  const [loadingCaptcha, setLoadingCaptcha] = useState(false);
  const [loginData, setLoginData] = useState({ cnic: '', password: '', captcha: '' });
  const [signupData, setSignupData] = useState({
    username: '',
    cnic: '',
    password: '',
    password_confirmation: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadCaptcha();
  }, []);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const loadCaptcha = async () => {
    setLoadingCaptcha(true);
    try {
      const response = await AuthService.generateCaptcha();
      setCaptcha({ token: response.captcha_token, image: response.captcha_image });
      setLoginData((s) => ({ ...s, captcha: '' }));
    } catch (err) {
      toast.error('Failed to load CAPTCHA');
    } finally {
      setLoadingCaptcha(false);
    }
  };

  const handleLoginChange = (e) => {
    const { name, value } = e.target;
    setLoginData((s) => ({ ...s, [name]: name === 'cnic' ? value.replace(/\D/g, '').slice(0, 13) : value }));
    if (errors[name]) setErrors((s) => ({ ...s, [name]: null }));
  };

  const handleSignupChange = (e) => {
    const { name, value } = e.target;
    setSignupData((s) => ({ ...s, [name]: name === 'cnic' ? value.replace(/\D/g, '').slice(0, 13) : value }));
    if (errors[name]) setErrors((s) => ({ ...s, [name]: null }));
  };

  const validateLogin = () => {
    const e = {};
    if (!loginData.cnic || loginData.cnic.length !== 13) e.cnic = 'Valid CNIC required (13 digits)';
    if (!loginData.password) e.password = 'Password required';
    if (!loginData.captcha) e.captcha = 'CAPTCHA required';
    return e;
  };

  const validateSignup = () => {
    const e = {};
    if (!signupData.username) e.username = 'Username required';
    if (!signupData.cnic || signupData.cnic.length !== 13) e.cnic = 'Valid CNIC required (13 digits)';
    if (!signupData.password || signupData.password.length < 6) e.password = 'Password min 6 chars';
    if (signupData.password !== signupData.password_confirmation) e.password_confirmation = 'Passwords must match';
    return e;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const e_ = validateLogin();
    if (Object.keys(e_).length) {
      setErrors(e_);
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Signing in...');
    
    try {
      const captchaRes = await AuthService.validateCaptcha({ captcha_token: captcha.token, captcha: loginData.captcha });
      if (!captchaRes.success) throw new Error(captchaRes.message || 'CAPTCHA failed');

      const loginRes = await AuthService.login({ cnic: loginData.cnic, password: loginData.password });
      localStorage.setItem('isLoggedIn', 'true');
      toast.success('Login successful! Redirecting...', { id: loadingToast });

      setTimeout(() => navigate('/dashboard', { replace: true }), 1500);
    } catch (err) {
      toast.error(err.message || 'Login failed', { id: loadingToast });
      loadCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    const e_ = validateSignup();
    if (Object.keys(e_).length) {
      setErrors(e_);
      return;
    }
const loadingToast = toast.loading('Creating account...');
    
    try {
      const signupRes = await AuthService.register({
        username: signupData.username,
        cnic: signupData.cnic,
        password: signupData.password,
        password_confirmation: signupData.password_confirmation,
      });

      toast.success('Registration successful! Redirecting to login...', { id: loadingToast });
      setTimeout(() => {
        setIsLogin(true);
        loadCaptcha();
      }, 1200);
    } catch (err) {
      toast.error(err.message || 'Registration failed', { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      {/* Animated background shapes */}
<div className="fixed inset-0 overflow-hidden pointer-events-none">
  
  {/* Top Left Blob */}
  <motion.div
    animate={{ y: [0, 20, 0] }}
    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
    className="absolute top-20 left-20 w-72 h-72 bg-emerald-200 rounded-full mix-blend-multiply blur-3xl opacity-50"
  />

  {/* Top Right Blob */}
  <motion.div
    animate={{ y: [0, -20, 0] }}
    transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
    className="absolute top-20 right-60 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply blur-3xl opacity-50"
  />

  {/* Bottom Right Blob */}
  <motion.div
    animate={{ y: [0, -30, 0] }}
    transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
    className="absolute bottom-20 right-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply blur-3xl opacity-50"
  />
</div>


      {/* Main card container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="backdrop-blur-xl bg-white/95 shadow-2xl border border-white/20">
          {/* Header */}
          <div className="px-8 py-6 border-b border-slate-200">
            <div className="flex items-center justify-center gap-3 mb-4">
              <img src="/assets/img/favicon/Logo.PNG" alt="logo" className="w-12 h-12 rounded-lg" />
              <div>
                <div className="font-bold text-emerald-700 text-lg">AJ&K PSC</div>
                <div className="text-xs text-slate-500">Admin Portal</div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-8 py-8">
            {/* Forms */}
            <AnimatePresence mode="wait">
              {isLogin ? (
                <motion.form key="login" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} onSubmit={handleLogin} className="space-y-4">
                  <h3 className="text-2xl font-bold text-slate-900 mb-6">Welcome Back</h3>

                  <div>
                    <Label htmlFor="login-cnic">CNIC</Label>
                    <Input id="login-cnic" name="cnic" placeholder="12345-1234567-1" value={loginData.cnic} onChange={handleLoginChange} disabled={loading} error={errors.cnic} />
                    {errors.cnic && <p className="text-red-600 text-xs mt-1">{errors.cnic}</p>}
                  </div>

                  <div>
                    <Label htmlFor="login-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={loginData.password}
                        onChange={handleLoginChange}
                        disabled={loading}
                        error={errors.password}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {errors.password && <p className="text-red-600 text-xs mt-1">{errors.password}</p>}
                  </div>

                  <div>
                    <Label htmlFor="login-captcha">CAPTCHA</Label>
                    <div className="flex gap-2 mb-2">
                      {captcha.image ? (
                        <img src={captcha.image} alt="captcha" className="h-12 border border-slate-300 rounded-lg" />
                      ) : (
                        <div className="h-12 border border-slate-300 rounded-lg flex items-center justify-center bg-slate-50">
                          <div className="animate-spin h-4 w-4 border-2 border-emerald-600 border-t-transparent rounded-full" />
                        </div>
                      )}
                      <button type="button" onClick={loadCaptcha} disabled={loadingCaptcha || loading} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium text-sm disabled:opacity-50">
                        ↻
                      </button>
                    </div>
                    <Input id="login-captcha" name="captcha" placeholder="Enter CAPTCHA" value={loginData.captcha} onChange={handleLoginChange} disabled={loading} error={errors.captcha} maxLength={4} />
                    {errors.captcha && <p className="text-red-600 text-xs mt-1">{errors.captcha}</p>}
                  </div>

                  <Button variant="primary" size="lg" className="w-full mt-6" disabled={loading}>
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>

                  <p className="text-center text-slate-600 text-sm mt-4">
                    Don't have an account?{' '}
                    <button type="button" onClick={() => { setIsLogin(false); setErrors({}); }} className="text-emerald-600 font-semibold hover:underline">
                      Create one
                    </button>
                  </p>
                </motion.form>
              ) : (
                <motion.form key="signup" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }} onSubmit={handleSignup} className="space-y-3">
                  <h3 className="text-2xl font-bold text-slate-900 mb-6">Create Account</h3>

                  <div>
                    <Label htmlFor="signup-username">Username</Label>
                    <Input id="signup-username" name="username" placeholder="Choose a username" value={signupData.username} onChange={handleSignupChange} disabled={loading} error={errors.username} />
                    {errors.username && <p className="text-red-600 text-xs mt-1">{errors.username}</p>}
                  </div>

                  <div>
                    <Label htmlFor="signup-cnic">CNIC</Label>
                    <Input id="signup-cnic" name="cnic" placeholder="12345-1234567-1" value={signupData.cnic} onChange={handleSignupChange} disabled={loading} error={errors.cnic} />
                    {errors.cnic && <p className="text-red-600 text-xs mt-1">{errors.cnic}</p>}
                  </div>

                  <div>
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Min 6 characters"
                        value={signupData.password}
                        onChange={handleSignupChange}
                        disabled={loading}
                        error={errors.password}
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {errors.password && <p className="text-red-600 text-xs mt-1">{errors.password}</p>}
                  </div>

                  <div>
                    <Label htmlFor="signup-confirm">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-confirm"
                        name="password_confirmation"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm password"
                        value={signupData.password_confirmation}
                        onChange={handleSignupChange}
                        disabled={loading}
                        error={errors.password_confirmation}
                      />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700">
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {errors.password_confirmation && <p className="text-red-600 text-xs mt-1">{errors.password_confirmation}</p>}
                  </div>

                  <Button variant="primary" size="lg" className="w-full mt-6" disabled={loading}>
                    {loading ? 'Creating account...' : 'Create Account'}
                  </Button>

                  <p className="text-center text-slate-600 text-sm mt-4">
                    Already have an account?{' '}
                    <button type="button" onClick={() => { setIsLogin(true); setErrors({}); }} className="text-emerald-600 font-semibold hover:underline">
                      Sign in
                    </button>
                  </p>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
