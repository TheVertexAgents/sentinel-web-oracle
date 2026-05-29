import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { PipelineState, PipelineStatus, ThreatVerdict } from '../types';

interface AppState {
  currentAsset: string;
  isDemoMode: boolean;
  isScanning: boolean;
  pipeline: PipelineState;
  verdict: ThreatVerdict | null;
  history: { asset: string; action: string; timestamp: string; threatLevel?: string }[];
  error: string | null;
  networkIntensity: number;
}

const initialPipelineState: PipelineState = {
  disambiguation: 'idle',
  search: 'idle',
  scrape: 'idle',
  synthesis: 'idle',
  nodes: { exploit: 'idle', sec: 'idle', flash: 'idle' },
  unlockedSources: [],
};

const initialState: AppState = {
  currentAsset: '',
  isDemoMode: false,
  isScanning: false,
  pipeline: initialPipelineState,
  verdict: null,
  history: [],
  error: null,
  networkIntensity: 5,
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setCurrentAsset: (state, action: PayloadAction<string>) => {
      state.currentAsset = action.payload;
    },
    toggleDemoMode: (state) => {
      state.isDemoMode = !state.isDemoMode;
    },
    startScan: (state, action: PayloadAction<string>) => {
      state.isScanning = true;
      state.currentAsset = action.payload;
      state.pipeline = initialPipelineState;
      state.verdict = null;
      state.error = null;
      state.networkIntensity = 15;
    },
    setPipelineStatus: (state, action: PayloadAction<{ step: keyof Omit<PipelineState, 'nodes' | 'unlockedSources'>; status: PipelineStatus }>) => {
      state.pipeline[action.payload.step] = action.payload.status;
    },
    setNodeStatus: (state, action: PayloadAction<{ node: keyof PipelineState['nodes']; status: PipelineStatus }>) => {
      state.pipeline.nodes[action.payload.node] = action.payload.status;
    },
    unlockSource: (state, action: PayloadAction<string>) => {
      if (!state.pipeline.unlockedSources.includes(action.payload)) {
        state.pipeline.unlockedSources.push(action.payload);
      }
    },
    setVerdict: (state, action: PayloadAction<ThreatVerdict>) => {
      state.verdict = action.payload;
      state.isScanning = false;
      state.networkIntensity = 5;
    },
    addHistory: (state, action: PayloadAction<{ asset: string; action: string; threatLevel?: string }>) => {
      state.history.unshift({
        ...action.payload,
        timestamp: new Date().toISOString(),
      });
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isScanning = false;
      state.networkIntensity = 5;
    },
    setNetworkIntensity: (state, action: PayloadAction<number>) => {
      state.networkIntensity = action.payload;
    }
  },
});

export const {
  setCurrentAsset,
  toggleDemoMode,
  startScan,
  setPipelineStatus,
  setNodeStatus,
  unlockSource,
  setVerdict,
  addHistory,
  setError,
  setNetworkIntensity,
} = appSlice.actions;

export default appSlice.reducer;
