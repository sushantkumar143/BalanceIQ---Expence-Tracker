import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../../services/api';
import { Wallet, ArrowLeft, Loader2, Mail, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch {
      setSent(true); // Show success regardless for security
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B1020] p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md space-y-8"
      >
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Wallet className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold text-white">BalanceIQ</span>
        </div>

        {!sent ? (
          <>
            <div>
              <h1 className="text-2xl font-bold text-white">Reset your password</h1>
              <p className="text-gray-400 mt-1">
                Enter your email and we'll send you a reset link
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <button
                id="forgot-submit"
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Send Reset Link <Mail className="w-4 h-4" /></>}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Check your email</h2>
            <p className="text-gray-400">
              If an account exists with <span className="text-white">{email}</span>,
              you'll receive a password reset link shortly.
            </p>
          </div>
        )}

        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to sign in
        </Link>
      </motion.div>
    </div>
  );
}
