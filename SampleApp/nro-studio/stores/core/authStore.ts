// Auth state — deliberately NOT persisted: every fresh load starts signed out,
// and Dev Login grants an instant local session. Real providers arrive later;
// the store contract is what the app codes against (Dependency Inversion).
import { create } from 'zustand';

export interface UserProfile {
  name: string;
  role: string;
  email: string;
}

const DEV_USER: UserProfile = {
  name: 'Jacob',
  role: 'Architect',
  email: 'dev@nro.local',
};

interface AuthState {
  userProfile: UserProfile | null;
  isAuthed: boolean;
  devLogin: () => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  userProfile: null,
  isAuthed: false,
  devLogin: () => set({ userProfile: DEV_USER, isAuthed: true }),
  signOut: () => set({ userProfile: null, isAuthed: false }),
}));
