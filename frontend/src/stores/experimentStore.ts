import { create } from "zustand";
import { fetchExperiments, fetchExperiment, createExperiment, deleteExperiment } from "../api/experiments";

export interface ExperimentListItem {
  id: number;
  dataset_id: number;
  name: string;
  task: string;
  created_at: string;
  run_count: number;
}

export interface ExperimentStore {
  items: ExperimentListItem[];
  selected: ExperimentListItem & { description: string | null; objective: string | null; dataset_name: string } | null;
  loading: boolean;
  error: string | null;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  load: (dataset_id?: number) => Promise<void>;
  loadOne: (id: number) => Promise<void>;
  create: (payload: Parameters<typeof createExperiment>[0]) => Promise<void>;
  remove: (id: number) => Promise<void>;
  clearSelected: () => void;
}

export const useExperimentStore = create<ExperimentStore>((set, get) => ({
  items: [],
  selected: null,
  loading: false,
  error: null,
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  load: async (dataset_id) => {
    set({ loading: true, error: null });
    try {
      const items = await fetchExperiments(dataset_id);
      set({ items, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },
  loadOne: async (id) => {
    set({ loading: true, error: null });
    try {
      const selected = await fetchExperiment(id);
      set({ selected, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },
  create: async (payload) => {
    set({ loading: true, error: null });
    try {
      const created = await createExperiment(payload);
      set({ items: [created, ...get().items], loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
      throw e;
    }
  },
  remove: async (id) => {
    set({ loading: true, error: null });
    try {
      await deleteExperiment(id);
      set({ items: get().items.filter((i) => i.id !== id), loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },
  clearSelected: () => set({ selected: null }),
}));
