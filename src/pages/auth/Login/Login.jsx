import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import Lottie from 'lottie-react';
import toast from 'react-hot-toast';
import AuthService from 'services/authService';
import { useAuth } from 'context/AuthContext';
import { Button, Input, Card } from 'components/ui';
import Label from 'components/ui/Label';
import { validateLogin, validateSignup } from 'schemas';

export default function Auth() {
  const navigate = useNavigate();
  const { login, register } = useAuth();
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

      setCaptcha({ token: response.data.captcha_token, image: response.data.captcha_image });

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

  const validateLoginForm = () => {
    return validateLogin(loginData);
  };

  const validateSignupForm = () => {
    return validateSignup(signupData);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const e_ = validateLoginForm();
    if (Object.keys(e_).length) {
      setErrors(e_);
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Signing in...');

    try {
      const captchaRes = await AuthService.validateCaptcha({ captcha_token: captcha.token, captcha: loginData.captcha });
      if (!captchaRes.success) throw new Error(captchaRes.message || 'CAPTCHA failed');

      const result = await login({ cnic: loginData.cnic, password: loginData.password });

      if (result.success) {
        toast.success('Login successful! Redirecting...', { id: loadingToast });
        setTimeout(() => navigate('/dashboard', { replace: true }), 1500);
      } else {
        throw new Error(result.error || 'Login failed');
      }
    } catch (err) {
      toast.error(err.message || 'Login failed', { id: loadingToast });
      loadCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    const e_ = validateSignupForm();
    if (Object.keys(e_).length) {
      setErrors(e_);
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Creating account...');

    try {
      const result = await register({
        username: signupData.username,
        cnic: signupData.cnic,
        password: signupData.password,
        password_confirmation: signupData.password_confirmation,
      });

      if (result.success) {
        toast.success('Registration successful! Redirecting to login...', { id: loadingToast });
        setTimeout(() => {
          setIsLogin(true);
          loadCaptcha();
        }, 1200);
      } else {
        throw new Error(result.error || 'Registration failed');
      }
    } catch (err) {
      toast.error(err.message || 'Registration failed', { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Auth Forms */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white px-6 sm:px-8 lg:px-12 py-8">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <div className="flex items-center gap-2 mb-6">
            <img src="/assets/img/favicon/Logo.png" alt="logo" className="w-10 h-10 rounded-lg shadow-md" />
            <div>
              <div className="font-bold text-emerald-700 text-lg">AJ&K PSC</div>
              <div className="text-xs text-slate-500">Admin Portal</div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {isLogin ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-2xl font-bold text-slate-900 mb-1">
                  Welcome Back
                </h2>
                <p className="text-slate-500 text-sm mb-6">Sign in to your account</p>

                <form onSubmit={handleLogin} className="space-y-4">
                  {/* CNIC Input */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">CNIC Number</label>
                    <Input
                      id="login-cnic"
                      name="cnic"
                      placeholder="Enter your 13-digit CNIC"
                      value={loginData.cnic}
                      onChange={handleLoginChange}
                      disabled={loading}
                      error={errors.cnic}
                      className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                    {errors.cnic && <p className="text-red-600 text-xs mt-1">{errors.cnic}</p>}
                  </div>

                  {/* Password Input */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Password</label>
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
                        className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {errors.password && <p className="text-red-600 text-xs mt-1">{errors.password}</p>}
                  </div>

                  {/* CAPTCHA */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Security Verification</label>
                    <div className="flex gap-2 mb-2">
                      {captcha.image ? (
                        <img src={captcha.image} alt="captcha" className="h-11 border-2 border-slate-200 rounded-lg flex-shrink-0" />
                      ) : (
                        <div className="h-11 w-28 border-2 border-slate-200 rounded-lg flex items-center justify-center bg-slate-50">
                          <div className="animate-spin h-4 w-4 border-2 border-emerald-600 border-t-transparent rounded-full" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={loadCaptcha}
                        disabled={loadingCaptcha || loading}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    </div>
                    <Input
                      id="login-captcha"
                      name="captcha"
                      placeholder="Enter CAPTCHA code"
                      value={loginData.captcha}
                      onChange={handleLoginChange}
                      disabled={loading}
                      error={errors.captcha}
                      maxLength={4}
                      className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                    {errors.captcha && <p className="text-red-600 text-xs mt-1">{errors.captcha}</p>}
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        Signing in...
                      </span>
                    ) : (
                      'Sign In'
                    )}
                  </Button>

                  {/* Footer */}
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <p className="text-center text-slate-600 text-sm">
                      Don't have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setIsLogin(false);
                          setErrors({});
                        }}
                        className="text-emerald-600 font-semibold hover:underline"
                      >
                        Sign up
                      </button>
                    </p>
                  </div>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="signup"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-2xl font-bold text-slate-900 mb-1">
                  Create Account
                </h2>
                <p className="text-slate-500 text-sm mb-6">Register for a new account</p>

                <form onSubmit={handleSignup} className="space-y-3.5">
                  {/* Username */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Username</label>
                    <Input
                      id="signup-username"
                      name="username"
                      placeholder="Choose a username"
                      value={signupData.username}
                      onChange={handleSignupChange}
                      disabled={loading}
                      error={errors.username}
                      className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                    {errors.username && <p className="text-red-600 text-xs mt-1">{errors.username}</p>}
                  </div>

                  {/* CNIC */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">CNIC Number</label>
                    <Input
                      id="signup-cnic"
                      name="cnic"
                      placeholder="Enter your 13-digit CNIC"
                      value={signupData.cnic}
                      onChange={handleSignupChange}
                      disabled={loading}
                      error={errors.cnic}
                      className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                    {errors.cnic && <p className="text-red-600 text-xs mt-1">{errors.cnic}</p>}
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Password</label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Minimum 6 characters"
                        value={signupData.password}
                        onChange={handleSignupChange}
                        disabled={loading}
                        error={errors.password}
                        className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {errors.password && <p className="text-red-600 text-xs mt-1">{errors.password}</p>}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Confirm Password</label>
                    <div className="relative">
                      <Input
                        id="signup-confirm"
                        name="password_confirmation"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Re-enter your password"
                        value={signupData.password_confirmation}
                        onChange={handleSignupChange}
                        disabled={loading}
                        error={errors.password_confirmation}
                        className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {errors.password_confirmation && <p className="text-red-600 text-xs mt-1">{errors.password_confirmation}</p>}
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        Creating account...
                      </span>
                    ) : (
                      'Create Account'
                    )}
                  </Button>

                  {/* Footer */}
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <p className="text-center text-slate-600 text-sm">
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setIsLogin(true);
                          setErrors({});
                        }}
                        className="text-emerald-600 font-semibold hover:underline"
                      >
                        Sign in
                      </button>
                    </p>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Terms Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 text-center text-xs text-slate-500"
          >
            By continuing, you agree to our{' '}
            <a href="#" className="text-emerald-600 hover:underline">Terms</a>
            {' '}and{' '}
            <a href="#" className="text-emerald-600 hover:underline">Privacy Policy</a>
          </motion.div>
        </motion.div>
      </div>

      {/* Right Side - Premium Lottie Design */}
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center p-16 rounded-tl-[50px] rounded-bl-[50px]"
        style={{
          background: 'linear-gradient(to bottom right, #022c22 0%, #064e3b 50%, #022c22 100%)'
        }}
      >
        {/* Enhanced background gradient orbs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.15, 0.25, 0.15]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-400 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-teal-400 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.12, 0.18, 0.12]
          }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-emerald-500 rounded-full blur-3xl"
        />

        {/* Main Lottie Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="relative z-10 w-full max-w-2xl"
        >
          {/* Primary Lottie Animation */}
          <motion.div
            animate={{
              y: [0, -12, 0]
            }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="relative"
          >
            <Lottie
              loop={true}
              autoplay={true}
              path="https://lottie.host/embed/0ce4ed30-cec6-4f38-a4da-30bc7071a3e9/iESU6fKLDc.json"
              className="w-full h-auto max-h-[550px]"
              rendererSettings={{
                preserveAspectRatio: 'xMidYMid meet'
              }}
            />
          </motion.div>

          {/* Bottom accent text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="text-center mt-10 space-y-3"
          >
            <h3 className="text-3xl font-bold text-white drop-shadow-lg">
              Welcome to AJ&K PSC
            </h3>
            <p className="text-emerald-200 text-base max-w-lg mx-auto drop-shadow-md">
              Your gateway to public service excellence and career opportunities
            </p>
          </motion.div>
        </motion.div>

        {/* Decorative elements - enhanced minimalist */}
        <motion.div
          animate={{
            rotate: 360,
            scale: [1, 1.05, 1]
          }}
          transition={{
            rotate: { duration: 50, repeat: Infinity, ease: "linear" },
            scale: { duration: 8, repeat: Infinity, ease: "easeInOut" }
          }}
          className="absolute top-20 right-20 w-40 h-40 border-2 border-emerald-400/25 rounded-full"
        />
        <motion.div
          animate={{
            rotate: -360,
            scale: [1, 1.08, 1]
          }}
          transition={{
            rotate: { duration: 60, repeat: Infinity, ease: "linear" },
            scale: { duration: 9, repeat: Infinity, ease: "easeInOut" }
          }}
          className="absolute bottom-24 left-16 w-28 h-28 border-2 border-teal-400/20 rounded-full"
        />
        <motion.div
          animate={{
            rotate: 360,
            scale: [1, 1.1, 1]
          }}
          transition={{
            rotate: { duration: 70, repeat: Infinity, ease: "linear" },
            scale: { duration: 10, repeat: Infinity, ease: "easeInOut" }
          }}
          className="absolute top-1/2 left-10 w-20 h-20 border-2 border-emerald-300/15 rounded-full"
        />

        {/* Enhanced floating particles */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              y: [0, -40, 0],
              x: [0, Math.sin(i * 0.5) * 20, 0],
              opacity: [0.2, 0.8, 0.2],
              scale: [0.8, 1.2, 0.8]
            }}
            transition={{
              duration: 5 + i * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.4
            }}
            className="absolute w-2 h-2 bg-emerald-300 rounded-full shadow-lg shadow-emerald-400/50"
            style={{
              top: `${15 + i * 10}%`,
              right: `${8 + i * 8}%`
            }}
          />
        ))}

        {/* Additional ambient glow */}
        <motion.div
          animate={{
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 right-1/4 w-64 h-64 bg-emerald-400/20 rounded-full blur-2xl"
        />
      </motion.div>
    </div>
  );
}
