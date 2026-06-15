import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, Plus, Users, DollarSign, ArrowRight,
  BarChart3, HelpCircle, X, Calendar, Loader2,
  ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { groupsApi, expensesApi, balancesApi, settlementsApi } from '../../services/api';
import { formatCurrency, formatDate, cn, getInitials, getBalanceColor } from '../../lib/utils';
import { useAuth } from '../../App';
import AnalyticsTab from './AnalyticsTab';
import { PieChart as PieChartIcon } from 'lucide-react';

type TabType = 'expenses' | 'balances' | 'members' | 'settlements' | 'analytics';

export default function GroupDetail() {
  const { groupId } = useParams<{ groupId: string }>();
  const [activeTab, setActiveTab] = useState<TabType>('expenses');
  const [showExplainer, setShowExplainer] = useState<string | null>(null);
  const [showAddExpense, setShowAddExpense] = useState(false);

  const { data: group, isLoading } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => groupsApi.get(groupId!).then((r) => r.data),
    enabled: !!groupId,
  });

  const { data: expenses } = useQuery({
    queryKey: ['expenses', groupId],
    queryFn: () => expensesApi.list(groupId!, { page: 1, page_size: 50 }).then((r) => r.data),
    enabled: !!groupId && activeTab === 'expenses',
  });

  const { data: balances } = useQuery({
    queryKey: ['balances', groupId],
    queryFn: () => balancesApi.get(groupId!).then((r) => r.data),
    enabled: !!groupId && activeTab === 'balances',
  });

  const { data: explanation } = useQuery({
    queryKey: ['balance-explain', groupId, showExplainer],
    queryFn: () => balancesApi.explain(groupId!, showExplainer!).then((r) => r.data),
    enabled: !!groupId && !!showExplainer,
  });

  const { data: recommendations } = useQuery({
    queryKey: ['settlement-recs', groupId],
    queryFn: () => settlementsApi.getRecommendations(groupId!).then((r) => r.data),
    enabled: !!groupId && activeTab === 'settlements',
  });

  const { data: settlements } = useQuery({
    queryKey: ['settlements', groupId],
    queryFn: () => settlementsApi.list(groupId!).then((r) => r.data),
    enabled: !!groupId && activeTab === 'settlements',
  });

  const tabs: { key: TabType; label: string; icon: any }[] = [
    { key: 'expenses', label: 'Expenses', icon: DollarSign },
    { key: 'balances', label: 'Balances', icon: BarChart3 },
    { key: 'members', label: 'Members', icon: Users },
    { key: 'settlements', label: 'Settlements', icon: ArrowRight },
    { key: 'analytics', label: 'Analytics', icon: PieChartIcon },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!group) return <div className="text-slate-500">Group not found</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{group.name}</h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">
            {group.member_count} members · {formatCurrency(group.total_expenses)} total
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to={`/app/groups/${groupId}/import`}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium px-4 py-2.5 rounded-xl transition-colors text-sm shadow-sm"
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </Link>
          <button
            onClick={() => setShowAddExpense(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl transition-colors text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Expense
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 border border-slate-200 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
              activeTab === tab.key
                ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {/* Expenses Tab */}
          {activeTab === 'expenses' && (
            <div className="space-y-3">
              {expenses?.items && expenses.items.length > 0 ? (
                expenses.items.map((expense: any) => (
                  <div
                    key={expense.id}
                    className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 shadow-sm transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600">
                      {getInitials(expense.payer_name || 'U')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 truncate">{expense.description}</p>
                      <p className="text-xs text-slate-500 mt-0.5 font-medium">
                        Paid by {expense.payer_name} · {formatDate(expense.expense_date)}
                        {expense.category && ` · ${expense.category}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900">{formatCurrency(expense.amount, expense.currency)}</p>
                      <p className="text-xs text-slate-500 font-medium">{expense.split_type} split</p>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={DollarSign}
                  title="No expenses yet"
                  description="Add your first expense or import a CSV file"
                />
              )}
            </div>
          )}

          {/* Balances Tab */}
          {activeTab === 'balances' && (
            <div className="space-y-3">
              {balances && balances.length > 0 ? (
                balances.map((balance: any) => (
                  <div
                    key={balance.user_id}
                    className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 shadow-sm transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600">
                      {getInitials(balance.user_name || 'U')}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-slate-900">{balance.user_name}</p>
                      <p className="text-xs text-slate-500 mt-0.5 font-medium">
                        Paid {formatCurrency(balance.total_paid)} · Owes {formatCurrency(balance.total_owed)}
                      </p>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <p className={cn('font-bold text-lg', getBalanceColor(balance.net_balance))}>
                          {balance.net_balance >= 0 ? '+' : ''}{formatCurrency(balance.net_balance)}
                        </p>
                        <p className="text-xs text-slate-500 font-medium">
                          {balance.net_balance > 0 ? 'is owed' : balance.net_balance < 0 ? 'owes' : 'settled'}
                        </p>
                      </div>
                      <button
                        onClick={() => setShowExplainer(balance.user_id)}
                        className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-blue-600 transition-colors"
                        title="Why?"
                      >
                        <HelpCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={BarChart3}
                  title="No balances to show"
                  description="Add expenses to see balance calculations"
                />
              )}
            </div>
          )}

          {/* Members Tab */}
          {activeTab === 'members' && (
            <div className="space-y-3">
              {group.members?.map((member: any) => (
                <div
                  key={member.id}
                  className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl shadow-sm"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600">
                    {getInitials(member.display_name || member.user_name || 'U')}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900">{member.display_name || member.user_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">{member.user_email} · {member.role}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Joined {formatDate(member.join_date)}</span>
                    </div>
                    {member.leave_date && (
                      <p className="text-xs text-amber-600 mt-0.5 font-medium">Left {formatDate(member.leave_date)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Settlements Tab */}
          {activeTab === 'settlements' && (
            <div className="space-y-6">
              {/* Recommendations */}
              {recommendations && recommendations.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
                    Recommended Settlements
                  </h3>
                  <div className="space-y-3">
                    {recommendations.map((rec: any, i: number) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-100 rounded-xl shadow-sm"
                      >
                        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-sm font-bold text-red-600">
                          {getInitials(rec.from_user_name || 'U')}
                        </div>
                        <div className="flex items-center gap-2">
                          <ArrowRight className="w-5 h-5 text-blue-400" />
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-sm font-bold text-emerald-600">
                          {getInitials(rec.to_user_name || 'U')}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-slate-900">
                            <span className="font-bold">{rec.from_user_name}</span>
                            {' → '}
                            <span className="font-bold">{rec.to_user_name}</span>
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5 font-medium">{rec.explanation}</p>
                        </div>
                        <p className="font-bold text-blue-600 text-lg">
                          {formatCurrency(rec.amount)}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* History */}
              <div>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Settlement History
                </h3>
                {settlements && settlements.length > 0 ? (
                  <div className="space-y-3">
                    {settlements.map((s: any) => (
                      <div
                        key={s.id}
                        className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl shadow-sm"
                      >
                        <div className="flex-1">
                          <p className="font-bold text-slate-900">
                            {s.payer_name} → {s.payee_name}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5 font-medium">
                            {formatDate(s.settlement_date)} {s.notes && `· ${s.notes}`}
                          </p>
                        </div>
                        <p className="font-bold text-slate-900">{formatCurrency(s.amount)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={ArrowRight}
                    title="No settlements recorded"
                    description="Record settlements as members pay each other"
                  />
                )}
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <AnalyticsTab groupId={groupId!} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Balance Explainer Drawer */}
      <AnimatePresence>
        {showExplainer && explanation && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setShowExplainer(null)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 h-full w-full max-w-lg bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Balance Breakdown</h2>
                  <p className="text-sm text-slate-500 font-medium">{explanation.user_name}</p>
                </div>
                <button
                  onClick={() => setShowExplainer(null)}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-500 shadow-sm transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Net Balance */}
                <div className="text-center p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-sm text-slate-500 mb-1 font-bold uppercase tracking-wider">Net Balance</p>
                  <p className={cn('text-4xl font-extrabold', getBalanceColor(explanation.net_balance))}>
                    {explanation.net_balance >= 0 ? '+' : ''}{formatCurrency(explanation.net_balance)}
                  </p>
                  <p className="text-xs text-slate-500 mt-2 font-medium">
                    {explanation.net_balance > 0 ? 'Others owe this person' : explanation.net_balance < 0 ? 'This person owes others' : 'All settled'}
                  </p>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 shadow-sm">
                    <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Total Paid</p>
                    <p className="text-xl font-bold text-emerald-700 mt-1">{formatCurrency(explanation.summary?.total_paid || 0)}</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-xl border border-red-100 shadow-sm">
                    <p className="text-xs text-red-600 font-bold uppercase tracking-wider">Total Owed</p>
                    <p className="text-xl font-bold text-red-700 mt-1">{formatCurrency(explanation.summary?.total_owed || 0)}</p>
                  </div>
                </div>

                {/* Itemized Breakdown */}
                <div>
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">
                    Transaction History
                  </h3>
                  <div className="space-y-3">
                    {explanation.items?.map((item: any, i: number) => (
                      <div
                        key={i}
                        className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                          item.net_effect >= 0 ? 'bg-emerald-100' : 'bg-red-100'
                        )}>
                          {item.net_effect >= 0
                            ? <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                            : <ArrowDownRight className="w-4 h-4 text-red-600" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">{item.description}</p>
                          <p className="text-xs text-slate-500 font-medium">{formatDate(item.date)}</p>
                        </div>
                        <div className="text-right">
                          <p className={cn(
                            'text-sm font-bold',
                            item.net_effect >= 0 ? 'text-emerald-600' : 'text-red-600'
                          )}>
                            {item.net_effect >= 0 ? '+' : ''}{formatCurrency(item.net_effect)}
                          </p>
                          <p className="text-xs text-slate-500 font-medium">
                            Running: {formatCurrency(item.running_total)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add Expense Modal */}
      <AddExpenseModal
        show={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        groupId={groupId!}
        members={group.members || []}
      />
    </div>
  );
}

// Empty state component
function EmptyState({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl shadow-sm">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
        <Icon className="w-7 h-7 text-slate-400" />
      </div>
      <p className="text-slate-900 font-bold">{title}</p>
      <p className="text-sm text-slate-500 mt-1 font-medium">{description}</p>
    </div>
  );
}

// Add Expense Modal
function AddExpenseModal({
  show, onClose, groupId, members
}: {
  show: boolean; onClose: () => void; groupId: string; members: any[];
}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [payerId, setPayerId] = useState(user?.id || '');

  const createExpense = useMutation({
    mutationFn: (data: any) => expensesApi.create(groupId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', groupId] });
      queryClient.invalidateQueries({ queryKey: ['balances', groupId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
      setDescription('');
      setAmount('');
    },
  });

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-md p-6 space-y-5"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Add Expense</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              placeholder="e.g., Groceries"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                placeholder="0.00"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Paid By</label>
            <select
              value={payerId}
              onChange={(e) => setPayerId(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            >
              {members.map((m: any) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.display_name || m.user_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors text-sm font-bold shadow-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => createExpense.mutate({
              description, amount: parseFloat(amount), expense_date: date, payer_id: payerId,
            })}
            disabled={!description || !amount || createExpense.isPending}
            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 rounded-xl text-white text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            {createExpense.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Expense'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
