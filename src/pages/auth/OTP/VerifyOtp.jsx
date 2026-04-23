import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import AuthService from "services/authService";
import { useAuth } from "context/AuthContext";
import { Button } from "components/ui";

export default function VerifyOtp() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [otp, setOtp] = useState(["", "", "", ""]);
  const [loading, setLoading] = useState(false);

  const inputsRef = useRef([]);

  // Handle input change
  const handleChange = (value, index) => {
    if (!/^\d?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Move to next input
    if (value && index < 3) {
      inputsRef.current[index + 1].focus();
    }
  };

  // Handle backspace
  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1].focus();
    }
  };

  // Handle paste
  const handlePaste = (e) => {
    const pasteData = e.clipboardData.getData("text").slice(0, 4);
    if (!/^\d+$/.test(pasteData)) return;

    const pasteArray = pasteData.split("");
    const newOtp = [...otp];

    pasteArray.forEach((digit, i) => {
      if (i < 4) newOtp[i] = digit;
    });

    setOtp(newOtp);
    inputsRef.current[3].focus();
  };

  const handleVerify = async () => {
    const otpValue = otp.join("");

    if (otpValue.length !== 4) {
      toast.error("Enter 4 digit OTP");
      return;
    }

    const userId = localStorage.getItem("otp_user_id");
    if (!userId) {
      toast.error("Session expired. Please login again.");
      navigate("/");
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading("Verifying OTP...");

    try {
      const result = await AuthService.verifyOtp({
        user_id: userId,
        otp: otpValue,
      });

      if (result.success) {
        login(result.data.user);
        localStorage.removeItem("otp_user_id");

        toast.success("Login successful!", { id: loadingToast });
        navigate("/dashboard", { replace: true });
      } else {
        throw new Error(result.message || "Invalid OTP");
      }
    } catch (err) {
      toast.error(err.message || "Invalid or expired OTP", {
        id: loadingToast,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-slate-100 px-4">
      <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-xl text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          OTP Verification
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          Enter the 4-digit code sent to your mobile number
        </p>

        <div
          className="flex justify-center gap-4 mb-6"
          onPaste={handlePaste}
        >
          {otp.map((digit, index) => (
            <input
              key={index}
              type="text"
              maxLength="1"
              value={digit}
              ref={(el) => (inputsRef.current[index] = el)}
              onChange={(e) => handleChange(e.target.value, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className="w-14 h-14 text-center text-xl font-semibold border-2 border-gray-300 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition"
            />
          ))}
        </div>

        <Button
          onClick={handleVerify}
          disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-semibold transition disabled:opacity-50"
        >
          {loading ? "Verifying..." : "Verify OTP"}
        </Button>
      </div>
    </div>
  );
}