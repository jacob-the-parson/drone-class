// AI service store — the UNIVERSAL ADAPTER direction (Jacob):
// image gen is PROVIDER-AGNOSTIC. `provider` selects from a future adapter
// registry (cloud APIs / local models); generation itself is STAGED until
// adapters land (ROADMAP: provider adapters). The prepend/append
// prompt-template system feeds AIMetadata's prompt chain.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TemplateOption {
  id: string;
  label: string;
  promptStr: string;
}

/** Future adapter registry ids — UIs render selectors from lists like this,
 *  never hardcode a vendor. Only 'gemini' has a planned first adapter. */
export const IMAGE_GEN_PROVIDERS = [
  { id: 'gemini', label: 'Gemini (cloud)', available: false },
  { id: 'local', label: 'Local model (when wired)', available: false },
] as const;

interface AIState {
  provider: string;
  model: string;
  promptPrefix: string;
  apiKey: string;
  prependTemplate: string;
  appendTemplate: string;
  prependOptions: TemplateOption[];
  appendOptions: TemplateOption[];
  setProvider: (id: string) => void;
  setModel: (m: string) => void;
  setPromptPrefix: (p: string) => void;
  setApiKey: (key: string) => void;
  setPrependTemplate: (id: string) => void;
  setAppendTemplate: (id: string) => void;
  setPrependOptions: (options: TemplateOption[]) => void;
  setAppendOptions: (options: TemplateOption[]) => void;
}

export const DEFAULT_PREPEND_OPTIONS: TemplateOption[] = [
  { id: 'none', label: 'None', promptStr: 'high quality, detailed 2D game asset' },
  { id: 'pixel-art', label: 'Pixel Art', promptStr: '16-bit pixel art game asset, sharp edges, crisp, retro RPG' },
  { id: 'hd-2d', label: 'HD 2D', promptStr: 'crisp HD 2D hand-drawn vector art game asset, clean lines' },
  { id: 'watercolor', label: 'Watercolor', promptStr: 'beautiful watercolor painting style game asset, organic textures, traditional medium' },
  { id: 'isometric-3d', label: 'Isometric 3D', promptStr: 'isometric 3D render game asset, smooth lighting, ambient occlusion' },
  { id: 'eon-toon', label: 'EON Toon', promptStr: 'flat cel-shaded toon game asset, bold edge ink, simple color ramps, matte' },
];

export const DEFAULT_APPEND_OPTIONS: TemplateOption[] = [
  { id: 'none', label: 'None', promptStr: '' },
  { id: 'centered', label: 'Centered & Front View', promptStr: 'centered in frame, front view, clear silhouette' },
  { id: 'dramatic', label: 'Dramatic Lighting', promptStr: 'dramatic atmospheric lighting, cinematic, high contrast' },
  { id: 'flat', label: 'Flat Shading', promptStr: 'flat shading, cel shaded, no outline' },
];

export const useAIStore = create<AIState>()(
  persist(
    (set) => ({
      provider: 'gemini',
      model: 'gemini-3.1-flash-image-preview',
      promptPrefix: '',
      apiKey: '',
      prependTemplate: 'hd-2d',
      appendTemplate: 'none',
      prependOptions: DEFAULT_PREPEND_OPTIONS,
      appendOptions: DEFAULT_APPEND_OPTIONS,
      setProvider: (id) => set({ provider: id }),
      setModel: (m) => set({ model: m }),
      setPromptPrefix: (p) => set({ promptPrefix: p }),
      setApiKey: (k) => set({ apiKey: k }),
      setPrependTemplate: (id) => set({ prependTemplate: id }),
      setAppendTemplate: (id) => set({ appendTemplate: id }),
      setPrependOptions: (opts) => set({ prependOptions: opts }),
      setAppendOptions: (opts) => set({ appendOptions: opts }),
    }),
    { name: 'nro-ai' },
  ),
);
