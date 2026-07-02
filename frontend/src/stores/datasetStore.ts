import { create } from "zustand";
import type { DatasetUpdate } from "../api/datasets";
import { fetchDatasets, fetchDataset, createDataset, deleteDataset, updateDataset } from "../api/datasets";

export interface DatasetListItem {
  id: number;
  name: string;
  modality: string;
  row_count: number;
  created_at: string;
}

export interface DatasetStore {
  items: DatasetListItem[];
  selected: DatasetListItem & {
    description: string | null;
    source_path: string;
    label_column: string | null;
    sample_id_column: string | null;
    columns: string[] | null;
    dtypes: Record<string, string> | null;
    preview_rows: Array<Record<string, unknown>> | null;
  } | null;
  loading: boolean;
  error: string | null;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  load: () => Promise<void>;
  loadOne: (id: number) => Promise<void>;
  create: (payload: Parameters<typeof createDataset>[0]) => Promise<void>;
  update: (id: number, payload: DatasetUpdate) => Promise<void>;
  remove: (id: number) => Promise<void>;
  clearSelected: () => void;
}

export const useDatasetStore = create<DatasetStore>((set, get) => ({
  items: [],
  selected: null,
  loading: false,
  error: null,
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  load: async () => {
    set({ loading: true, error: null });
    try {
      const items = await fetchDatasets();
      set({ items, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },
  loadOne: async (id) => {
    set({ loading: true, error: null });
    try {
      const selected = await fetchDataset(id);
      set({ selected, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },
  create: async (payload) => {
    set({ loading: true, error: null });
    try {
      const created = await createDataset(payload);
      set({ items: [created, ...get().items], loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
      throw e;
    }
  },
  update: async (id, payload) => {
    set({ loading: true, error: null });
    try {
      const updated = await updateDataset(id, payload);
      set({
        items: get().items.map((i) => (i.id === id ? updated : i)),
        selected: get().selected && get().selected!.id === id ? updated : get().selected,
        loading: false,
      });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },
  remove: async (id) => {
    set({ loading: true, error: null });
    try {
      await deleteDataset(id);
      set({ items: get().items.filter((i) => i.id !== id), loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },
  clearSelected: () => set({ selected: null }),
}));
