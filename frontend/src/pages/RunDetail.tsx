import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Pencil, Check, X } from "lucide-react";
import { useRunStore } from "../stores/runStore";
import { CodeBlock } from "../components/CodeBlock";
import { FormField } from "../components/FormField";
import { Modal } from "../components/Modal";
import { formatDate, formatBytes } from "../lib/format";

const SDK_PATH = "/Users/adarsh/Documents/internship_2026/evalsdk";

const RECOGNIZED_FILES = [
  { filename: "evaluation.parquet", description: "Row-level predictions with ground truth" },
  { filename: "metrics.json", description: "Aggregate scores (accuracy, F1, etc.)" },
  { filename: "artifacts.json", description: "References to checkpoints, plots, logs" },
];

export function RunDetail() {
  const { experimentId, runId } = useParams();
  const { selected, outputItems, loading, error, loadOne, loadOutputs, clearSelected, update } = useRunStore();
  const effectiveId = runId || experimentId;

  const [editOpen, setEditOpen] = useState(false);
  const [sdkTab, setSdkTab] = useState<"manual" | "prompt">("manual");
  const [form, setForm] = useState({
    model_name: "",
    notes: "",
    seed: "",
    git_commit: "",
    repository_url: "",
    entry_point: "",
    framework: "",
    framework_version: "",
    python_version: "",
    sdk_version: "",
    execution_device: "",
  });

  useEffect(() => {
    if (effectiveId) {
      loadOne(Number(effectiveId));
      loadOutputs(Number(effectiveId));
    }
    return () => clearSelected();
  }, [effectiveId, loadOne, loadOutputs, clearSelected]);

  if (loading) return <div className="p-6 text-sm text-[var(--color-muted)]">Loading…</div>;
  if (error) return <div className="p-6 text-sm text-red-600">{error}</div>;
  if (!selected) return <div className="p-6 text-sm text-[var(--color-muted)]">Run not found.</div>;

  // ── SDK code snippet (Tab 1) ──────────────────────────────────────
  const codeSnippet = `import sys

sys.path.insert(
    0,
    "${SDK_PATH}"
)

from experiment_sdk import ExperimentSession

session = ExperimentSession(
    output_directory=r"${selected.output_directory || ""}"
)

...
session.publish_evaluation(
    task="${selected.task}",
    sample_ids=sample_ids,
    ground_truth=y_true,
    predictions=y_pred,
    probabilities=probabilities,
)

session.publish_artifact(
    type="MODEL_CHECKPOINT",
    path="./models/best_model.pt",
    name="Best Model",
)

session.finish()`;

  // ── LLM prompt (Tab 2) ────────────────────────────────────────────
const llmPrompt = `You are integrating a standalone experiment evaluation SDK into an existing Python machine learning training script.

The SDK does NOT train models, perform inference, preprocess data, or replace any part of the ML pipeline.

Its responsibility begins only after predictions have already been generated.

The SDK validates evaluation outputs, computes standard metrics, serializes evaluation artifacts, and registers experiment artifacts.

Your task is to integrate the SDK into the existing script while preserving its behavior.

Requirements

- Do NOT modify data loading.
- Do NOT modify preprocessing.
- Do NOT modify feature engineering.
- Do NOT modify train/test splitting.
- Do NOT modify model architecture.
- Do NOT modify hyperparameters.
- Do NOT modify training logic.
- Do NOT modify inference logic.
- Do NOT replace existing libraries.
- Preserve the existing behavior of the script.

Near the top of the file insert:

import sys

sys.path.insert(
    0,
    "${SDK_PATH}"
)

from experiment_sdk import ExperimentSession

Create exactly one ExperimentSession:

session = ExperimentSession(
    output_directory="${selected.output_directory || ""}"
)

Do not modify this output directory.

After the model has generated predictions on the evaluation/test set, publish exactly one evaluation using:

session.publish_evaluation(
    task="${selected.task}",
    sample_ids=...,
    ground_truth=...,
    predictions=...,
    probabilities=...,   # optional
    metadata=...,        # optional
)

Populate these arguments using variables that already exist in the user's code.

Rules:

- task must match the experiment type.
- sample_ids must uniquely identify every evaluated sample.
- Reuse an existing identifier column if one exists.
- Otherwise generate deterministic sequential sample IDs.
- ground_truth, predictions, sample_ids, and probabilities (if provided) must all have matching lengths.
- If class probabilities are available (for example from predict_proba or softmax outputs), pass them using the probabilities argument.
- If probabilities are not available, omit the probabilities argument.
- If useful metadata already exists (for example fold number, dataset version, split name, model variant, or other experiment metadata), pass it through the optional metadata argument.
- Do not fabricate probabilities or metadata.

If the training script already produces useful artifacts, register them using session.publish_artifact().

Supported artifact types are:

- MODEL_CHECKPOINT
- CONFIG
- LOGS
- REPORT
- VISUALIZATION
- PREDICTIONS

Example:

session.publish_artifact(
    type="MODEL_CHECKPOINT",
    path="path/to/model.pt",
    name="Best Model",
)

Only register artifacts that already exist.

Do not create new files solely for artifact registration.

After all evaluations and artifact registrations have completed, call:

session.finish()

exactly once.

This will generate:

- evaluation.parquet
- metrics.json
- artifacts.json

inside:

${selected.output_directory || ""}

Return the complete modified Python file.

Do not return a diff.

Do not omit unchanged code.

Do not explain your changes.`;

  const openEdit = () => {
    setForm({
      model_name: selected.model_name,
      notes: selected.notes || "",
      seed: selected.seed != null ? String(selected.seed) : "",
      git_commit: selected.git_commit || "",
      repository_url: selected.repository_url || "",
      entry_point: selected.entry_point || "",
      framework: selected.framework || "",
      framework_version: selected.framework_version || "",
      python_version: selected.python_version || "",
      sdk_version: selected.sdk_version || "",
      execution_device: selected.execution_device || "",
    });
    setEditOpen(true);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await update(selected.id, {
      model_name: form.model_name,
      notes: form.notes || undefined,
      seed: form.seed ? Number(form.seed) : undefined,
      git_commit: form.git_commit || undefined,
      repository_url: form.repository_url || undefined,
      entry_point: form.entry_point || undefined,
      framework: form.framework || undefined,
      framework_version: form.framework_version || undefined,
      python_version: form.python_version || undefined,
      sdk_version: form.sdk_version || undefined,
      execution_device: form.execution_device || undefined,
    });
    setEditOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to={`/experiments/${(selected as any).experiment_id}`} className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
          <ArrowLeft className="h-4 w-4 inline mr-1" /> Back
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">{selected.model_name}</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">{selected.experiment_name}</p>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/experiments/${(selected as any).experiment_id}/runs/${selected.id}/evaluation`}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-hover)]"
          >
            View Evaluation
          </Link>
          <button onClick={openEdit} className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-card)]">
            <Pencil className="h-4 w-4" /> Edit
          </button>
        </div>
      </div>

      <section className="rounded-lg border border-[var(--color-border)] p-6">
        <h3 className="text-sm font-medium text-[var(--color-text-primary)]">Metadata</h3>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-[var(--color-muted)]">Experiment</dt>
            <dd className="mt-1 text-sm text-[var(--color-text-primary)]">{selected.experiment_name}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-muted)]">Created</dt>
            <dd className="mt-1 text-sm text-[var(--color-text-primary)]">{formatDate(selected.created_at)}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-muted)]">Seed</dt>
            <dd className="mt-1 text-sm text-[var(--color-text-primary)]">{selected.seed ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-muted)]">Framework</dt>
            <dd className="mt-1 text-sm text-[var(--color-text-primary)]">{selected.framework ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-muted)]">Git Commit</dt>
            <dd className="mt-1 text-sm text-[var(--color-text-primary)]">{selected.git_commit ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-muted)]">Output Directory</dt>
            <dd className="mt-1 text-sm text-[var(--color-text-primary)] font-mono break-all">{selected.output_directory ?? "—"}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-[var(--color-border)] p-6">
        <h3 className="text-sm font-medium text-[var(--color-text-primary)]">SDK Integration</h3>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Integrate the <code className="rounded bg-[var(--color-card)] px-1 py-0.5 text-xs font-mono">experiment_sdk</code> into your training script.
          The SDK writes standardized outputs to the run output directory.
        </p>

        {/* Tabs */}
        <div className="mt-4 border-b border-[var(--color-border)]">
          <nav className="-mb-px flex gap-6">
            <button
              onClick={() => setSdkTab("manual")}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                sdkTab === "manual"
                  ? "border-[var(--color-primary)] text-[var(--color-text-primary)]"
                  : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-text-secondary)] hover:border-[var(--color-border)]"
              }`}
            >
              Manual Integration
            </button>
            <button
              onClick={() => setSdkTab("prompt")}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                sdkTab === "prompt"
                  ? "border-[var(--color-primary)] text-[var(--color-text-primary)]"
                  : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-text-secondary)] hover:border-[var(--color-border)]"
              }`}
            >
              Generate LLM Prompt
            </button>
          </nav>
        </div>

        {/* Tab content */}
        <div className="mt-6">
          {sdkTab === "manual" ? (
            <div className="space-y-4">
              <p className="text-sm text-[var(--color-text-secondary)]">
                Since the SDK is still under development, temporarily add the SDK path to <code className="rounded bg-[var(--color-card)] px-1 py-0.5 text-xs font-mono">sys.path</code>,
                then create an <code className="rounded bg-[var(--color-card)] px-1 py-0.5 text-xs font-mono">ExperimentSession</code> pointing at the run output directory.
              </p>

              <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                <strong>Output directory:</strong>{" "}
                <code className="font-mono text-xs">{selected.output_directory || "—"}</code>
              </div>

              <CodeBlock code={codeSnippet} language="python" showCopy />

              <div className="text-sm text-[var(--color-text-secondary)]">
                <p className="font-medium text-[var(--color-text-primary)] mb-1">The SDK will create:</p>
                <ul className="list-disc pl-5 space-y-1">
                  {RECOGNIZED_FILES.map((f) => (
                    <li key={f.filename}>
                      <code className="rounded bg-[var(--color-card)] px-1 py-0.5 text-xs font-mono">{f.filename}</code>
                      {" — "}{f.description}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-[var(--color-text-secondary)]">
                Copy this prompt into ChatGPT, Claude, Cursor, Cline, or any other LLM tool
                to have it integrate the SDK into your Python training script automatically.
              </p>

              <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                <strong>Output directory:</strong>{" "}
                <code className="font-mono text-xs">{selected.output_directory || "—"}</code>
              </div>

              <CodeBlock code={llmPrompt} language="text" showCopy />
            </div>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-[var(--color-border)] p-6">
        <h3 className="text-sm font-medium text-[var(--color-text-primary)]">Outputs</h3>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Detected files in the run output directory.
        </p>
        {outputItems.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--color-muted)]">No recognized files found.</p>
        ) : (
          <div className="mt-4 divide-y divide-[var(--color-border)]">
            {outputItems.map((o) => (
              <div key={o.filename} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  {o.found ? (
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                  ) : (
                    <X className="h-4 w-4 text-[var(--color-text-secondary)] shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">{o.filename}</p>
                    <p className="text-xs text-[var(--color-muted)]">
                      {o.found
                        ? `${o.type} · ${formatBytes(o.file_size)}`
                        : "Not yet published"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {editOpen && (
        <Modal title="Edit Run" onClose={() => setEditOpen(false)}>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField label="Model Name" required>
              <input className="mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm" value={form.model_name} onChange={(e) => setForm({ ...form, model_name: e.target.value })} required />
            </FormField>
            <FormField label="Notes">
              <textarea className="mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </FormField>
            <FormField label="Seed">
              <input type="number" className="mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm" value={form.seed} onChange={(e) => setForm({ ...form, seed: e.target.value })} />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Framework">
                <input className="mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm" value={form.framework} onChange={(e) => setForm({ ...form, framework: e.target.value })} />
              </FormField>
              <FormField label="Execution Device">
                <input className="mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm" value={form.execution_device} onChange={(e) => setForm({ ...form, execution_device: e.target.value })} />
              </FormField>
            </div>
            <FormField label="Git Commit">
              <input className="mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm" value={form.git_commit} onChange={(e) => setForm({ ...form, git_commit: e.target.value })} />
            </FormField>
            <FormField label="Repository URL">
              <input className="mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm" value={form.repository_url} onChange={(e) => setForm({ ...form, repository_url: e.target.value })} />
            </FormField>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setEditOpen(false)} className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm hover:bg-[var(--color-card)]">Cancel</button>
              <button type="submit" className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-hover)]">Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
