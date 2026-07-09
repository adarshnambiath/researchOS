import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Pencil, Check, X } from "lucide-react";
import { useRunStore } from "../stores/runStore";
import { CodeBlock } from "../components/CodeBlock";
import { FormField } from "../components/FormField";
import { Modal } from "../components/Modal";
import { formatDate, formatBytes } from "../lib/format";
import { fetchExperiment } from "../api/experiments";
import { fetchDataset } from "../api/datasets";

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
  const [datasetModality, setDatasetModality] = useState<string | null>(null);
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

  // Fetch dataset modality for conditional SDK guidance
  useEffect(() => {
    if (!selected?.experiment_id) return;
    fetchExperiment(selected.experiment_id)
      .then((exp) => fetchDataset(exp.dataset_id))
      .then((ds) => setDatasetModality(ds.modality))
      .catch(() => setDatasetModality(null));
  }, [selected?.experiment_id]);

  if (loading) return <div className="p-6 text-sm text-(--color-muted)">Loading…</div>;
  if (error) return <div className="p-6 text-sm text-red-600">{error}</div>;
  if (!selected) return <div className="p-6 text-sm text-(--color-muted)">Run not found.</div>;

  const isWfdb = datasetModality === "ecg_wfdb";

  // ── SDK code snippet (Tab 1) ──────────────────────────────────────
  const baseCodeSnippet = `import sys

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
    probabilities=probabilities,`;

  const wfdbColumnsSnippet = `    columns={
        "record_name": record_names,
        "window_start": window_starts,
        "window_end": window_ends,
    },`;

  const codeSuffix = `)

session.publish_artifact(
    type="MODEL_CHECKPOINT",
    path="./models/best_model.pt",
    name="Best Model",
)

session.finish()`;

  const codeSnippet = isWfdb
    ? `${baseCodeSnippet}
${wfdbColumnsSnippet}
${codeSuffix}`
    : `${baseCodeSnippet}
${codeSuffix}`;

  // ── LLM prompt (Tab 2) ────────────────────────────────────────────
  const baseLlmPrompt = `You are integrating a standalone experiment evaluation SDK into an existing Python machine learning training script.

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
- If optional information such as probabilities, metadata, artifacts or provenance already exists in the user's code, connect it to the SDK.
- Do not invent missing information.
- Do not modify preprocessing solely to satisfy the SDK.`;

  const wfdbLlmGuidance = `
- This dataset uses WFDB ECG records. If the preprocessing pipeline already computes provenance information such as record_name, window_start, and window_end for each evaluation sample, include them using the optional columns argument:

    columns={
        "record_name": record_names,
        "window_start": window_starts,
        "window_end": window_ends,
    }

- Every list in columns must have the same length as sample_ids.
- Do not invent provenance. Only publish values that already exist in the preprocessing pipeline.
- Do not modify preprocessing logic solely to satisfy the SDK.
- If these values are not available in the pipeline, omit columns entirely.`;

  const baseLlmSuffix = `
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

  const llmPrompt = isWfdb
    ? `${baseLlmPrompt}${wfdbLlmGuidance}${baseLlmSuffix}`
    : `${baseLlmPrompt}${baseLlmSuffix}`;

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
        <Link to={`/experiments/${(selected as any).experiment_id}`} className="text-sm text-(--color-text-secondary) hover:text-(--color-text-primary)">
          <ArrowLeft className="h-4 w-4 inline mr-1" /> Back
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-(--color-text-primary)">{selected.model_name}</h1>
          <p className="text-sm text-(--color-text-secondary)">{selected.experiment_name}</p>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/experiments/${(selected as any).experiment_id}/runs/${selected.id}/evaluation`}
            className="inline-flex items-center gap-2 rounded-lg bg-(--color-primary) px-4 py-2 text-sm font-medium text-white hover:bg-(--color-hover-button)"
          >
            View Evaluation
          </Link>
          <button onClick={openEdit} className="inline-flex items-center gap-2 rounded-lg border border-(--color-border) px-4 py-2 text-sm font-medium hover:bg-(--color-card)">
            <Pencil className="h-4 w-4" /> Edit
          </button>
        </div>
      </div>

      <section className="rounded-lg border border-(--color-border) p-6">
        <h3 className="text-sm font-medium text-(--color-text-primary)">Metadata</h3>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-(--color-muted)">Experiment</dt>
            <dd className="mt-1 text-sm text-(--color-text-primary)">{selected.experiment_name}</dd>
          </div>
          <div>
            <dt className="text-xs text-(--color-muted)">Created</dt>
            <dd className="mt-1 text-sm text-(--color-text-primary)">{formatDate(selected.created_at)}</dd>
          </div>
          <div>
            <dt className="text-xs text-(--color-muted)">Seed</dt>
            <dd className="mt-1 text-sm text-(--color-text-primary)">{selected.seed ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-(--color-muted)">Framework</dt>
            <dd className="mt-1 text-sm text-(--color-text-primary)">{selected.framework ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-(--color-muted)">Git Commit</dt>
            <dd className="mt-1 text-sm text-(--color-text-primary)">{selected.git_commit ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-(--color-muted)">Output Directory</dt>
            <dd className="mt-1 text-sm text-(--color-text-primary) font-mono break-all">{selected.output_directory ?? "—"}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-(--color-border) p-6">
        <h3 className="text-sm font-medium text-(--color-text-primary)">SDK Integration</h3>
        <p className="mt-2 text-sm text-(--color-text-secondary)">
          Integrate the <code className="rounded bg-(--color-card) px-1 py-0.5 text-xs font-mono">experiment_sdk</code> into your training script.
          The SDK writes standardized outputs to the run output directory.
        </p>

        {/* Tabs */}
        <div className="mt-4 border-b border-(--color-border)">
          <nav className="-mb-px flex gap-6">
            <button
              onClick={() => setSdkTab("manual")}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                sdkTab === "manual"
                  ? "border-(--color-primary) text-(--color-text-primary)"
                  : "border-transparent text-(--color-muted) hover:text-(--color-text-secondary) hover:border-(--color-border)"
              }`}
            >
              Manual Integration
            </button>
            <button
              onClick={() => setSdkTab("prompt")}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                sdkTab === "prompt"
                  ? "border-(--color-primary) text-(--color-text-primary)"
                  : "border-transparent text-(--color-muted) hover:text-(--color-text-secondary) hover:border-(--color-border)"
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
              <p className="text-sm text-(--color-text-secondary)">
                Since the SDK is still under development, temporarily add the SDK path to <code className="rounded bg-(--color-card) px-1 py-0.5 text-xs font-mono">sys.path</code>,
                then create an <code className="rounded bg-(--color-card) px-1 py-0.5 text-xs font-mono">ExperimentSession</code> pointing at the run output directory.
              </p>

              <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                <strong>Output directory:</strong>{" "}
                <code className="font-mono text-xs">{selected.output_directory || "—"}</code>
              </div>

              <CodeBlock code={codeSnippet} language="python" showCopy />

              {/* Research OS Capabilities */}
              <div className="mt-6 space-y-3">
                <h3 className="text-sm font-medium text-(--color-text-primary)">Research OS Capabilities</h3>
                <div className="overflow-x-auto rounded-lg border border-(--color-border)">
                  <table className="min-w-full text-sm">
                    <thead className="bg-(--color-card)">
                      <tr>
                        <th className="px-4 py-2 font-medium text-(--color-text-secondary) text-left">Information Published</th>
                        <th className="px-4 py-2 font-medium text-(--color-text-secondary) text-left">Research OS Capability</th>
                        <th className="px-4 py-2 font-medium text-(--color-text-secondary) text-left">Required</th>
                        <th className="px-4 py-2 font-medium text-(--color-text-secondary) text-left">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-(--color-border)">
                      <tr>
                        <td className="px-4 py-3"><code className="rounded bg-(--color-card) px-1 py-0.5 text-xs font-mono">sample_ids</code></td>
                        <td className="px-4 py-3">Per-sample investigation</td>
                        <td className="px-4 py-3"><span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Required</span></td>
                        <td className="px-4 py-3 text-(--color-text-secondary)">Every evaluated sample should have a unique identifier.</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3"><code className="rounded bg-(--color-card) px-1 py-0.5 text-xs font-mono">ground_truth</code> + <code className="rounded bg-(--color-card) px-1 py-0.5 text-xs font-mono">predictions</code></td>
                        <td className="px-4 py-3">Metrics, confusion matrix, filtering</td>
                        <td className="px-4 py-3"><span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Required</span></td>
                        <td className="px-4 py-3 text-(--color-text-secondary)"></td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3"><code className="rounded bg-(--color-card) px-1 py-0.5 text-xs font-mono">probabilities</code></td>
                        <td className="px-4 py-3">Confidence scores and confidence-based filtering</td>
                        <td className="px-4 py-3"><span className="inline-flex items-center rounded-full bg-(--color-hover) px-2 py-0.5 text-xs font-medium text-(--color-muted)">Optional</span></td>
                        <td className="px-4 py-3 text-(--color-text-secondary)">Only publish if already available.</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3"><code className="rounded bg-(--color-card) px-1 py-0.5 text-xs font-mono">metadata</code></td>
                        <td className="px-4 py-3">Experiment grouping and contextual information</td>
                        <td className="px-4 py-3"><span className="inline-flex items-center rounded-full bg-(--color-hover) px-2 py-0.5 text-xs font-medium text-(--color-muted)">Optional</span></td>
                        <td className="px-4 py-3 text-(--color-text-secondary)">Examples include dataset version, fold number, split, model variant.</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3"><code className="rounded bg-(--color-card) px-1 py-0.5 text-xs font-mono">artifacts</code></td>
                        <td className="px-4 py-3">Artifact browser</td>
                        <td className="px-4 py-3"><span className="inline-flex items-center rounded-full bg-(--color-hover) px-2 py-0.5 text-xs font-medium text-(--color-muted)">Optional</span></td>
                        <td className="px-4 py-3 text-(--color-text-secondary)">Only register files that already exist.</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3"><code className="rounded bg-(--color-card) px-1 py-0.5 text-xs font-mono">columns</code> (additional)</td>
                        <td className="px-4 py-3">Advanced investigation features</td>
                        <td className="px-4 py-3"><span className="inline-flex items-center rounded-full bg-(--color-hover) px-2 py-0.5 text-xs font-medium text-(--color-muted)">Optional</span></td>
                        <td className="px-4 py-3 text-(--color-text-secondary)">Arbitrary per-sample columns published into <code className="rounded bg-(--color-card) px-1 py-0.5 text-xs font-mono">evaluation.parquet</code>.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {isWfdb && (
                <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 space-y-3">
                  <p className="font-medium">Waveform Navigation</p>
                  <p>To enable waveform visualization directly from evaluation results, publish the following provenance columns:</p>
                  <CodeBlock code={`columns={\n    "record_name": record_names,\n    "window_start": window_starts,\n    "window_end": window_ends,\n}`} language="python" showCopy />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <p className="font-medium"><code className="rounded bg-blue-100 px-1 py-0.5 text-xs font-mono">record_name</code></p>
                      <p className="text-xs text-blue-700">The original WFDB record (e.g. 100, 101, 102)</p>
                    </div>
                    <div>
                      <p className="font-medium"><code className="rounded bg-blue-100 px-1 py-0.5 text-xs font-mono">window_start</code></p>
                      <p className="text-xs text-blue-700">The first sample index of the extracted beat.</p>
                    </div>
                    <div>
                      <p className="font-medium"><code className="rounded bg-blue-100 px-1 py-0.5 text-xs font-mono">window_end</code></p>
                      <p className="text-xs text-blue-700">The last sample index of the extracted beat.</p>
                    </div>
                  </div>
                  <p className="text-xs text-blue-700">
                    These values are normally already available during beat extraction.
                    The SDK stores them without interpretation.
                    The Research OS later uses them to reconstruct the original ECG segment when investigating predictions.
                  </p>
                </div>
              )}

              {/* Missing Information */}
              <div className="mt-6 rounded-lg border border-(--color-border) p-4 text-sm space-y-3">
                <p className="font-medium text-(--color-text-primary)">What happens if information is not published?</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-md border border-(--color-border) p-3">
                    <p className="font-medium text-(--color-text-primary)">Missing probabilities</p>
                    <p className="mt-1 text-xs text-(--color-text-secondary)">Metrics still work. Confidence visualization is unavailable.</p>
                  </div>
                  <div className="rounded-md border border-(--color-border) p-3">
                    <p className="font-medium text-(--color-text-primary)">Missing artifacts</p>
                    <p className="mt-1 text-xs text-(--color-text-secondary)">Experiment evaluation works normally. The artifact browser will simply be empty.</p>
                  </div>
                  <div className="rounded-md border border-(--color-border) p-3">
                    <p className="font-medium text-(--color-text-primary)">Missing waveform provenance</p>
                    <p className="mt-1 text-xs text-(--color-text-secondary)">Metrics, confusion matrix, filtering, and the evaluation table all continue to work normally. Only waveform navigation is unavailable because the platform cannot reconstruct the original ECG segment without provenance. The SDK does not infer or fabricate provenance.</p>
                  </div>
                </div>
              </div>

              <div className="text-sm text-(--color-text-secondary)">
                <p className="font-medium text-(--color-text-primary) mb-1">The SDK will create:</p>
                <ul className="list-disc pl-5 space-y-1">
                  {RECOGNIZED_FILES.map((f) => (
                    <li key={f.filename}>
                      <code className="rounded bg-(--color-card) px-1 py-0.5 text-xs font-mono">{f.filename}</code>
                      {" — "}{f.description}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-(--color-text-secondary)">
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

      <section className="rounded-lg border border-(--color-border) p-6">
        <h3 className="text-sm font-medium text-(--color-text-primary)">Outputs</h3>
        <p className="mt-1 text-sm text-(--color-muted)">
          Detected files in the run output directory.
        </p>
        {outputItems.length === 0 ? (
          <p className="mt-3 text-sm text-(--color-muted)">No recognized files found.</p>
        ) : (
          <div className="mt-4 divide-y divide-(--color-border)">
            {outputItems.map((o) => (
              <div key={o.filename} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  {o.found ? (
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                  ) : (
                    <X className="h-4 w-4 text-(--color-text-secondary) shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-(--color-text-primary)">{o.filename}</p>
                    <p className="text-xs text-(--color-muted)">
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
              <input className="mt-1 w-full rounded-md border border-(--color-border) px-3 py-2 text-sm" value={form.model_name} onChange={(e) => setForm({ ...form, model_name: e.target.value })} required />
            </FormField>
            <FormField label="Notes">
              <textarea className="mt-1 w-full rounded-md border border-(--color-border) px-3 py-2 text-sm" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </FormField>
            <FormField label="Seed">
              <input type="number" className="mt-1 w-full rounded-md border border-(--color-border) px-3 py-2 text-sm" value={form.seed} onChange={(e) => setForm({ ...form, seed: e.target.value })} />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Framework">
                <input className="mt-1 w-full rounded-md border border-(--color-border) px-3 py-2 text-sm" value={form.framework} onChange={(e) => setForm({ ...form, framework: e.target.value })} />
              </FormField>
              <FormField label="Execution Device">
                <input className="mt-1 w-full rounded-md border border-(--color-border) px-3 py-2 text-sm" value={form.execution_device} onChange={(e) => setForm({ ...form, execution_device: e.target.value })} />
              </FormField>
            </div>
            <FormField label="Git Commit">
              <input className="mt-1 w-full rounded-md border border-(--color-border) px-3 py-2 text-sm" value={form.git_commit} onChange={(e) => setForm({ ...form, git_commit: e.target.value })} />
            </FormField>
            <FormField label="Repository URL">
              <input className="mt-1 w-full rounded-md border border-(--color-border) px-3 py-2 text-sm" value={form.repository_url} onChange={(e) => setForm({ ...form, repository_url: e.target.value })} />
            </FormField>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setEditOpen(false)} className="rounded-md border border-(--color-border) px-4 py-2 text-sm hover:bg-(--color-card)">Cancel</button>
              <button type="submit" className="rounded-md bg-(--color-primary) px-4 py-2 text-sm font-medium text-white hover:bg-(--color-hover-button)">Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
