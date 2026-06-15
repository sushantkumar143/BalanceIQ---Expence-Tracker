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
import { cn, formatDate } from '../../lib/utils';

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
          <h1 className="text-2xl font-bold text-slate-900">Import CSV</h1>
          <p className="text-slate-500 mt-1 font-medium">Upload and review expense data</p>
        </div>
        <button
          onClick={() => navigate(`/app/groups/${groupId}`)}
          className="text-slate-400 hover:text-slate-600 transition-colors"
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
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all',
                  isActive && 'bg-blue-50 text-blue-600 border border-blue-200 shadow-sm',
                  isCompleted && 'text-emerald-600',
                  !isActive && !isCompleted && 'text-slate-500 font-medium'
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
                  i < currentIdx ? 'text-emerald-500' : 'text-slate-300'
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
                'border-2 border-dashed rounded-2xl p-16 text-center transition-all duration-200 bg-white shadow-sm',
                dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300',
                uploadMutation.isPending && 'pointer-events-none opacity-50'
              )}
            >
              {uploadMutation.isPending ? (
                <div className="space-y-4">
                  <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
                  <p className="text-slate-600 font-bold">Analyzing your CSV...</p>
                </div>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-lg font-bold text-slate-900 mb-2">Drop your CSV file here</p>
                  <p className="text-sm text-slate-500 mb-6 font-medium">or click to browse</p>
                  <label className="cursor-pointer inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm shadow-sm">
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
                <p className="text-red-500 text-sm mt-4 font-bold">
                  {(uploadMutation.error as any)?.response?.data?.detail || 'Upload failed'}
                </p>
              )}
            </div>
          )}

          {/* Column Mapping Step */}
          {currentStep === 'mapping' && uploadData && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-1">Column Mapping</h3>
                <p className="text-sm text-slate-500 mb-6 font-medium">
                  We auto-detected your columns. Review and adjust if needed.
                </p>

                <div className="grid gap-4">
                  {Object.entries(uploadData.suggested_mapping || {}).map(([field, col]: [string, any]) => (
                    <div key={field} className="flex items-center gap-4">
                      <label className="w-32 text-sm font-bold text-slate-700 capitalize">
                        {field.replace(/_/g, ' ')}
                      </label>
                      <select
                        defaultValue={col || ''}
                        className="flex-1 px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-blue-500 transition-colors shadow-sm"
                      >
                        <option value="" className="bg-white text-slate-500">— Not mapped —</option>
                        {uploadData.columns?.map((c: string) => (
                          <option key={c} value={c} className="bg-white">{c}</option>
                        ))}
                      </select>
                      {col && <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                    </div>
                  ))}
                </div>

                {/* Preview */}
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <h4 className="text-sm font-bold text-slate-500 mb-3 uppercase tracking-wider">Preview ({uploadData.total_rows} rows)</h4>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr className="border-b border-slate-200">
                          {uploadData.columns?.slice(0, 6).map((col: string) => (
                            <th key={col} className="text-left py-3 px-4 text-slate-600 font-bold">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {uploadData.preview?.slice(0, 5).map((row: any, i: number) => (
                          <tr key={i} className="border-b border-slate-100 last:border-0">
                            {uploadData.columns?.slice(0, 6).map((col: string) => (
                              <td key={col} className="py-2.5 px-4 text-slate-700 font-medium truncate max-w-[150px]">
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
                  className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-bold"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={() => mappingMutation.mutate(uploadData.suggested_mapping)}
                  disabled={mappingMutation.isPending}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl transition-colors text-sm shadow-sm"
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
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-1">Membership Review</h3>
                <p className="text-sm text-slate-500 mb-6 font-medium">
                  Review detected members and their suggested join/leave dates.
                </p>

                {membershipLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin mx-auto" />
                    <p className="text-slate-500 mt-2 font-medium">Analyzing member activity...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {membershipSuggestions?.detected_members?.map((member: any, i: number) => (
                      <motion.div
                        key={member.name}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="p-4 bg-slate-50 border border-slate-200 rounded-xl shadow-sm"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600">
                              {member.name?.charAt(0) || '?'}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{member.name}</p>
                              <p className="text-xs text-slate-500 font-medium">
                                {member.total_activities} activities
                                {member.is_new_user && (
                                  <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold text-[10px] uppercase tracking-wider">New</span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-200 pt-4">
                          <div>
                            <p className="text-xs text-slate-500 mb-1 font-medium">
                              First seen: {member.first_appearance ? formatDate(member.first_appearance) : '—'}
                            </p>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-slate-400" />
                              <input
                                type="date"
                                defaultValue={member.suggested_join_date || ''}
                                className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs font-medium focus:outline-none focus:border-blue-500 transition-colors shadow-sm"
                              />
                            </div>
                            <p className="text-[10px] text-emerald-600 font-bold mt-1 uppercase tracking-wider">Suggested join date</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-1 font-medium">
                              Last seen: {member.last_appearance ? formatDate(member.last_appearance) : '—'}
                            </p>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-slate-400" />
                              <input
                                type="date"
                                defaultValue={member.suggested_leave_date || ''}
                                className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs font-medium focus:outline-none focus:border-blue-500 transition-colors shadow-sm"
                                placeholder="Active"
                              />
                            </div>
                            <p className="text-[10px] text-amber-600 font-bold mt-1 uppercase tracking-wider">
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
                  className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-bold"
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
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl transition-colors text-sm shadow-sm"
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
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Anomaly Review</h3>
                    <p className="text-sm text-slate-500 font-medium">Review and resolve detected issues</p>
                  </div>
                  {anomalyData && (
                    <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-wider">
                      <span className="flex items-center gap-1 text-red-600">
                        <AlertCircle className="w-4 h-4" />
                        {anomalyData.filter((a: any) => a.severity === 'error').length} errors
                      </span>
                      <span className="flex items-center gap-1 text-amber-600">
                        <AlertTriangle className="w-4 h-4" />
                        {anomalyData.filter((a: any) => a.severity === 'warning').length} warnings
                      </span>
                      <span className="flex items-center gap-1 text-blue-600">
                        <Info className="w-4 h-4" />
                        {anomalyData.filter((a: any) => a.severity === 'info').length} info
                      </span>
                    </div>
                  )}
                </div>

                {anomaliesLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin mx-auto" />
                    <p className="text-slate-500 mt-2 font-medium">Running anomaly detection...</p>
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
                          'p-4 rounded-xl border shadow-sm transition-all',
                          anomaly.resolution ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-slate-200 hover:shadow-md'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
                            anomaly.severity === 'error' ? 'bg-red-100' :
                            anomaly.severity === 'warning' ? 'bg-amber-100' : 'bg-blue-100'
                          )}>
                            {anomaly.severity === 'error' ? <AlertCircle className="w-4 h-4 text-red-600" /> :
                             anomaly.severity === 'warning' ? <AlertTriangle className="w-4 h-4 text-amber-600" /> :
                             <Info className="w-4 h-4 text-blue-600" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={cn(
                                'text-xs font-bold uppercase tracking-wider',
                                anomaly.severity === 'error' ? 'text-red-600' :
                                anomaly.severity === 'warning' ? 'text-amber-600' : 'text-blue-600'
                              )}>
                                {anomaly.anomaly_type.replace(/_/g, ' ')}
                              </span>
                              {anomaly.row_number > 0 && (
                                <span className="text-xs text-slate-500 font-medium">Row {anomaly.row_number}</span>
                              )}
                              {anomaly.resolution && (
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                  ✓ {anomaly.resolution.replace(/_/g, ' ')}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-700 font-medium">{anomaly.explanation}</p>

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
                                      'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm',
                                      option === anomaly.suggested_action.default
                                        ? 'bg-blue-600 text-white hover:bg-blue-700 border border-blue-600'
                                        : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-300'
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
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                    <p className="text-slate-900 font-bold">No anomalies detected!</p>
                    <p className="text-sm text-slate-500 mt-1 font-medium">Your data looks clean and ready to import.</p>
                  </div>
                )}
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentStep('membership')}
                  className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-bold"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={() => setCurrentStep('confirm')}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl transition-colors text-sm shadow-sm"
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
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4 shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Ready to Import</h3>
                <p className="text-slate-500 max-w-md mx-auto font-medium">
                  Your data has been reviewed and anomalies resolved.
                  Click "Import Now" to create expense and settlement records.
                </p>

                <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto pt-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-2xl font-extrabold text-slate-900">{uploadData?.total_rows || 0}</p>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Total Rows</p>
                  </div>
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 shadow-sm">
                    <p className="text-2xl font-extrabold text-amber-600">
                      {anomalyData?.filter((a: any) => !a.resolution && a.severity === 'warning').length || 0}
                    </p>
                    <p className="text-xs text-amber-700 font-bold uppercase tracking-wider mt-1">Warnings</p>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 shadow-sm">
                    <p className="text-2xl font-extrabold text-emerald-600">
                      {anomalyData?.filter((a: any) => a.resolution).length || 0}
                    </p>
                    <p className="text-xs text-emerald-700 font-bold uppercase tracking-wider mt-1">Resolved</p>
                  </div>
                </div>

                <button
                  onClick={() => executeMutation.mutate()}
                  disabled={executeMutation.isPending}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3.5 rounded-xl transition-colors mt-4 shadow-sm"
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
                  className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-bold"
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
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-6 shadow-sm">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 15 }}
                  className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto"
                >
                  <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                </motion.div>

                <div>
                  <h3 className="text-2xl font-bold text-slate-900">Import Complete!</h3>
                  <p className="text-slate-500 mt-1 font-medium">Your data has been successfully imported</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-lg mx-auto">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-3xl font-extrabold text-slate-900">{importResult.imported_rows}</p>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Imported</p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 shadow-sm">
                    <p className="text-3xl font-extrabold text-blue-600">{importResult.expenses_created}</p>
                    <p className="text-xs text-blue-700 font-bold uppercase tracking-wider mt-1">Expenses</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-xl border border-purple-200 shadow-sm">
                    <p className="text-3xl font-extrabold text-purple-600">{importResult.settlements_created}</p>
                    <p className="text-xs text-purple-700 font-bold uppercase tracking-wider mt-1">Settlements</p>
                  </div>
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 shadow-sm">
                    <p className="text-3xl font-extrabold text-amber-600">{importResult.skipped_rows}</p>
                    <p className="text-xs text-amber-700 font-bold uppercase tracking-wider mt-1">Skipped</p>
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/app/groups/${groupId}`)}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3.5 rounded-xl transition-colors shadow-sm"
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
