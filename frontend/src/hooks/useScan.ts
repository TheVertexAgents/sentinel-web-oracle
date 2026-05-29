import { useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store';
import {
  setPipelineStatus,
  setNodeStatus,
  unlockSource,
  setVerdict,
  addHistory,
  setError,
} from '../store/appSlice';
import type { AgentEvent } from '../types';

export const useScan = () => {
  const dispatch = useDispatch();
  const { isDemoMode } = useSelector((state: RootState) => state.app);
  const sseRef = useRef<EventSource | null>(null);

  const handleToolCall = useCallback((event: AgentEvent, asset: string) => {
    const tool = event.tool;
    const input = event.input ? JSON.stringify(event.input).toLowerCase() : '';

    if (tool === 'search_web') {
      if (input.includes('canonical') || input.includes('official') || input.includes('name')) {
        dispatch(setPipelineStatus({ step: 'disambiguation', status: 'active' }));
        dispatch(addHistory({ asset, action: 'IDENTITY_RESOLVING' }));
      } else {
        dispatch(setPipelineStatus({ step: 'search', status: 'active' }));
        dispatch(addHistory({ asset, action: 'THREAT_SEARCH_STARTED' }));

        if (input.includes('exploit') || input.includes('hack') || input.includes('attack')) {
          dispatch(setNodeStatus({ node: 'exploit', status: 'active' }));
        }
        if (input.includes('sec') || input.includes('enforcement') || input.includes('regulatory')) {
          dispatch(setNodeStatus({ node: 'sec', status: 'active' }));
        }
        if (input.includes('flash loan') || input.includes('defi exploit') || input.includes('liquidity')) {
          dispatch(setNodeStatus({ node: 'flash', status: 'active' }));
        }
      }
    } else if (tool === 'scrape_url' || tool === 'browser_scrape') {
      dispatch(setPipelineStatus({ step: 'scrape', status: 'active' }));
      dispatch(addHistory({ asset, action: 'DEEP_SCRAPE_STARTED' }));

      const nodeId = input.includes('eu') ? 'node-eu' : (input.includes('us') ? 'node-us' : (input.includes('asia') ? 'node-asia' : 'node-generic'));
      window.dispatchEvent(new CustomEvent('pulse-map', { detail: nodeId }));

      if (input.includes('coindesk')) dispatch(unlockSource('coindesk'));
      if (input.includes('twitter') || input.includes('x.com')) dispatch(unlockSource('twitter'));
      if (input.includes('reddit')) dispatch(unlockSource('reddit'));
    } else if (tool === 'synthesis') {
      dispatch(setPipelineStatus({ step: 'synthesis', status: 'active' }));
      dispatch(addHistory({ asset, action: 'SYNTHESIS_ACTIVE' }));
    }
  }, [dispatch]);

  const handleToolResult = useCallback((_event: AgentEvent, asset: string, pipeline: any) => {
    if (pipeline.disambiguation === 'active') {
      dispatch(setPipelineStatus({ step: 'disambiguation', status: 'verified' }));
      dispatch(addHistory({ asset, action: 'IDENTITY_CONFIRMED' }));
    }

    if (pipeline.nodes.exploit === 'active') dispatch(setNodeStatus({ node: 'exploit', status: 'completed' }));
    if (pipeline.nodes.sec === 'active') dispatch(setNodeStatus({ node: 'sec', status: 'completed' }));
    if (pipeline.nodes.flash === 'active') dispatch(setNodeStatus({ node: 'flash', status: 'completed' }));
  }, [dispatch]);

  const runDemoScan = useCallback((asset: string) => {
    setTimeout(() => {
      handleToolCall({ type: 'tool_call', tool: 'search_web', input: { query: 'canonical name for ' + asset } }, asset);
      setTimeout(() => {
        handleToolResult({ type: 'tool_result' }, asset, { disambiguation: 'active', nodes: {} });
        handleToolCall({ type: 'tool_call', tool: 'search_web', input: { query: asset + ' exploit news' } }, asset);
        setTimeout(() => {
          handleToolCall({ type: 'tool_call', tool: 'scrape_url', input: { url: 'https://coindesk.com/' + asset } }, asset);
          setTimeout(() => {
            handleToolCall({ type: 'tool_call', tool: 'synthesis' }, asset);
            setTimeout(() => {
              const level = Math.random() > 0.5 ? 'CRITICAL' : 'NOMINAL';
              const v = {
                asset: asset,
                threatLevel: level as any,
                riskAction: level === 'CRITICAL' ? 'HOLD' : 'CLEAR',
                confidenceScore: level === 'CRITICAL' ? 92 : 12,
                summary: `Demo mode analysis completed for ${asset}.`,
                riskReason: level === 'CRITICAL' ? `Critical threat detected for ${asset}.` : `No significant threats detected for ${asset}.`,
                timestamp: new Date().toISOString(),
                evidence: [{ title: 'Security Alert ' + asset, url: '#', source: 'Internal' }],
                sourcesChecked: ['Internal'],
                brightDataCallsUsed: 5
              };
              dispatch(setPipelineStatus({ step: 'synthesis', status: 'completed' }));
              dispatch(setVerdict(v));
              dispatch(addHistory({ asset, action: `SCAN_COMPLETE_${level}`, threatLevel: level }));
            }, 1500);
          }, 1500);
        }, 1500);
      }, 1500);
    }, 500);
  }, [dispatch, handleToolCall, handleToolResult]);

  const startAnalysis = useCallback((asset: string, pipeline: any) => {
    if (sseRef.current) sseRef.current.close();

    if (isDemoMode) {
      runDemoScan(asset);
      return;
    }

    let retryCount = 0;
    const maxRetries = 3;

    const connect = () => {
      const sse = new EventSource(`/stream?asset=${encodeURIComponent(asset)}`);
      sseRef.current = sse;

      sse.onmessage = (e) => {
        let event: AgentEvent;
        try { event = JSON.parse(e.data); } catch { return; }

        if (event.type === 'tool_call') {
          handleToolCall(event, asset);
        } else if (event.type === 'tool_result') {
          handleToolResult(event, asset, pipeline);
        } else if (event.type === 'verdict' && event.verdict) {
          dispatch(setPipelineStatus({ step: 'synthesis', status: 'completed' }));
          dispatch(setVerdict(event.verdict));
          dispatch(addHistory({ asset, action: `SCAN_COMPLETE_${event.verdict.threatLevel}`, threatLevel: event.verdict.threatLevel }));
          sse.close();
        } else if (event.type === 'error') {
          dispatch(setError(event.message || 'Unknown error'));
          dispatch(addHistory({ asset, action: 'ERROR_INTERNAL' }));
          sse.close();
        }
      };

      sse.onerror = () => {
        sse.close();
        if (retryCount < maxRetries) {
          retryCount++;
          dispatch(addHistory({ asset, action: `RETRYING_CONNECTION (${retryCount}/${maxRetries})...` }));
          setTimeout(connect, 2000);
        } else {
          dispatch(setError('Connection failed after multiple attempts.'));
        }
      };
    };

    connect();
  }, [isDemoMode, dispatch, handleToolCall, handleToolResult, runDemoScan]);

  return { startAnalysis };
};
