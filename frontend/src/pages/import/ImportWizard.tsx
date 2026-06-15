import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileText, Users, AlertTriangle, CheckCircle2, ArrowRight,
  ArrowLeft, Loader2, X, Calendar, ChevronDown,
  FileCheck, AlertCircle, Info, Check
} from 'lucide-react';
import { importsApi } from '../../services/api';
import { cn, formatDate, getSeverityColor } from '../../lib/utils';

type WizardStep = 'upload' | 'mapping' | 'membership' | 'anomalies' | 'confirm' | 'report';

const stepLabels: Record<WizardStep, { label: string; icon: any }> = {
  upload: { label: 'Upload', icon: Upload },
  mapping: { label: 'Columns', icon: FileText },
  membership: { label: 'Members', icon: Users },
  anomalies: { label: 'Anomalies', icon: AlertTriangle },
  confirm: { label: 'Confirm', icon: CheckCircle2 },
  report: { label: 'Report', icon: FileCheck },
};

const stepOrder: WizardStep[] = ['upload', 'mapping', 'membership', 'anomalies', 'confirm', 'report'];

export default function ImportWizard() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [currentStep, setCurrentStep] = useState<WizardStep>('upload');
  const [importId, setImportId] = useState<string | null>(null);
  const [uploadData, setUploadData] = useState<any>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [dragActive, setDragActive] = useState(false);

  // ---- Upload step ----
  const uploadMutation = useMutation({
    mutationFn: (file: File) => importsApi.upload(groupId!, file),
    onSuccess: (res) => {
      setUploadData(res.data);
      setImportId(res.data.import_id);
      setCurrentStep('mapping');
    },
  });

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith('.csv')) {
      uploadMutation.mutate(file);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
  };

  // ---- Mapping step ----
  const mappingMutation = useMutation({
    mutationFn: (mapping: any) => importsApi.updateMapping(groupId!, importId!, mapping),
    onSuccess: () => setCurrentStep('membership'),
  });

  // ---- Membership step ----
  const { data: membershipSuggestions, isLoading: membershipLoading } = useQuery({
    queryKey: ['membership', importId],
    queryFn: () => importsApi.getMembership(groupId!, importId!).then((r) => r.data),
    enabled: !!importId && currentStep === 'membership',
  });

  const confirmMembership = useMutation({
    mutationFn: (data: any) => importsApi.confirmMembership(groupId!, importId!, data),
    onSuccess: () => setCurrentStep('anomalies'),
  });

  // ---- Anomalies step ----
  const { data: anomalyData, isLoading: anomaliesLoading } = useQuery({
    queryKey: ['anomalies', importId],
    queryFn: () => importsApi.getAnomalies(groupId!, importId!).then((r) => r.data),
    enabled: !!importId && currentStep === 'anomalies',
  });

  const resolveAnomaly = useMutation({
    mutationFn: ({ anomalyId, data }: { anomalyId: string; data: any }) =>
      importsApi.resolveAnomaly(groupId!, importId!, anomalyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anomalies', importId] });
    },
  });

  // ---- Execute step ----
  const executeMutation = useMutation({
    mutationFn: () => importsApi.execute(groupId!, importId!),
    onSuccess: (res) => {
      setImportResult(res.data);
      setCurrentStep('report');
      queryClient.invalidateQueries({ queryKey: ['expenses', groupId] });
      queryClient.invalidateQueries({ queryKey: ['balances', groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });

  const currentIdx = stepOrder.indexOf(currentStep);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Import CSV</h1>
          <p className="text-gray-400 mt-1">Upload and review expense data</p>
        </div>
        <button
          onClick={() => navigate(`/app/groups/${groupId}`)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {stepOrder.map((step, i) => {
          const { label, icon: Icon } = stepLabels[step];
          const isActive = i === currentIdx;
          const isCompleted = i < currentIdx;

          return (
            <div key={step} className="flex items-center gap-2">
              <div
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                  isActive && 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20',
                  isCompleted && 'text-emerald-400',
                  !isActive && !isCompleted && 'text-gray-600'
                )}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
                {label}
              </div>
              {i < stepOrder.length - 1 && (
                <ChevronDown className={cn(
                  'w-4 h-4 -rotate-90 flex-shrink-0',
                  i < currentIdx ? 'text-emerald-400' : 'text-gray-700'
                )} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {/* Upload Step */}
          {currentStep === 'upload' && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              className={cn(
                'border-2 border-dashed rounded-2xl p-16 text-center transition-all duration-200',
                dragActive ? 'border-indigo-500 bg-indigo-500/5' : 'border-white/10 hover:border-white/20',
                uploadMutation.isPending && 'pointer-events-none opacity-50'
              )}
            >
              {uploadMutation.isPending ? (
                <div className="space-y-4">
                  <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mx-auto" />
                  <p className="text-gray-300 font-medium">Analyzing your CSV...</p>
                </div>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-lg font-medium text-white mb-2">Drop your CSV file here</p>
                  <p className="text-sm text-gray-500 mb-6">or click to browse</p>
                  <label className="cursor-pointer inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 py-3 rounded-xl transition-colors text-sm">
                    <FileText className="w-4 h-4" />
                    Choose File
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                </>
              )}
              {uploadMutation.isError && (
                <p className="text-red-400 text-sm mt-4">
                  {(uploadMutation.error as any)?.response?.data?.detail || 'Upload failed'}
                </p>
              )}
            </div>
          )}

          {/* Column Mapping Step */}
          {currentStep === 'mapping' && uploadData && (
            <div className="space-y-6">
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-1">Column Mapping</h3>
                <p className="text-sm text-gray-400 mb-6">
                  We auto-detected your columns. Review and adjust if needed.
                </p>

                <div className="grid gap-4">
                  {Object.entries(uploadData.suggested_mapping || {}).map(([field, col]: [string, any]) => (
                    <div key={field} className="flex items-center gap-4">
                      <label className="w-32 text-sm font-medium text-gray-300 capitalize">
                        {field.replace(/_/g, ' ')}
                      </label>
                      <select
                        defaultValue={col || ''}
                        className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                      >
                        <option value="" className="bg-[#111827]">— Not mapped —</option>
                        {uploadData.columns?.map((c: string) => (
                          <option key={c} value={c} className="bg-[#111827]">{c}</option>
                        ))}
                      </select>
                      {col && <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                    </div>
                  ))}
                </div>

                {/* Preview */}
                <div className="mt-6 pt-6 border-t border-white/5">
                  <h4 className="text-sm font-semibold text-gray-400 mb-3">Preview ({uploadData.total_rows} rows)</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/5">
                          {uploadData.columns?.slice(0, 6).map((col: string) => (
                            <th key={col} className="text-left py-2 px-3 text-gray-500 font-medium">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {uploadData.preview?.slice(0, 5).map((row: any, i: number) => (
                          <tr key={i} className="border-b border-white/5">
                            {uploadData.columns?.slice(0, 6).map((col: string) => (
                              <td key={col} className="py-2 px-3 text-gray-300 truncate max-w-[150px]">
                                {row[col] || '—'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentStep('upload')}
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={() => mappingMutation.mutate(uploadData.suggested_mapping)}
                  disabled={mappingMutation.isPending}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 py-2.5 rounded-xl transition-colors text-sm"
                >
                  {mappingMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Continue'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Membership Review Step */}
          {currentStep === 'membership' && (
            <div className="space-y-6">
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-1">Membership Review</h3>
                <p className="text-sm text-gray-400 mb-6">
                  Review detected members and their suggested join/leave dates.
                </p>

                {membershipLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-6 h-6 text-indigo-400 animate-spin mx-auto" />
                    <p className="text-gray-400 mt-2">Analyzing member activity...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {membershipSuggestions?.detected_members?.map((member: any, i: number) => (
                      <motion.div
                        key={member.name}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="p-4 bg-white/[0.02] border border-white/5 rounded-xl"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600/20 to-purple-600/20 flex items-center justify-center text-sm font-semibold text-indigo-300">
                              {member.name?.charAt(0) || '?'}
                            </div>
                            <div>
                              <p className="font-medium text-white">{member.name}</p>
                              <p className="text-xs text-gray-500">
                                {member.total_activities} activities
                                {member.is_new_user && (
                                  <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px]">New</span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">
                              First seen: {member.first_appearance ? formatDate(member.first_appearance) : '—'}
                            </p>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-gray-500" />
                              <input
                                type="date"
                                defaultValue={member.suggested_join_date || ''}
                                className="flex-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                              />
                            </div>
                            <p className="text-[10px] text-emerald-400 mt-1">Suggested join date</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">
                              Last seen: {member.last_appearance ? formatDate(member.last_appearance) : '—'}
                            </p>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-gray-500" />
                              <input
                                type="date"
                                defaultValue={member.suggested_leave_date || ''}
                                className="flex-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                                placeholder="Active"
                              />
                            </div>
                            <p className="text-[10px] text-amber-400 mt-1">
                              {member.suggested_leave_date ? 'Suggested leave date' : 'Still active'}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentStep('mapping')}
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={() => {
                    const members = membershipSuggestions?.detected_members?.map((m: any) => ({
                      name: m.name,
                      user_id: m.matched_user_id,
                      join_date: m.suggested_join_date,
                      leave_date: m.suggested_leave_date,
                      create_account: m.is_new_user,
                    })) || [];
                    confirmMembership.mutate({ members });
                  }}
                  disabled={confirmMembership.isPending}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 py-2.5 rounded-xl transition-colors text-sm"
                >
                  {confirmMembership.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Members'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Anomaly Review Step */}
          {currentStep === 'anomalies' && (
            <div className="space-y-6">
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Anomaly Review</h3>
                    <p className="text-sm text-gray-400">Review and resolve detected issues</p>
                  </div>
                  {anomalyData && (
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1 text-red-400">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {anomalyData.filter((a: any) => a.severity === 'error').length} errors
                      </span>
                      <span className="flex items-center gap-1 text-amber-400">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {anomalyData.filter((a: any) => a.severity === 'warning').length} warnings
                      </span>
                      <span className="flex items-center gap-1 text-blue-400">
                        <Info className="w-3.5 h-3.5" />
                        {anomalyData.filter((a: any) => a.severity === 'info').length} info
                      </span>
                    </div>
                  )}
                </div>

                {anomaliesLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-6 h-6 text-indigo-400 animate-spin mx-auto" />
                    <p className="text-gray-400 mt-2">Running anomaly detection...</p>
                  </div>
                ) : anomalyData && anomalyData.length > 0 ? (
                  <div className="space-y-3">
                    {anomalyData.map((anomaly: any, i: number) => (
                      <motion.div
                        key={anomaly.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className={cn(
                          'p-4 rounded-xl border',
                          anomaly.resolution ? 'bg-white/[0.01] border-white/5 opacity-60' : 'bg-white/[0.02] border-white/5',
                          getSeverityColor(anomaly.severity)
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
                            anomaly.severity === 'error' ? 'bg-red-500/10' :
                            anomaly.severity === 'warning' ? 'bg-amber-500/10' : 'bg-blue-500/10'
                          )}>
                            {anomaly.severity === 'error' ? <AlertCircle className="w-4 h-4 text-red-400" /> :
                             anomaly.severity === 'warning' ? <AlertTriangle className="w-4 h-4 text-amber-400" /> :
                             <Info className="w-4 h-4 text-blue-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={cn(
                                'text-xs font-semibold uppercase',
                                anomaly.severity === 'error' ? 'text-red-400' :
                                anomaly.severity === 'warning' ? 'text-amber-400' : 'text-blue-400'
                              )}>
                                {anomaly.anomaly_type.replace(/_/g, ' ')}
                              </span>
                              {anomaly.row_number > 0 && (
                                <span className="text-xs text-gray-500">Row {anomaly.row_number}</span>
                              )}
                              {anomaly.resolution && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                                  ✓ {anomaly.resolution.replace(/_/g, ' ')}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-300">{anomaly.explanation}</p>

                            {/* Action buttons */}
                            {!anomaly.resolution && anomaly.suggested_action?.options && (
                              <div className="flex items-center gap-2 mt-3">
                                {anomaly.suggested_action.options.map((option: string) => (
                                  <button
                                    key={option}
                                    onClick={() => resolveAnomaly.mutate({
                                      anomalyId: anomaly.id,
                                      data: { resolution: option },
                                    })}
                                    className={cn(
                                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                                      option === anomaly.suggested_action.default
                                        ? 'bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/20'
                                        : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
                                    )}
                                  >
                                    {option.replace(/_/g, ' ')}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                    <p className="text-white font-medium">No anomalies detected!</p>
                    <p className="text-sm text-gray-400 mt-1">Your data looks clean and ready to import.</p>
                  </div>
                )}
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentStep('membership')}
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={() => setCurrentStep('confirm')}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 py-2.5 rounded-xl transition-colors text-sm"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Confirmation Step */}
          {currentStep === 'confirm' && (
            <div className="space-y-6">
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-indigo-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Ready to Import</h3>
                <p className="text-gray-400 max-w-md mx-auto">
                  Your data has been reviewed and anomalies resolved.
                  Click "Import Now" to create expense and settlement records.
                </p>

                <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto pt-4">
                  <div className="p-3 bg-white/[0.02] rounded-lg border border-white/5">
                    <p className="text-2xl font-bold text-white">{uploadData?.total_rows || 0}</p>
                    <p className="text-xs text-gray-500">Total Rows</p>
                  </div>
                  <div className="p-3 bg-white/[0.02] rounded-lg border border-white/5">
                    <p className="text-2xl font-bold text-amber-400">
                      {anomalyData?.filter((a: any) => !a.resolution && a.severity === 'warning').length || 0}
                    </p>
                    <p className="text-xs text-gray-500">Warnings</p>
                  </div>
                  <div className="p-3 bg-white/[0.02] rounded-lg border border-white/5">
                    <p className="text-2xl font-bold text-emerald-400">
                      {anomalyData?.filter((a: any) => a.resolution).length || 0}
                    </p>
                    <p className="text-xs text-gray-500">Resolved</p>
                  </div>
                </div>

                <button
                  onClick={() => executeMutation.mutate()}
                  disabled={executeMutation.isPending}
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors mt-4"
                >
                  {executeMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      Import Now
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="flex justify-start">
                <button
                  onClick={() => setCurrentStep('anomalies')}
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Anomalies
                </button>
              </div>
            </div>
          )}

          {/* Report Step */}
          {currentStep === 'report' && importResult && (
            <div className="space-y-6">
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-8 text-center space-y-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 15 }}
                  className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto"
                >
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                </motion.div>

                <div>
                  <h3 className="text-2xl font-bold text-white">Import Complete!</h3>
                  <p className="text-gray-400 mt-1">Your data has been successfully imported</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-lg mx-auto">
                  <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5">
                    <p className="text-3xl font-bold text-white">{importResult.imported_rows}</p>
                    <p className="text-xs text-gray-500 mt-1">Imported</p>
                  </div>
                  <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5">
                    <p className="text-3xl font-bold text-indigo-400">{importResult.expenses_created}</p>
                    <p className="text-xs text-gray-500 mt-1">Expenses</p>
                  </div>
                  <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5">
                    <p className="text-3xl font-bold text-purple-400">{importResult.settlements_created}</p>
                    <p className="text-xs text-gray-500 mt-1">Settlements</p>
                  </div>
                  <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5">
                    <p className="text-3xl font-bold text-amber-400">{importResult.skipped_rows}</p>
                    <p className="text-xs text-gray-500 mt-1">Skipped</p>
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/app/groups/${groupId}`)}
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors"
                >
                  View Group
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
