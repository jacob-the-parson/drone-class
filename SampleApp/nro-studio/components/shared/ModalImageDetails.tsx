// ModalImageDetails — the Vault item-details modal (tokens + Blob items).
// Two panes: LEFT = checkered preview well +
// click-to-edit Name + live Dimensions; RIGHT = AI provenance (full composed
// prompt + blue/orange/purple prepend/core/append copy-cards + target cell) or
// a dashed empty state. Download lives in the modal header. Metadata fields are
// wired and render as soon as generation flows start filling item.metadata.
'use client';
import { useEffect, useState } from 'react';
import { Boxes, Check, Copy, Download, Eye, FileText, Image as ImageIcon, Pencil } from 'lucide-react';
import { useVaultStore, type AIMetadata, type VaultItem } from '@/stores/core/vaultStore';
import { ModalBase } from '@/components/ui/ModalBase';
import { BadgeDim } from '@/components/ui/BadgeDim';

export function ModalImageDetails({ item, onClose }: { item: VaultItem | null; onClose: () => void }) {
  const items = useVaultStore((s) => s.items);
  const updateItemName = useVaultStore((s) => s.updateItemName);

  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

  // live store subscription: renames elsewhere reflect while open
  const current = (item && items.find((i) => i.id === item.id)) || item;

  useEffect(() => {
    if (!isEditingName && current) setEditedName(current.name);
  }, [current?.name, current, isEditingName]);

  useEffect(() => setDims(null), [current?.id]);

  if (!current) return null;
  const isImage = !!current.url && current.mime.startsWith('image/');

  const handleNameSave = () => {
    const trimmed = editedName.trim();
    if (trimmed && trimmed !== current.name) updateItemName(current.id, trimmed);
    else setEditedName(current.name);
    setIsEditingName(false);
  };

  const handleCopy = (text: string, section: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    });
  };

  const handleDownload = () => {
    if (!current.url) return;
    const a = document.createElement('a');
    a.href = current.url;
    a.download = current.name;
    a.click();
  };

  return (
    <ModalBase
      isOpen={!!item}
      onClose={onClose}
      maxWidth="max-w-3xl"
      title={
        <>
          <Eye size={18} className="shrink-0 text-secondary" />
          <span className="truncate">Item Details</span>
          <span className="shrink-0 rounded bg-control px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
            {current.type}
          </span>
          <BadgeDim dim={current.mode} className="shrink-0" />
        </>
      }
      headerActions={
        <button
          onClick={handleDownload}
          disabled={!current.url}
          className="group rounded p-1 text-green-600 transition-colors hover:bg-green-50 dark:text-green-500 dark:hover:bg-green-900/20 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
          title="Download"
        >
          <Download size={18} className="transition-transform group-hover:-translate-y-0.5" />
        </button>
      }
    >
      <div className="gap-6 md:flex">
        {/* LEFT — the physical asset */}
        <div className="mb-6 flex w-full shrink-0 flex-col items-center gap-3 md:mb-0 md:w-1/2">
          <div className="checker-bg flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border border-edge bg-surface-sunken">
            {isImage ? (
              <img
                src={current.url}
                alt={current.name}
                className="max-h-full max-w-full object-contain"
                style={{ imageRendering: 'pixelated' }}
                onLoad={(e) => setDims({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-ink-muted">
                <Boxes size={36} className="opacity-60" />
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                  No preview
                </span>
              </div>
            )}
          </div>

          <div className="grid w-full grid-cols-2 gap-2 text-xs">
            <div className="group relative flex flex-col rounded border border-edge bg-surface-sunken/50 p-2">
              <span className="text-[10px] tracking-wide text-ink-muted">Name</span>
              {isEditingName ? (
                <input
                  type="text"
                  autoFocus
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onBlur={handleNameSave}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleNameSave();
                    if (e.key === 'Escape') {
                      setEditedName(current.name);
                      setIsEditingName(false);
                    }
                  }}
                  className="-mx-1 w-full rounded border border-secondary bg-surface px-1 text-ink outline-none focus:ring-1 focus:ring-secondary/50"
                />
              ) : (
                <div
                  className="cursor-text truncate font-medium text-ink transition-colors hover:text-secondary"
                  onClick={() => {
                    setEditedName(current.name);
                    setIsEditingName(true);
                  }}
                  title="Click to edit name"
                >
                  {current.name}
                  <Pencil size={10} className="ml-1 inline opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              )}
            </div>
            <div className="flex flex-col rounded border border-edge bg-surface-sunken/50 p-2">
              <span className="text-[10px] tracking-wide text-ink-muted">Dimensions</span>
              <span className="font-medium text-ink">
                {isImage ? (dims ? `${dims.w} × ${dims.h}px` : 'Loading…') : '—'}
              </span>
            </div>
          </div>

          <div className="flex w-full justify-between text-[10px] text-ink-muted">
            <span>{current.mime || 'unknown type'}</span>
            <span>{new Date(current.timestamp).toLocaleString()}</span>
          </div>
        </div>

        {/* RIGHT — the provenance */}
        <div className="flex w-full flex-col gap-4 md:w-1/2">
          {current.metadata ? (
            <>
              <div className="flex items-center gap-2 border-b border-edge pb-2">
                <ImageIcon size={16} className="text-ink-muted" />
                <h4 className="text-sm font-medium uppercase tracking-widest text-ink">
                  Generation Data
                </h4>
              </div>
              <MetadataBreakdown
                metadata={current.metadata}
                copiedSection={copiedSection}
                onCopy={handleCopy}
              />
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-edge p-6 text-center text-ink-muted">
              <FileText size={32} className="opacity-50" />
              <p className="text-sm">No structured metadata for this asset.</p>
              <p className="text-xs opacity-60">
                Generation flows will fill the prompt chain here.
              </p>
            </div>
          )}
        </div>
      </div>
    </ModalBase>
  );
}

function MetadataBreakdown({
  metadata,
  copiedSection,
  onCopy,
}: {
  metadata: AIMetadata;
  copiedSection: string | null;
  onCopy: (text: string, section: string) => void;
}) {
  const fullPrompt = [...metadata.prependTemplates, metadata.prompt, ...metadata.appendTemplates].join(', ');

  const chainRow = (
    section: string,
    label: string,
    text: string,
    tone: { bg: string; label: string; icon: string },
  ) => (
    <div
      className={`group flex cursor-pointer items-start gap-2 rounded border p-2 transition-colors ${tone.bg}`}
      onClick={() => onCopy(text, section)}
    >
      <span className={`mt-0.5 shrink-0 text-[10px] font-bold uppercase tracking-widest ${tone.label}`}>
        {label}
      </span>
      <span className="flex-1 text-xs text-ink">{text}</span>
      <div className="opacity-0 transition-opacity group-hover:opacity-100">
        {copiedSection === section ? (
          <Check size={14} className="text-green-500" />
        ) : (
          <Copy size={14} className={tone.icon} />
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-edge bg-surface-sunken/50 p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <FileText size={16} className="text-secondary" />
            Full Composed Prompt
          </div>
          <button
            onClick={() => onCopy(fullPrompt, 'full')}
            className="flex items-center gap-1 text-xs text-ink-muted transition-colors hover:text-secondary"
          >
            {copiedSection === 'full' ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            {copiedSection === 'full' ? 'Copied' : 'Copy'}
          </button>
        </div>
        <p className="break-words rounded border border-edge bg-surface p-2 text-xs text-ink-muted">
          {fullPrompt}
        </p>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Prompt Chain Breakdown
        </div>

        {metadata.prependTemplates.length > 0 &&
          chainRow('prepend', 'Prepend', metadata.prependTemplates.join(', '), {
            bg: 'border-blue-200/60 bg-blue-50/50 hover:bg-blue-50 dark:border-blue-900/30 dark:bg-blue-900/10 dark:hover:bg-blue-900/20',
            label: 'text-blue-600 dark:text-blue-400',
            icon: 'text-blue-400',
          })}

        {chainRow('core', 'Core', metadata.prompt, {
          bg: 'border-orange-200/60 bg-orange-50/50 hover:bg-orange-50 dark:border-orange-900/30 dark:bg-orange-900/10 dark:hover:bg-orange-900/20',
          label: 'text-orange-600 dark:text-orange-400',
          icon: 'text-orange-400',
        })}

        {metadata.appendTemplates.length > 0 &&
          chainRow('append', 'Append', metadata.appendTemplates.join(', '), {
            bg: 'border-purple-200/60 bg-purple-50/50 hover:bg-purple-50 dark:border-purple-900/30 dark:bg-purple-900/10 dark:hover:bg-purple-900/20',
            label: 'text-purple-600 dark:text-purple-400',
            icon: 'text-purple-400',
          })}

        <div className="mt-4 flex items-center justify-between rounded border border-edge bg-control p-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">
            Target Cell Size
          </span>
          <span className="font-mono text-xs text-ink">
            {metadata.width} × {metadata.height}px
          </span>
        </div>
      </div>
    </div>
  );
}
