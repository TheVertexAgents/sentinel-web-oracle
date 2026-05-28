import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'sentinel.db');

// Ensure the directory exists (not strictly necessary for cwd, but good practice)
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

// Promisify database methods
export const dbRun = promisify(db.run.bind(db));
export const dbGet = promisify(db.get.bind(db));
export const dbAll = promisify(db.all.bind(db));

export async function initDb() {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS verdicts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset TEXT NOT NULL,
      threatLevel TEXT NOT NULL,
      riskAction TEXT NOT NULL,
      riskReason TEXT,
      summary TEXT,
      confidenceScore INTEGER,
      sourcesChecked TEXT,
      brightDataCallsUsed INTEGER,
      timestamp TEXT NOT NULL
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS monitors (
      id TEXT PRIMARY KEY,
      assets TEXT NOT NULL,
      intervalSeconds INTEGER NOT NULL,
      webhookUrl TEXT,
      startedAt TEXT NOT NULL
    )
  `);

  console.log('[DB] Database initialized');
}

export interface VerdictRecord {
  asset: string;
  threatLevel: string;
  riskAction: string;
  riskReason: string;
  summary: string;
  confidenceScore: number;
  sourcesChecked: string; // JSON string array
  brightDataCallsUsed: number;
  timestamp: string;
}

export async function saveVerdict(verdict: VerdictRecord) {
  return new Promise<void>((resolve, reject) => {
    db.run(
      `INSERT INTO verdicts (
        asset, threatLevel, riskAction, riskReason, summary,
        confidenceScore, sourcesChecked, brightDataCallsUsed, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        verdict.asset,
        verdict.threatLevel,
        verdict.riskAction,
        verdict.riskReason,
        verdict.summary,
        verdict.confidenceScore,
        verdict.sourcesChecked,
        verdict.brightDataCallsUsed,
        verdict.timestamp
      ],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

export async function getHistory(asset: string, hoursBack: number): Promise<VerdictRecord[]> {
  const cutoff = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM verdicts WHERE asset = ? AND timestamp >= ? ORDER BY timestamp DESC',
      [asset, cutoff],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows as VerdictRecord[]);
      }
    );
  });
}

/** Get the latest verdict for each asset seen in the last 24 hours */
export async function getLatestUniqueSignals(): Promise<VerdictRecord[]> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM verdicts
       WHERE id IN (SELECT MAX(id) FROM verdicts WHERE timestamp >= ? GROUP BY asset)
       ORDER BY timestamp DESC`,
      [cutoff],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows as VerdictRecord[]);
      }
    );
  });
}

export interface MonitorRecord {
  id: string;
  assets: string; // JSON string array
  intervalSeconds: number;
  webhookUrl?: string;
  startedAt: string;
}

export async function saveMonitor(monitor: MonitorRecord) {
  return new Promise<void>((resolve, reject) => {
    db.run(
      'INSERT INTO monitors (id, assets, intervalSeconds, webhookUrl, startedAt) VALUES (?, ?, ?, ?, ?)',
      [monitor.id, monitor.assets, monitor.intervalSeconds, monitor.webhookUrl, monitor.startedAt],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

export async function deleteMonitor(id: string) {
  return new Promise<void>((resolve, reject) => {
    db.run('DELETE FROM monitors WHERE id = ?', [id], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export async function getAllMonitors(): Promise<MonitorRecord[]> {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM monitors', [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows as MonitorRecord[]);
    });
  });
}
