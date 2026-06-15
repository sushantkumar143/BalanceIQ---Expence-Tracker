import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Upload, Shield, BarChart3, Users, ArrowRight, CheckCircle2,
  FileSearch, AlertTriangle, Wallet, Zap, Eye, TrendingUp, ChevronRight
} from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const features = [
  {
    icon: Upload,
    title: 'Smart CSV Import',
    description: 'Upload messy spreadsheets with inconsistent dates, currencies, and formatting. Our engine handles it all.',
    color: 'from-indigo-500 to-blue-600',
  },
  {
    icon: AlertTriangle,
    title: 'Anomaly Detection',
    description: 'Automatically detect duplicates, invalid amounts, settlement misclassifications, and membership conflicts.',
    color: 'from-amber-500 to-orange-600',
  },
  {
    icon: Eye,
    title: 'Full Transparency',
    description: 'Click "Why?" on any balance to see every expense, settlement, and calculation that produced it.',
    color: 'from-emerald-500 to-teal-600',
  },
  {
    icon: Users,
    title: 'Membership Timeline',
    description: 'Members who join late or leave early are handled correctly. No more unfair splits.',
    color: 'from-purple-500 to-violet-600',
  },
  {
    icon: Zap,
    title: 'Smart Settlements',
    description: 'Minimize the number of transfers needed to settle all debts with our optimization algorithm.',
    color: 'from-rose-500 to-pink-600',
  },
  {
    icon: BarChart3,
    title: 'Rich Analytics',
    description: 'Monthly trends, category breakdowns, member contributions, and currency analysis at a glance.',
    color: 'from-cyan-500 to-blue-600',
  },
];

const steps = [
  { step: '01', title: 'Upload CSV', description: 'Drop your messy expense spreadsheet' },
  { step: '02', title: 'Review Anomalies', description: 'Approve or fix detected issues' },
  { step: '03', title: 'Confirm Members', description: 'Set join and leave dates' },
  { step: '04', title: 'Settle Balances', description: 'See who owes what, and why' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#0B1020] text-white overflow-hidden">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-[#0B1020]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">BalanceIQ</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-gray-400 hover:text-white transition-colors">How It Works</a>
            <a href="#benefits" className="text-sm text-gray-400 hover:text-white transition-colors">Benefits</a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm text-gray-400 hover:text-white transition-colors px-4 py-2"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="text-sm font-medium bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[128px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[128px]" />
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,rgba(79,70,229,0.05),transparent_70%)]" />
        </div>

        <div className="max-w-7xl mx-auto text-center relative">
          <motion.div
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            <motion.div
              custom={0}
              variants={fadeUp}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-indigo-300 text-sm mb-4"
            >
              <Zap className="w-3.5 h-3.5" />
              Trusted by 500+ flat groups worldwide
            </motion.div>

            <motion.h1
              custom={1}
              variants={fadeUp}
              className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1]"
            >
              Stop Arguing
              <br />
              <span className="gradient-text">About Bills.</span>
            </motion.h1>

            <motion.p
              custom={2}
              variants={fadeUp}
              className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed"
            >
              Import messy spreadsheets, detect anomalies automatically,
              track expenses accurately, and settle balances with complete transparency.
            </motion.p>

            <motion.div
              custom={3}
              variants={fadeUp}
              className="flex items-center justify-center gap-4 pt-4"
            >
              <Link
                to="/register"
                className="group inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-7 py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40"
              >
                Get Started Free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 text-gray-400 hover:text-white font-medium px-7 py-3.5 rounded-xl border border-white/10 hover:border-white/20 transition-all duration-200"
              >
                Watch Demo
              </a>
            </motion.div>
          </motion.div>

          {/* Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8, ease: [0.22, 1, 0.36, 1] as const }}
            className="mt-20 relative"
          >
            <div className="gradient-border rounded-2xl overflow-hidden">
              <div className="bg-[#111827] rounded-2xl p-1">
                <div className="bg-[#0d1225] rounded-xl p-6 space-y-4">
                  {/* Mock dashboard header */}
                  <div className="flex items-center gap-2 pb-4 border-b border-white/5">
                    <div className="w-3 h-3 rounded-full bg-red-500/60" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                    <div className="w-3 h-3 rounded-full bg-green-500/60" />
                    <span className="ml-3 text-xs text-gray-500">BalanceIQ Dashboard</span>
                  </div>

                  {/* Mock metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'Total Expenses', value: '₹1,24,560', change: '+12.5%', color: 'text-emerald-400' },
                      { label: 'Active Groups', value: '3', change: '+1', color: 'text-indigo-400' },
                      { label: 'Members', value: '12', change: '', color: 'text-purple-400' },
                      { label: 'Open Balances', value: '₹8,450', change: '-23%', color: 'text-amber-400' },
                    ].map((metric) => (
                      <div key={metric.label} className="bg-white/[0.02] rounded-lg p-3 border border-white/5">
                        <p className="text-xs text-gray-500 mb-1">{metric.label}</p>
                        <p className={`text-lg font-bold ${metric.color}`}>{metric.value}</p>
                        {metric.change && (
                          <p className="text-xs text-emerald-400 mt-0.5">{metric.change}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Mock chart area */}
                  <div className="h-32 bg-white/[0.02] rounded-lg border border-white/5 flex items-end justify-around p-3 gap-1">
                    {[35, 52, 41, 68, 55, 73, 45, 62, 80, 58, 72, 88].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-sm opacity-60"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>

                  {/* Mock anomaly banner */}
                  <div className="flex items-center gap-3 bg-amber-500/5 border border-amber-500/10 rounded-lg p-3">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <p className="text-xs text-amber-300">3 anomalies detected in latest import — <span className="underline">Review now</span></p>
                  </div>
                </div>
              </div>
            </div>

            {/* Glow effect */}
            <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-3/4 h-40 bg-indigo-600/10 blur-[80px] rounded-full" />
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.p custom={0} variants={fadeUp} className="text-indigo-400 font-semibold text-sm tracking-wider uppercase mb-3">
              Features
            </motion.p>
            <motion.h2 custom={1} variants={fadeUp} className="text-3xl sm:text-4xl font-bold">
              Everything you need to manage
              <br />
              <span className="gradient-text">shared expenses</span>
            </motion.h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                variants={fadeUp}
                className="group p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-indigo-500/20 transition-all duration-300 hover:bg-white/[0.04]"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-6 bg-white/[0.01]">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.p custom={0} variants={fadeUp} className="text-indigo-400 font-semibold text-sm tracking-wider uppercase mb-3">
              How It Works
            </motion.p>
            <motion.h2 custom={1} variants={fadeUp} className="text-3xl sm:text-4xl font-bold">
              From chaos to clarity in <span className="gradient-text">4 steps</span>
            </motion.h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={step.step}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                variants={fadeUp}
                className="relative"
              >
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
                  <div className="text-4xl font-black text-indigo-600/20 mb-3">{step.step}</div>
                  <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-400">{step.description}</p>
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden lg:flex absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                    <ChevronRight className="w-5 h-5 text-indigo-600/40" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section id="benefits" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.p custom={0} variants={fadeUp} className="text-indigo-400 font-semibold text-sm tracking-wider uppercase mb-3">
              Benefits
            </motion.p>
            <motion.h2 custom={1} variants={fadeUp} className="text-3xl sm:text-4xl font-bold">
              Built for <span className="gradient-text">trust & transparency</span>
            </motion.h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Shield,
                title: 'No Hidden Calculations',
                items: ['Every balance is traceable', 'Full audit trail', 'Click "Why?" on any number'],
              },
              {
                icon: FileSearch,
                title: 'Smart Data Cleaning',
                items: ['Handles 10+ anomaly types', 'User-approved decisions only', 'Never silently deletes data'],
              },
              {
                icon: TrendingUp,
                title: 'Actionable Insights',
                items: ['Monthly spending trends', 'Category breakdowns', 'Optimized settlements'],
              },
            ].map((benefit, i) => (
              <motion.div
                key={benefit.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                variants={fadeUp}
                className="p-6 rounded-2xl bg-white/[0.02] border border-white/5"
              >
                <benefit.icon className="w-8 h-8 text-indigo-400 mb-4" />
                <h3 className="text-lg font-semibold mb-4">{benefit.title}</h3>
                <ul className="space-y-3">
                  {benefit.items.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-gray-400">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.h2
              custom={0}
              variants={fadeUp}
              className="text-3xl sm:text-5xl font-bold mb-6"
            >
              Ready to stop arguing
              <br />
              <span className="gradient-text">about bills?</span>
            </motion.h2>
            <motion.p
              custom={1}
              variants={fadeUp}
              className="text-lg text-gray-400 mb-8 max-w-xl mx-auto"
            >
              Join thousands of flat groups who use BalanceIQ to manage shared expenses with complete transparency.
            </motion.p>
            <motion.div custom={2} variants={fadeUp}>
              <Link
                to="/register"
                className="group inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-4 rounded-xl transition-all duration-200 text-lg shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Wallet className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold">BalanceIQ</span>
          </div>
          <div className="flex items-center gap-8 text-sm text-gray-500">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#benefits" className="hover:text-white transition-colors">Benefits</a>
          </div>
          <p className="text-sm text-gray-600">© 2024 BalanceIQ. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
