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

type TabType = 'expenses' | 'balances' | 'members' | 'settlements';

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
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (!group) return <div className="text-gray-400">Group not found</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{group.name}</h1>
          <p className="text-gray-400 mt-1 text-sm">
            {group.member_count} members · {formatCurrency(group.total_expenses)} total
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to={`/app/groups/${groupId}/import`}
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium px-4 py-2.5 rounded-xl transition-colors text-sm"
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </Link>
          <button
            onClick={() => setShowAddExpense(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2.5 rounded-xl transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Expense
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/[0.02] rounded-xl p-1 border border-white/5 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
              activeTab === tab.key
                ? 'bg-indigo-600/10 text-indigo-400'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
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
                    className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:border-white/10 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600/20 to-purple-600/20 flex items-center justify-center text-sm font-semibold text-indigo-300">
                      {getInitials(expense.payer_name || 'U')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{expense.description}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Paid by {expense.payer_name} · {formatDate(expense.expense_date)}
                        {expense.category && ` · ${expense.category}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-white">{formatCurrency(expense.amount, expense.currency)}</p>
                      <p className="text-xs text-gray-500">{expense.split_type} split</p>
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
                    className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:border-white/10 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600/20 to-purple-600/20 flex items-center justify-center text-sm font-semibold text-indigo-300">
                      {getInitials(balance.user_name || 'U')}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-white">{balance.user_name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Paid {formatCurrency(balance.total_paid)} · Owes {formatCurrency(balance.total_owed)}
                      </p>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <p className={cn('font-semibold text-lg', getBalanceColor(balance.net_balance))}>
                          {balance.net_balance >= 0 ? '+' : ''}{formatCurrency(balance.net_balance)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {balance.net_balance > 0 ? 'is owed' : balance.net_balance < 0 ? 'owes' : 'settled'}
                        </p>
                      </div>
                      <button
                        onClick={() => setShowExplainer(balance.user_id)}
                        className="w-8 h-8 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 flex items-center justify-center text-indigo-400 transition-colors"
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
                  className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-xl"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600/20 to-purple-600/20 flex items-center justify-center text-sm font-semibold text-indigo-300">
                    {getInitials(member.display_name || member.user_name || 'U')}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white">{member.display_name || member.user_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{member.user_email} · {member.role}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Joined {formatDate(member.join_date)}</span>
                    </div>
                    {member.leave_date && (
                      <p className="text-xs text-amber-400 mt-0.5">Left {formatDate(member.leave_date)}</p>
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
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    Recommended Settlements
                  </h3>
                  <div className="space-y-3">
                    {recommendations.map((rec: any, i: number) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-4 p-4 bg-indigo-600/5 border border-indigo-500/10 rounded-xl"
                      >
                        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-sm font-semibold text-red-300">
                          {getInitials(rec.from_user_name || 'U')}
                        </div>
                        <div className="flex items-center gap-2">
                          <ArrowRight className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-sm font-semibold text-emerald-300">
                          {getInitials(rec.to_user_name || 'U')}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-white">
                            <span className="font-medium">{rec.from_user_name}</span>
                            {' → '}
                            <span className="font-medium">{rec.to_user_name}</span>
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">{rec.explanation}</p>
                        </div>
                        <p className="font-semibold text-indigo-400 text-lg">
                          {formatCurrency(rec.amount)}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* History */}
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Settlement History
                </h3>
                {settlements && settlements.length > 0 ? (
                  <div className="space-y-3">
                    {settlements.map((s: any) => (
                      <div
                        key={s.id}
                        className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-xl"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-white">
                            {s.payer_name} → {s.payee_name}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {formatDate(s.settlement_date)} {s.notes && `· ${s.notes}`}
                          </p>
                        </div>
                        <p className="font-semibold text-white">{formatCurrency(s.amount)}</p>
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
              className="fixed right-0 top-0 h-full w-full max-w-lg bg-[#111827] border-l border-white/10 z-50 flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-white/5">
                <div>
                  <h2 className="text-lg font-bold text-white">Balance Breakdown</h2>
                  <p className="text-sm text-gray-400">{explanation.user_name}</p>
                </div>
                <button
                  onClick={() => setShowExplainer(null)}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Net Balance */}
                <div className="text-center p-6 bg-white/[0.02] rounded-xl border border-white/5">
                  <p className="text-sm text-gray-400 mb-1">Net Balance</p>
                  <p className={cn('text-3xl font-bold', getBalanceColor(explanation.net_balance))}>
                    {explanation.net_balance >= 0 ? '+' : ''}{formatCurrency(explanation.net_balance)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {explanation.net_balance > 0 ? 'Others owe this person' : explanation.net_balance < 0 ? 'This person owes others' : 'All settled'}
                  </p>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-white/[0.02] rounded-lg border border-white/5">
                    <p className="text-xs text-gray-500">Total Paid</p>
                    <p className="text-lg font-semibold text-emerald-400">{formatCurrency(explanation.summary?.total_paid || 0)}</p>
                  </div>
                  <div className="p-3 bg-white/[0.02] rounded-lg border border-white/5">
                    <p className="text-xs text-gray-500">Total Owed</p>
                    <p className="text-lg font-semibold text-red-400">{formatCurrency(explanation.summary?.total_owed || 0)}</p>
                  </div>
                </div>

                {/* Itemized Breakdown */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    Transaction History
                  </h3>
                  <div className="space-y-2">
                    {explanation.items?.map((item: any, i: number) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-lg border border-white/5"
                      >
                        <div className={cn(
                          'w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0',
                          item.net_effect >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'
                        )}>
                          {item.net_effect >= 0
                            ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                            : <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{item.description}</p>
                          <p className="text-xs text-gray-500">{formatDate(item.date)}</p>
                        </div>
                        <div className="text-right">
                          <p className={cn(
                            'text-sm font-medium',
                            item.net_effect >= 0 ? 'text-emerald-400' : 'text-red-400'
                          )}>
                            {item.net_effect >= 0 ? '+' : ''}{formatCurrency(item.net_effect)}
                          </p>
                          <p className="text-xs text-gray-600">
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
    <div className="text-center py-16">
      <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
        <Icon className="w-7 h-7 text-gray-600" />
      </div>
      <p className="text-gray-400 font-medium">{title}</p>
      <p className="text-sm text-gray-600 mt-1">{description}</p>
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
        className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-5"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Add Expense</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="e.g., Groceries"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Amount</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="0.00"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Paid By</label>
            <select
              value={payerId}
              onChange={(e) => setPayerId(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500 transition-colors"
            >
              {members.map((m: any) => (
                <option key={m.user_id} value={m.user_id} className="bg-[#111827]">
                  {m.display_name || m.user_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-white/10 rounded-xl text-gray-300 hover:bg-white/5 transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={() => createExpense.mutate({
              description, amount: parseFloat(amount), expense_date: date, payer_id: payerId,
            })}
            disabled={!description || !amount || createExpense.isPending}
            className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 rounded-xl text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {createExpense.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Expense'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
