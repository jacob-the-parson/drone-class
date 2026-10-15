// Template domain store — proves every slot can self-connect to ONE domain
// store (the zero-prop convention). Copy + rename when cloning the template.
import { create } from 'zustand';

type ChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};

type ReceivedVaultItem = {
  name: string;
  mode: string;
};

type TemplateState = {
  templateName: string;
  accentColor: string;
  checklist: ChecklistItem[];
  receivedItem: ReceivedVaultItem | null;
  setTemplateName: (name: string) => void;
  setAccentColor: (color: string) => void;
  toggleChecklistItem: (id: string) => void;
  resetChecklist: () => void;
  receiveVaultItem: (item: ReceivedVaultItem) => void;
};

const defaultChecklist: ChecklistItem[] = [
  { id: 'manifest', label: 'Manifest registered', done: true },
  { id: 'route', label: 'Route + workspace connected', done: true },
  { id: 'drawerLeftBottom', label: 'Left-bottom panel mounted', done: true },
  { id: 'drawerRight', label: 'Right drawer page available', done: true },
  { id: 'footer', label: 'Shell footer actions declared', done: true },
  { id: 'settings', label: 'Settings tab supplied', done: true },
];

export const useTemplateStore = create<TemplateState>((set) => ({
  templateName: 'Domain Template',
  accentColor: '#db2777',
  checklist: defaultChecklist,
  receivedItem: null,
  setTemplateName: (name) => set({ templateName: name }),
  setAccentColor: (color) => set({ accentColor: color }),
  toggleChecklistItem: (id) =>
    set((state) => ({
      checklist: state.checklist.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item,
      ),
    })),
  resetChecklist: () => set({ checklist: defaultChecklist }),
  receiveVaultItem: ({ name, mode }) => set({ receivedItem: { name, mode } }),
}));
