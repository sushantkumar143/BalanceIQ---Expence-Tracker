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
    color: 'from-blue-500 to-blue-600',
  },
  {
    icon: AlertTriangle,
    title: 'Anomaly Detection',
    description: 'Automatically detect duplicates, invalid amounts, settlement misclassifications, and membership conflicts.',
    color: 'from-orange-500 to-red-600',
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
    color: 'from-blue-400 to-blue-600',
  },
  {
    icon: Zap,
    title: 'Smart Settlements',
    description: 'Minimize the number of transfers needed to settle all debts with our optimization algorithm.',
    color: 'from-blue-500 to-indigo-600',
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
    <div className="min-h-screen bg-slate-50 text-slate-900 overflow-hidden">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
              <Wallet className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">BalanceIQ</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium">Features</a>
            <a href="#how-it-works" className="text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium">How It Works</a>
            <a href="#benefits" className="text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium">Benefits</a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm text-slate-600 hover:text-blue-600 transition-colors px-4 py-2 font-medium"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
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
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-100 rounded-full blur-[128px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-100 rounded-full blur-[128px]" />
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.05),transparent_70%)]" />
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
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-sm mb-4 font-medium"
            >
              <Zap className="w-3.5 h-3.5" />
              Trusted by 500+ flat groups worldwide
            </motion.div>

            <motion.h1
              custom={1}
              variants={fadeUp}
              className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] text-slate-900"
            >
              Stop Arguing
              <br />
              <span className="gradient-text">About Bills.</span>
            </motion.h1>

            <motion.p
              custom={2}
              variants={fadeUp}
              className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed"
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
                className="group inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-7 py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30"
              >
                Get Started Free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 bg-white font-medium px-7 py-3.5 rounded-xl border border-slate-200 hover:border-slate-300 transition-all duration-200 shadow-sm"
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
            <div className="gradient-border rounded-2xl overflow-hidden shadow-2xl">
              <div className="bg-white rounded-2xl p-1">
                <div className="bg-slate-50 rounded-xl p-6 space-y-4 border border-slate-100">
                  {/* Mock dashboard header */}
                  <div className="flex items-center gap-2 pb-4 border-b border-slate-200">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                    <span className="ml-3 text-xs font-semibold text-slate-500">BalanceIQ Dashboard</span>
                  </div>

                  {/* Mock metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'Total Expenses', value: '₹1,24,560', change: '+12.5%', color: 'text-blue-600' },
                      { label: 'Active Groups', value: '3', change: '+1', color: 'text-indigo-600' },
                      { label: 'Members', value: '12', change: '', color: 'text-purple-600' },
                      { label: 'Open Balances', value: '₹8,450', change: '-23%', color: 'text-emerald-600' },
                    ].map((metric) => (
                      <div key={metric.label} className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
                        <p className="text-xs text-slate-500 mb-1 font-medium">{metric.label}</p>
                        <p className={`text-lg font-bold ${metric.color}`}>{metric.value}</p>
                        {metric.change && (
                          <p className="text-xs text-emerald-600 mt-0.5 font-medium">{metric.change}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Mock chart area */}
                  <div className="h-32 bg-white rounded-lg border border-slate-200 shadow-sm flex items-end justify-around p-3 gap-1">
                    {[35, 52, 41, 68, 55, 73, 45, 62, 80, 58, 72, 88].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-gradient-to-t from-blue-500 to-blue-400 rounded-sm opacity-80"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>

                  {/* Mock anomaly banner */}
                  <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg p-3">
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <p className="text-xs font-medium text-red-700">3 anomalies detected in latest import — <span className="underline cursor-pointer">Review now</span></p>
                  </div>
                </div>
              </div>
            </div>

            {/* Glow effect */}
            <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-3/4 h-40 bg-blue-100 blur-[80px] rounded-full" />
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.p custom={0} variants={fadeUp} className="text-blue-600 font-bold text-sm tracking-wider uppercase mb-3">
              Features
            </motion.p>
            <motion.h2 custom={1} variants={fadeUp} className="text-3xl sm:text-4xl font-extrabold text-slate-900">
              Everything you need to manage
              <br />
              <span className="gradient-text">shared expenses</span>
            </motion.h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                variants={fadeUp}
                className="group p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-6 bg-slate-50 border-t border-slate-200">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.p custom={0} variants={fadeUp} className="text-blue-600 font-bold text-sm tracking-wider uppercase mb-3">
              How It Works
            </motion.p>
            <motion.h2 custom={1} variants={fadeUp} className="text-3xl sm:text-4xl font-extrabold text-slate-900">
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
                <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm text-center">
                  <div className="text-4xl font-black text-blue-100 mb-3">{step.step}</div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-600 font-medium">{step.description}</p>
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden lg:flex absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                    <ChevronRight className="w-5 h-5 text-slate-300" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section id="benefits" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.p custom={0} variants={fadeUp} className="text-blue-600 font-bold text-sm tracking-wider uppercase mb-3">
              Benefits
            </motion.p>
            <motion.h2 custom={1} variants={fadeUp} className="text-3xl sm:text-4xl font-extrabold text-slate-900">
              Built for <span className="gradient-text">trust & transparency</span>
            </motion.h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
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
                className="p-8 rounded-2xl bg-white border border-slate-200 shadow-sm"
              >
                <benefit.icon className="w-10 h-10 text-blue-600 mb-6" />
                <h3 className="text-xl font-bold text-slate-900 mb-4">{benefit.title}</h3>
                <ul className="space-y-4">
                  {benefit.items.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-slate-600 font-medium">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
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
      <section className="py-24 px-6 bg-slate-50 border-t border-slate-200">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.h2
              custom={0}
              variants={fadeUp}
              className="text-3xl sm:text-5xl font-extrabold text-slate-900 mb-6"
            >
              Ready to stop arguing
              <br />
              <span className="gradient-text">about bills?</span>
            </motion.h2>
            <motion.p
              custom={1}
              variants={fadeUp}
              className="text-lg text-slate-600 font-medium mb-8 max-w-xl mx-auto"
            >
              Join thousands of flat groups who use BalanceIQ to manage shared expenses with complete transparency.
            </motion.p>
            <motion.div custom={2} variants={fadeUp}>
              <Link
                to="/register"
                className="group inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-4 rounded-xl transition-all duration-200 text-lg shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <Wallet className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-slate-900">BalanceIQ</span>
          </div>
          <div className="flex items-center gap-8 text-sm text-slate-600 font-medium">
            <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-blue-600 transition-colors">How It Works</a>
            <a href="#benefits" className="hover:text-blue-600 transition-colors">Benefits</a>
          </div>
          <p className="text-sm text-slate-500">© 2024 BalanceIQ. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
