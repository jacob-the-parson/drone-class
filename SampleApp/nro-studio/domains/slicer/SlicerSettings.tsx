// SlicerSettings — settings-tab body (S2 boilerplate): AI generation params on
// the provider-agnostic aiStore. Provider selector renders from the registry
// list (universal adapter law — no hardcoded vendor); generation itself stays
// STAGED until adapters land. Template CRUD = S2 remainder.
'use client';
import { Sparkles } from 'lucide-react';
import { useAIStore, IMAGE_GEN_PROVIDERS } from '@/stores/services/aiStore';

const inputCls =
  'w-full rounded border border-edge bg-surface p-2 text-sm text-ink outline-none transition-colors focus:border-orange-400 focus:ring-1 focus:ring-orange-400/50';

export function SlicerSettings() {
  const {
    provider,
    setProvider,
    model,
    setModel,
    promptPrefix,
    setPromptPrefix,
    apiKey,
    setApiKey,
    prependTemplate,
    setPrependTemplate,
    appendTemplate,
    setAppendTemplate,
    prependOptions,
    appendOptions,
  } = useAIStore();

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm font-medium text-ink">
        <Sparkles size={15} className="text-orange-500" /> AI Generation
        <span className="rounded bg-control px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
          provider wiring pending
        </span>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-ink-muted">Provider (universal adapter)</span>
        <select value={provider} onChange={(e) => setProvider(e.target.value)} className={`${inputCls} cursor-pointer`}>
          {IMAGE_GEN_PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
              {p.available ? '' : ' — pending'}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-muted">Model</span>
          <input type="text" value={model} onChange={(e) => setModel(e.target.value)} className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-muted">API key (yours, optional)</span>
          <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className={inputCls} placeholder="uses env key when empty" />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-ink-muted">Prompt prefix</span>
        <input type="text" value={promptPrefix} onChange={(e) => setPromptPrefix(e.target.value)} className={inputCls} placeholder="always prepended to prompts" />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-muted">Prepend template (style)</span>
          <select value={prependTemplate} onChange={(e) => setPrependTemplate(e.target.value)} className={`${inputCls} cursor-pointer`}>
            {prependOptions.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-muted">Append template (finish)</span>
          <select value={appendTemplate} onChange={(e) => setAppendTemplate(e.target.value)} className={`${inputCls} cursor-pointer`}>
            {appendOptions.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </label>
      </div>

      <p className="rounded-lg border border-dashed border-edge p-3 text-xs leading-relaxed text-ink-muted">
        These params feed the prompt chain (prepend · prefix · prompt · append) recorded
        as Vault AIMetadata. Generation buttons stay staged until the provider adapters
        land; template CRUD arrives with them.
      </p>
    </div>
  );
}
