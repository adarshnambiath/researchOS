import { create } from "zustand";
import type { RunUpdate } from "../api/runs";
import { fetchRuns, fetchRun, createRun, deleteRun, updateRun } from "../api/runs";
import { syncOutputs, fetchOutputs } from "../api/outputs";

export interface RunListItem {
  id: number;
  experiment_id: number;
  model_name: string;
  seed: number | null;
  framework: string | null;
  created_at: string;
  has_evaluation: boolean;
}

export interface RunStore {
  items: RunListItem[];
  selected: RunListItem & {
    notes: string | null;
    git_commit: string | null;
    repository_url: string | null;
    entry_point: string | null;
    hyperparameters: Record<string, string> | null;
    framework_version: string | null;
    python_version: string | null;
    sdk_version: string | null;
    execution_device: string | null;
    environment_metadata: Record<string, string> | null;
    output_directory: string | null;
    experiment_name: string;
  } | null;
  outputItems: Array<{ id: number; type: string; filename: string; file_size: number; uploaded_at: string }>;
  loading: boolean;
  error: string | null;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  load: (experiment_id?: number) => Promise<void>;
  loadOne: (id: number) => Promise<void>;
  create: (payload: Parameters<typeof createRun>[0]) => Promise<void>;
  update: (id: number, payload: RunUpdate) => Promise<void>;
  remove: (id: number) => Promise<void>;
  loadOutputs: (runId: number) => Promise<void>;
  syncOutputs: (runId: number) => Promise<void>;
  clearSelected: () => void;
}

export const useRunStore = create<RunStore>((set, get) => ({
  items: [],
  selected: null,
  outputItems: [],
  loading: false,
  error: null,
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  load: async (experiment_id) => {
    set({ loading: true, error: null });
    try {
      const items = await fetchRuns(experiment_id);
      set({ items, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },
  loadOne: async (id) => {
    set({ loading: true, error: null });
    try {
      const selected = await fetchRun(id);
      set({ selected, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },
  create: async (payload) => {
    set({ loading: true, error: null });
    try {
      const created = await createRun(payload);
      set({ items: [created, ...get().items], loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
      throw e;
    }
  },
  remove: async (id) => {
    set({ loading: true, error: null });
    try {
      await deleteRun(id);
      set({ items: get().items.filter((i) => i.id !== id), loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },
  update: async (id, payload) => {
    set({ loading: true, error: null });
    try {
      const updated = await updateRun(id, payload);
      set({
        items: get().items.map((i) => (i.id === id ? updated : i)),
        selected: get().selected && get().selected!.id === id ? updated : get().selected,
        loading: false,
      });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },
  loadOutputs: async (runId) => {
    set({ loading: true, error: null });
    try {

      const outputItems = await fetchOutputs(runId);
      set({ outputItems: outputItems as RunStore["outputItems"], loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },
  syncOutputs: async (runId) => {
    set({ loading: true, error: null });
    try {
      const data = await syncOutputs(runId);
      set({ outputItems: data as RunStore["outputItems"], loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },
  clearSelected: () => set({ selected: null, outputItems: [] }),
}));
