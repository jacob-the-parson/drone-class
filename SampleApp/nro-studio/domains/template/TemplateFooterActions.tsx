// TemplateFooterActions — the FOOTER SHAPE (Jacob's law, all templates):
//   [ domain action ] [ domain action ] [ CENTER reserved ] [ trash-Reset ] [ Vault ]
// Here: Status counter + Tick (progress the checklist) on the left; center
// stays null (reserved for a future shared/global button); Reset = red family,
// Vault send = green family.
'use client';
import { useState } from 'react';
import { CheckCircle2, Download, ListChecks, Trash2 } from 'lucide-react';
import { useTemplateStore } from '@/stores/domains/templateStore';
import { useVaultStore } from '@/stores/core/vaultStore';
import { KeycapAction } from '@/components/ui/KeycapAction';

export function TemplateStatusAction() {
  const checklist = useTemplateStore((s) => s.checklist);
  const completeCount = checklist.filter((item) => item.done).length;

  return (
    <div className="flex h-full w-full items-center justify-center gap-1.5 text-pink-600 dark:text-pink-400">
      <CheckCircle2 size={13} />
      <span className="font-medium uppercase tracking-wide">
        {completeCount}/{checklist.length}
      </span>
    </div>
  );
}

export function TemplateTickAction() {
  const checklist = useTemplateStore((s) => s.checklist);
  const toggleChecklistItem = useTemplateStore((s) => s.toggleChecklistItem);
  const nextOpen = checklist.find((item) => !item.done);

  return (
    <button
      onClick={() => nextOpen && toggleChecklistItem(nextOpen.id)}
      disabled={!nextOpen}
      className={`group flex h-full w-full items-center justify-center gap-1.5 outline-none transition-colors ${
        nextOpen
          ? 'cursor-pointer hover:bg-control hover:text-pink-600 dark:hover:text-pink-400'
          : 'cursor-not-allowed opacity-40'
      }`}
      title={nextOpen ? `Mark "${nextOpen.label}" done` : 'Checklist complete'}
    >
      <ListChecks size={13} className={nextOpen ? 'transition-transform group-hover:-translate-y-0.5' : ''} />
      <span className="font-medium uppercase tracking-wide">Tick</span>
    </button>
  );
}

export function TemplateResetAction() {
  const resetChecklist = useTemplateStore((s) => s.resetChecklist);
  return (
    <KeycapAction icon={Trash2} label="Reset" tone="red" onClick={resetChecklist} title="Reset template checklist" />
  );
}

export function TemplateVaultAction() {
  const checklist = useTemplateStore((s) => s.checklist);
  const addItem = useVaultStore((s) => s.addItem);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    const done = checklist.filter((item) => item.done).length;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#fdf2f8';
      ctx.fillRect(0, 0, 128, 128);
      ctx.fillStyle = '#db2777';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('TPL', 64, 48);
      ctx.fillText(`${done}/${checklist.length}`, 64, 84);
    }
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (blob) {
      await addItem(blob, { name: `template-status-${done}of${checklist.length}.png`, type: 'generation', mode: '2d' });
    }
    setIsExporting(false);
  };

  return (
    <KeycapAction icon={Download} label="Vault" tone="green" onClick={handleExport} disabled={isExporting} title="Send to Vault" />
  );
}
