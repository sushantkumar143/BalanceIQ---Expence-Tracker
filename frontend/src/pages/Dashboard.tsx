import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  DollarSign, Users, Wallet, Clock, Plus, ArrowUpRight,
  ArrowDownRight, BarChart3, Loader2
} from 'lucide-react';
import { dashboardApi, groupsApi } from '../services/api';
import { formatCurrency, formatDate, cn } from '../lib/utils';

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.getMetrics().then((r) => r.data),
  });

  const { data: groups } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupsApi.list().then((r) => r.data),
  });

  const createGroup = useMutation({
    mutationFn: (data: { name: string; description: string }) =>
      groupsApi.create(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setShowCreateGroup(false);
      setNewGroupName('');
      setNewGroupDesc('');
      navigate(`/app/groups/${res.data.id}`);
    },
  });

  const statCards = [
    {
      label: 'Total Expenses',
      value: formatCurrency(metrics?.total_expenses || 0),
      icon: DollarSign,
      color: 'from-indigo-500 to-blue-600',
      change: '+12.5%',
      positive: true,
    },
    {
      label: 'Active Groups',
      value: metrics?.total_groups || 0,
      icon: Users,
      color: 'from-purple-500 to-violet-600',
    },
    {
      label: 'Open Balances',
      value: formatCurrency(metrics?.open_balances || 0),
      icon: Wallet,
      color: 'from-amber-500 to-orange-600',
    },
    {
      label: 'Pending Imports',
      value: metrics?.pending_imports || 0,
      icon: Clock,
      color: 'from-emerald-500 to-teal-600',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">Overview of your shared expenses</p>
        </div>
        <button
          onClick={() => setShowCreateGroup(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-xl transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          New Group
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-300 shadow-sm transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-sm`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              {stat.change && (
                <span className={cn(
                  'text-xs font-medium flex items-center gap-0.5',
                  stat.positive ? 'text-emerald-600' : 'text-red-600'
                )}>
                  {stat.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {stat.change}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Groups */}
        <div className="lg:col-span-2 bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Your Groups</h2>
            <button
              onClick={() => setShowCreateGroup(true)}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Create
            </button>
          </div>

          {groups && groups.length > 0 ? (
            <div className="space-y-3">
              {groups.map((group: any) => (
                <Link
                  key={group.id}
                  to={`/app/groups/${group.id}`}
                  className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
                >
                  <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-600 flex-shrink-0">
                    {group.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{group.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {group.member_count} members · {formatCurrency(group.total_expenses)}
                    </p>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <Users className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-slate-900 font-medium">No groups yet</p>
              <p className="text-sm text-slate-500 mt-1">Create your first group to get started</p>
              <button
                onClick={() => setShowCreateGroup(true)}
                className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                + Create Group
              </button>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">Recent Activity</h2>

          {metrics?.recent_activity && metrics.recent_activity.length > 0 ? (
            <div className="space-y-4">
              {metrics.recent_activity.slice(0, 8).map((activity: any) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 truncate">{activity.description}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {formatCurrency(activity.amount, activity.currency)} · {formatDate(activity.date)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <BarChart3 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No activity yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Monthly Spending Chart */}
      {metrics?.monthly_spending && metrics.monthly_spending.length > 0 && (
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">Monthly Spending</h2>
          <div className="h-48 flex items-end gap-2">
            {metrics.monthly_spending.map((m: any, i: number) => {
              const maxTotal = Math.max(...metrics.monthly_spending.map((x: any) => x.total));
              const height = maxTotal > 0 ? (m.total / maxTotal) * 100 : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-xs text-slate-500">{formatCurrency(m.total)}</span>
                  <div
                    className="w-full bg-blue-500 rounded-t-md transition-all duration-500"
                    style={{ height: `${Math.max(height, 4)}%` }}
                  />
                  <span className="text-xs text-slate-400">{m.month?.split('-')[1]}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-slate-200 shadow-xl rounded-2xl w-full max-w-md p-6 space-y-5"
          >
            <h2 className="text-xl font-bold text-slate-900">Create New Group</h2>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Group Name</label>
              <input
                id="create-group-name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                placeholder="e.g., Flat 4B Expenses"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Description (optional)</label>
              <textarea
                id="create-group-desc"
                value={newGroupDesc}
                onChange={(e) => setNewGroupDesc(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none h-20"
                placeholder="Brief description..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowCreateGroup(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                id="create-group-submit"
                onClick={() => createGroup.mutate({ name: newGroupName, description: newGroupDesc })}
                disabled={!newGroupName.trim() || createGroup.isPending}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 rounded-xl text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {createGroup.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Group'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
