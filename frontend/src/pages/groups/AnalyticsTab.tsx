import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { reportsApi } from '../../services/api';
import { formatCurrency } from '../../lib/utils';
import { Loader2, TrendingUp, PieChart as PieChartIcon, Users } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function AnalyticsTab({ groupId }: { groupId: string }) {
  const { data: trends, isLoading: loadingTrends } = useQuery({
    queryKey: ['report-trends', groupId],
    queryFn: () => reportsApi.monthlyTrends(groupId).then((r) => r.data),
    enabled: !!groupId,
  });

  const { data: categories, isLoading: loadingCategories } = useQuery({
    queryKey: ['report-categories', groupId],
    queryFn: () => reportsApi.categories(groupId).then((r) => r.data),
    enabled: !!groupId,
  });

  const { data: contributions, isLoading: loadingContributions } = useQuery({
    queryKey: ['report-contributions', groupId],
    queryFn: () => reportsApi.contributions(groupId).then((r) => r.data),
    enabled: !!groupId,
  });

  if (loadingTrends || loadingCategories || loadingContributions) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  // Format trends data for Recharts
  const formattedTrends = trends?.map((t: any) => ({
    month: t.month,
    total: parseFloat(t.total_amount),
    count: t.expense_count,
  })) || [];

  // Format categories data for Recharts
  const formattedCategories = categories?.map((c: any) => ({
    name: c.category || 'Uncategorized',
    value: parseFloat(c.total_amount),
  })) || [];

  // Format contributions data for Recharts
  const formattedContributions = contributions?.map((c: any) => ({
    name: c.user_name,
    paid: parseFloat(c.total_paid),
    share: parseFloat(c.total_share),
  })) || [];

  return (
    <div className="space-y-6">
      {/* Monthly Trends */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Monthly Spending Trends</h3>
        </div>
        
        {formattedTrends.length > 0 ? (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={formattedTrends} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis 
                  tickFormatter={(val) => `₹${val}`} 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <Tooltip 
                  formatter={(value: any) => [formatCurrency(Number(value)), 'Total']}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#3b82f6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-slate-500 text-center py-8">No trend data available yet.</p>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <PieChartIcon className="w-4 h-4 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Expenses by Category</h3>
          </div>
          
          {formattedCategories.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={formattedCategories}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {formattedCategories.map((_entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => formatCurrency(Number(value))}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-8">No category data available yet.</p>
          )}
        </div>

        {/* Member Contributions */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
              <Users className="w-4 h-4 text-purple-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Member Contributions</h3>
          </div>
          
          {formattedContributions.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={formattedContributions} margin={{ top: 5, right: 0, bottom: 5, left: 0 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={true} vertical={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip 
                    formatter={(value: any) => formatCurrency(Number(value))}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  <Bar dataKey="paid" name="Paid" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={12} />
                  <Bar dataKey="share" name="Share" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-8">No member data available yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
