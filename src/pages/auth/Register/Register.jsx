import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthService from 'Services/AuthService';
import { Button, Input, Card } from 'Components/ui';
import Label from 'Components/ui/Label';
import { validateSignup } from 'schemas';

export default function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    cnic: "",
    mobile: "",
    password: "",
    password_confirmation: "",
    role: "admin", // Default role
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: (name === 'cnic' || name === 'mobile') ? value.replace(/\D/g, "").slice(0, name === 'cnic' ? 13 : 11) : value
    });
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  // Validate form
  const validateForm = () => {
    const validationErrors = validateSignup(formData);
    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Creating account...');

    try {
      await AuthService.register(formData);
      toast.success("Registration successful! Redirecting to dashboard", { id: loadingToast });

      // Reset form
      setFormData({
        username: "",
        cnic: "",
        mobile: "",
        password: "",
        password_confirmation: "",
      });
      setErrors({});

      // Redirect to login after successful registration
      setTimeout(() => {
        navigate("/");
      }, 1500);
    } catch (error) {
      // Handle field-specific validation errors from API
      if (error.errors && Object.keys(error.errors).length > 0) {
        // Convert API error format (arrays) to simple strings
        const formattedErrors = {};
        Object.keys(error.errors).forEach(field => {
          const errorMessages = error.errors[field];
          formattedErrors[field] = Array.isArray(errorMessages)
            ? errorMessages[0]
            : errorMessages;
        });
        setErrors(formattedErrors);

        // Show the first error message in toast
        const firstError = Object.values(formattedErrors)[0];
        toast.error(firstError, { id: loadingToast });
      } else {
        // Show general error message
        toast.error(error.message || "Registration failed. Please try again.", { id: loadingToast });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      {/* Animated background shapes */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ y: [0, 20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-20 left-20 w-72 h-72 bg-emerald-200 rounded-full mix-blend-multiply blur-3xl opacity-50"
        />
        <motion.div
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-20 right-60 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply blur-3xl opacity-50"
        />
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
              <img src="/assets/img/favicon/Logo.png" alt="logo" className="w-12 h-12 rounded-lg" />
              <div>
                <div className="font-bold text-emerald-700 text-lg">AJ&K PSC</div>
                <div className="text-xs text-slate-500">Admin Portal</div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-8 py-8">
            <motion.form
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <h3 className="text-2xl font-bold text-slate-900 mb-6">Create Account</h3>

              {/* Username */}
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  name="username"
                  placeholder="Choose a username"
                  value={formData.username}
                  onChange={handleInputChange}
                  disabled={loading}
                  error={errors.username}
                />
                {errors.username && (
                  <p className="text-red-600 text-xs mt-1">{errors.username}</p>
                )}
              </div>

              {/* CNIC */}
              <div>
                <Label htmlFor="cnic">CNIC</Label>
                <Input
                  id="cnic"
                  name="cnic"
                  placeholder="12345-1234567-1"
                  maxLength="13"
                  value={formData.cnic}
                  onChange={handleInputChange}
                  disabled={loading}
                  error={errors.cnic}
                />
                {errors.cnic && (
                  <p className="text-red-600 text-xs mt-1">{errors.cnic}</p>
                )}
              </div>

              {/* Mobile */}
              <div>
                <Label htmlFor="mobile">Mobile Number</Label>
                <Input
                  id="mobile"
                  name="mobile"
                  placeholder="03XXXXXXXXX"
                  maxLength="11"
                  value={formData.mobile}
                  onChange={handleInputChange}
                  disabled={loading}
                  error={errors.mobile}
                />
                {errors.mobile && (
                  <p className="text-red-600 text-xs mt-1">{errors.mobile}</p>
                )}
              </div>

              {/* Role Selector */}
              <div>
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  disabled={loading}
                >
                  <option value="admin">Admin</option>
                  <option value="director">Director</option>
                  <option value="secretary">Secretary</option>
                  <option value="chairman">Chairman</option>
                </select>
                {errors.role && (
                  <p className="text-red-600 text-xs mt-1">{errors.role}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min 6 characters"
                    value={formData.password}
                    onChange={handleInputChange}
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
                {errors.password && (
                  <p className="text-red-600 text-xs mt-1">{errors.password}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <Label htmlFor="password_confirmation">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="password_confirmation"
                    name="password_confirmation"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm password"
                    value={formData.password_confirmation}
                    onChange={handleInputChange}
                    disabled={loading}
                    error={errors.password_confirmation}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password_confirmation && (
                  <p className="text-red-600 text-xs mt-1">{errors.password_confirmation}</p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                variant="primary"
                size="lg"
                className="w-full mt-6"
                disabled={loading}
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </Button>

              {/* Already have account */}
              <p className="text-center text-slate-600 text-sm mt-4">
                Already have an account?{' '}
                <a href="/" className="text-emerald-600 font-semibold hover:underline">
                  Sign in
                </a>
              </p>
            </motion.form>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
