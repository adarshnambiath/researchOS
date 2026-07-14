import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { Datasets } from "./pages/Datasets";
import { DatasetDetail } from "./pages/DatasetDetail";
import { Experiments } from "./pages/Experiments";
import { ExperimentDetail } from "./pages/ExperimentDetail";
import { Runs } from "./pages/Runs";
import { RunDetail } from "./pages/RunDetail";
import { RunEvaluation } from "./pages/RunEvaluation";
import { Investigation } from "./pages/Investigation";
import { WaveformViewerPage } from "./pages/WaveformViewer";
import { PatchViewer } from "./pages/PatchViewer";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/datasets" element={<Datasets />} />
        <Route path="/datasets/:id" element={<DatasetDetail />} />
        <Route path="/datasets/:id/patch" element={<PatchViewer />} />
        <Route path="/datasets/:datasetId/waveforms/:waveformName" element={<WaveformViewerPage />} />
        <Route path="/experiments" element={<Experiments />} />
        <Route path="/experiments/:id" element={<ExperimentDetail />} />
        <Route path="/experiments/:experimentId/runs/:runId" element={<RunDetail />} />
        <Route path="/experiments/:experimentId/runs/:runId/evaluation" element={<RunEvaluation />} />
        <Route path="/experiments/:experimentId/runs/:runId/evaluation/waveform" element={<WaveformViewerPage />} />
        <Route path="/experiments/:experimentId/runs/:runId/investigate" element={<Investigation />} />
        <Route path="/runs" element={<Runs />} />
        <Route path="/runs/:id" element={<RunDetail />} />
        <Route path="/runs/:id/investigate" element={<Investigation />} />
        <Route path="/runs/:id/evaluation/waveform" element={<WaveformViewerPage />} />
      </Route>
    </Routes>
  );
}

// [Docs placeholder] Route hierarchy:
// /datasets → Datasets page
// /datasets/:id → DatasetDetail with Experiments tab and WaveformViewer
// /experiments/:id → ExperimentDetail with Runs tab and Investigation tab
// /runs/:id → RunDetail with WaveformViewer and RunEvaluation
// All routes render inside Layout (sidebar + content)
