import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Shield,
  ArrowRight,
  RefreshCw,
  XCircle,
  Tag,
  Database,
  Lock,
} from 'lucide-react';
import { api } from '../api';
import {
  type ImportProposal,
  type ImportResult,
  type TargetField,
} from '@app/shared';
import clsx from 'clsx';

const SYNTHETIC_MESSY_BROWSER_CSV = `name,url,username,password,note,folder
"GitHub (Work Account)","https://github.com/login","synth.developer@example.test","Synthetic-Import-Github-2026","Work dev account","Development"
"Google Workspace","https://accounts.google.com","synth.developer@example.test","Synthetic-Import-Google-2026","Company mail","Productivity"
"AWS Console","https://console.aws.amazon.com","synth.cloud-admin@example.test","Synthetic-Import-Aws-2026","Infra cloud","Cloud"`;

type Step = 'upload' | 'analyzing' | 'preview' | 'complete';

export const SmartImport: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('upload');
  const [csvText, setCsvText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Proposal state
  const [stagingId, setStagingId] = useState<string>('');
  const [proposal, setProposal] = useState<ImportProposal | null>(null);
  const [customMappings, setCustomMappings] = useState<Record<string, TargetField>>({});
  const [selectedRowIndices, setSelectedRowIndices] = useState<Set<number>>(new Set());

  // Result state
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
    };
    reader.readAsText(file);
  };

  const handleLoadFixture = () => {
    setFileName('synthetic_messy_browser_export.csv');
    setCsvText(SYNTHETIC_MESSY_BROWSER_CSV);
  };

  const handleAnalyze = async () => {
    if (!csvText || csvText.trim().length === 0) {
      setError('Please select a CSV file or load the demo fixture.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setStep('analyzing');

    try {
      const res = await api.analyzeImport(csvText);
      setStagingId(res.stagingId);
      setProposal(res.proposal);

      // Initialize mappings
      const initialMappings: Record<string, TargetField> = {};
      for (const m of res.proposal.mappings) {
        initialMappings[m.sourceColumn] = m.targetField;
      }
      setCustomMappings(initialMappings);

      // By default select all non-invalid rows
      const initialSelected = new Set<number>();
      res.proposal.previewRows.forEach((r) => {
        if (r.status !== 'invalid') {
          initialSelected.add(r.rowIndex);
        }
      });
      setSelectedRowIndices(initialSelected);

      setStep('preview');
    } catch (err: any) {
      setError(err?.message || 'Failed to analyze import');
      setStep('upload');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMappingChange = (sourceColumn: string, targetField: TargetField) => {
    setCustomMappings((prev) => ({
      ...prev,
      [sourceColumn]: targetField,
    }));
  };

  const toggleRowSelection = (rowIndex: number) => {
    setSelectedRowIndices((prev) => {
      const next = new Set(prev);
      if (next.has(rowIndex)) {
        next.delete(rowIndex);
      } else {
        next.add(rowIndex);
      }
      return next;
    });
  };

  const handleCancel = async () => {
    if (stagingId) {
      try {
        await api.cancelImport(stagingId);
      } catch {
        // Ignored
      }
    }
    setStagingId('');
    setProposal(null);
    setStep('upload');
  };

  const handleConfirm = async () => {
    if (!stagingId) return;

    setIsLoading(true);
    setError(null);

    try {
      const confirmRes = await api.confirmImport(stagingId, {
        confirmedRowIndices: Array.from(selectedRowIndices),
        customMappings,
      });
      setResult(confirmRes);
      setStep('complete');
    } catch (err: any) {
      setError(err?.message || 'Failed to confirm import');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      {/* Stepper Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <FileText className="w-6 h-6 text-[var(--color-brand-orange)]" />
            Smart Import
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Messy browser CSV import with on-device AI mapping and duplicate detection.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full bg-[var(--color-paper)] border border-[var(--color-border)]">
          <Shield className="w-3.5 h-3.5 text-green-500" />
          <span>Local AI: On-Device (No Network)</span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-[var(--radius-md)] bg-red-500/10 border border-red-500/30 text-red-500 text-sm">
          <XCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="flex flex-col gap-6">
          <div className="border-2 border-dashed border-[var(--color-border)] rounded-[var(--radius-lg)] p-8 flex flex-col items-center justify-center text-center bg-[var(--color-paper)]/50">
            <Upload className="w-12 h-12 text-[var(--color-brand-orange)] mb-4" />
            <h2 className="text-lg font-medium mb-1">Select Browser Password CSV</h2>
            <p className="text-sm text-[var(--color-text-muted)] mb-6 max-w-md">
              Exported from Chrome, Firefox, Safari, Bitwarden, or 1Password. All analysis runs
              100% on your device with zero network transmission.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <label className="cursor-pointer px-4 py-2 rounded-full bg-[var(--color-brand-orange)] text-white hover:opacity-90 font-medium text-sm flex items-center gap-2 transition-opacity">
                <FileText className="w-4 h-4" />
                Browse CSV File
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>

              <button
                type="button"
                onClick={handleLoadFixture}
                className="px-4 py-2 rounded-full bg-[var(--color-canvas)] border border-[var(--color-border)] hover:bg-[var(--color-border)] text-sm font-medium transition-colors"
              >
                Load Synthetic Demo CSV
              </button>
            </div>

            {fileName && (
              <div className="mt-4 text-xs font-mono text-[var(--color-text-muted)] bg-[var(--color-canvas)] px-3 py-1.5 rounded-md border border-[var(--color-border)]">
                Selected: {fileName} ({csvText.length} bytes)
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              disabled={!csvText || isLoading}
              onClick={handleAnalyze}
              className={clsx(
                'flex items-center gap-2 px-6 py-2.5 rounded-full font-medium text-sm transition-all',
                csvText && !isLoading
                  ? 'bg-[var(--color-brand-orange)] text-white hover:opacity-90'
                  : 'bg-[var(--color-border)] text-[var(--color-text-muted)] cursor-not-allowed'
              )}
            >
              Analyze Offline
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Analyzing */}
      {step === 'analyzing' && (
        <div className="p-12 flex flex-col items-center justify-center text-center bg-[var(--color-paper)] rounded-[var(--radius-lg)] border border-[var(--color-border)]">
          <RefreshCw className="w-10 h-10 text-[var(--color-brand-orange)] animate-spin mb-4" />
          <h2 className="text-lg font-medium">Analyzing CSV with Local Intelligence...</h2>
          <p className="text-sm text-[var(--color-text-muted)] mt-1 max-w-md">
            Detecting field mappings, inferring tags, and scanning for duplicate records while
            preserving strict zero secret exposure.
          </p>
        </div>
      )}

      {/* Step 3: Preview & Confirmation */}
      {step === 'preview' && proposal && (
        <div className="flex flex-col gap-6">
          {/* Non-negotiable security boundary banner */}
          <div className="p-4 rounded-[var(--radius-md)] bg-[var(--color-paper)] border border-[var(--color-brand-orange)]/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-[var(--color-brand-orange)]" />
              <div>
                <span className="font-medium text-sm">Nothing saved yet. You confirm first.</span>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  Review the suggested column mappings, proposed tags, and duplicate groups below.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
              <span>{proposal.totalRows} total rows</span>
              <span>{proposal.duplicateGroups.length} duplicate groups</span>
            </div>
          </div>

          {/* Duplicate Groups Alert */}
          {proposal.duplicateGroups.length > 0 && (
            <div className="p-4 rounded-[var(--radius-md)] bg-amber-500/10 border border-amber-500/30 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-amber-500 font-medium text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>{proposal.duplicateGroups.length} Likely Duplicate Group(s) Detected</span>
              </div>
              <div className="flex flex-col gap-2">
                {proposal.duplicateGroups.map((group) => (
                  <div
                    key={group.id}
                    className="text-xs p-2 rounded bg-[var(--color-canvas)] border border-[var(--color-border)] flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold">{group.reason}</span>
                      <span className="text-[var(--color-text-muted)] ml-2">
                        ({group.candidates.length} candidates)
                      </span>
                    </div>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-500">
                      Needs Review
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Column Mappings */}
          <div className="bg-[var(--color-paper)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5 flex flex-col gap-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <span>Proposed Column Mappings</span>
              <span className="text-xs text-[var(--color-text-muted)] font-normal">
                (Map CSV headers to Verma vault fields)
              </span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-xs text-[var(--color-text-muted)] uppercase">
                    <th className="pb-2 font-medium">Source Column</th>
                    <th className="pb-2 font-medium">Mapped Verma Field</th>
                    <th className="pb-2 font-medium">Confidence</th>
                    <th className="pb-2 font-medium">Origin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {proposal.columns.map((col) => {
                    const currentTarget = customMappings[col] || 'ignore';
                    const originalMapping = proposal.mappings.find((m) => m.sourceColumn === col);
                    const confidence = originalMapping?.confidence || 'medium';
                    const suggestedBy = originalMapping?.suggestedBy || 'heuristic';

                    return (
                      <tr key={col} className="hover:bg-[var(--color-canvas)]/40 transition-colors">
                        <td className="py-2.5 font-mono text-xs">{col}</td>
                        <td className="py-2.5">
                          <select
                            value={currentTarget}
                            onChange={(e) => handleMappingChange(col, e.target.value as TargetField)}
                            className="bg-[var(--color-canvas)] border border-[var(--color-border)] rounded px-2.5 py-1 text-xs font-medium focus:outline-none focus:border-[var(--color-brand-orange)]"
                          >
                            <option value="title">Title (Account Name)</option>
                            <option value="username">Username / Email</option>
                            <option value="password">Password (Masked)</option>
                            <option value="url">Website URL</option>
                            <option value="notes">Notes / Details</option>
                            <option value="tags">Tags / Categories</option>
                            <option value="ignore">Ignore Column</option>
                          </select>
                        </td>
                        <td className="py-2.5">
                          <span
                            className={clsx(
                              'text-[11px] font-medium px-2 py-0.5 rounded capitalize',
                              confidence === 'high'
                                ? 'bg-green-500/10 text-green-500'
                                : confidence === 'medium'
                                  ? 'bg-amber-500/10 text-amber-500'
                                  : 'bg-zinc-500/10 text-zinc-400'
                            )}
                          >
                            {confidence}
                          </span>
                        </td>
                        <td className="py-2.5 text-xs text-[var(--color-text-muted)]">
                          {suggestedBy === 'ai' ? 'Local AI' : 'Heuristic'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section: Proposed Tags */}
          {proposal.suggestedTags.length > 0 && (
            <div className="bg-[var(--color-paper)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4 flex items-center gap-3">
              <Tag className="w-4 h-4 text-[var(--color-brand-orange)] flex-shrink-0" />
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-medium text-[var(--color-text-muted)] mr-1">
                  Proposed Tags:
                </span>
                {proposal.suggestedTags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--color-canvas)] border border-[var(--color-border)] text-[var(--color-text)]"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Section: Entry Preview Table */}
          <div className="bg-[var(--color-paper)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                Entry Preview ({selectedRowIndices.size} of {proposal.previewRows.length} selected)
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedRowIndices(new Set(proposal.previewRows.map((r) => r.rowIndex)))
                  }
                  className="text-xs text-[var(--color-brand-orange)] hover:underline"
                >
                  Select All
                </button>
                <span className="text-[var(--color-border)]">·</span>
                <button
                  type="button"
                  onClick={() => setSelectedRowIndices(new Set())}
                  className="text-xs text-[var(--color-text-muted)] hover:underline"
                >
                  Deselect All
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-xs text-[var(--color-text-muted)] uppercase">
                    <th className="pb-2 w-8">Import</th>
                    <th className="pb-2">Title</th>
                    <th className="pb-2">Username</th>
                    <th className="pb-2">Password</th>
                    <th className="pb-2">Domain</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {proposal.previewRows.map((row) => {
                    const isSelected = selectedRowIndices.has(row.rowIndex);
                    return (
                      <tr
                        key={row.rowIndex}
                        className={clsx(
                          'hover:bg-[var(--color-canvas)]/40 transition-colors',
                          !isSelected && 'opacity-50'
                        )}
                      >
                        <td className="py-2.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRowSelection(row.rowIndex)}
                            className="rounded border-[var(--color-border)] text-[var(--color-brand-orange)] focus:ring-0 cursor-pointer"
                          />
                        </td>
                        <td className="py-2.5 font-medium">{row.proposedEntry.title}</td>
                        <td className="py-2.5 text-xs text-[var(--color-text-muted)]">
                          {row.proposedEntry.username || '—'}
                        </td>
                        <td className="py-2.5 font-mono text-xs">
                          {row.hasPasswordSecret ? (
                            <span className="flex items-center gap-1 text-[var(--color-text-muted)]">
                              <Lock className="w-3 h-3 text-green-500" />
                              ••••••••
                            </span>
                          ) : (
                            <span className="text-zinc-500">None</span>
                          )}
                        </td>
                        <td className="py-2.5 text-xs text-[var(--color-text-muted)]">
                          {row.proposedEntry.domain || '—'}
                        </td>
                        <td className="py-2.5">
                          <span
                            className={clsx(
                              'text-[10px] uppercase font-mono px-2 py-0.5 rounded',
                              row.status === 'ready'
                                ? 'bg-green-500/10 text-green-500'
                                : row.status === 'duplicate'
                                  ? 'bg-amber-500/10 text-amber-500'
                                  : 'bg-red-500/10 text-red-500'
                            )}
                          >
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actions Bar */}
          <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 rounded-full border border-[var(--color-border)] hover:bg-[var(--color-paper)] text-sm font-medium transition-colors"
            >
              Discard / Cancel
            </button>

            <button
              type="button"
              disabled={selectedRowIndices.size === 0 || isLoading}
              onClick={handleConfirm}
              className={clsx(
                'flex items-center gap-2 px-6 py-2 rounded-full font-medium text-sm transition-all',
                selectedRowIndices.size > 0 && !isLoading
                  ? 'bg-[var(--color-brand-orange)] text-white hover:opacity-90'
                  : 'bg-[var(--color-border)] text-[var(--color-text-muted)] cursor-not-allowed'
              )}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm Import ({selectedRowIndices.size} entries)
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Complete */}
      {step === 'complete' && result && (
        <div className="p-8 bg-[var(--color-paper)] rounded-[var(--radius-lg)] border border-[var(--color-border)] flex flex-col items-center justify-center text-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <h2 className="text-xl font-semibold">
            {result.importedCount} {result.importedCount === 1 ? 'entry' : 'entries'} imported successfully
          </h2>

          <p className="text-sm text-[var(--color-text-muted)] max-w-md">
            All records have been encrypted and stored in your offline vault.
            {result.failedCount > 0 && ` (${result.failedCount} failed rows reported)`}
          </p>

          <div className="flex items-center gap-3 mt-4">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[var(--color-brand-orange)] text-white font-medium text-sm hover:opacity-90 transition-opacity"
            >
              <Database className="w-4 h-4" />
              View in All Items
            </button>

            <button
              type="button"
              onClick={() => {
                setCsvText('');
                setFileName('');
                setResult(null);
                setProposal(null);
                setStep('upload');
              }}
              className="px-4 py-2.5 rounded-full border border-[var(--color-border)] hover:bg-[var(--color-canvas)] text-sm font-medium transition-colors"
            >
              Import Another File
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
