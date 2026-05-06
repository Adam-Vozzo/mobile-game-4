/**
 * Structured feedback writer.
 *
 * Each entry: { timestamp, tag, config, note }
 *
 * In a browser we can't write to the repo's `TWEAKS_FEEDBACK.jsonl` directly.
 * The strategy:
 *  1. Append the entry to a localStorage buffer (append-only).
 *  2. Copy the single new JSONL line to the clipboard immediately so the
 *     human can paste it into the file.
 *  3. Provide a "Download all" action that emits the entire buffer as a
 *     downloadable .jsonl file.
 *
 * This way feedback is never lost even on phones where pasting straight to a
 * GitHub repo is awkward.
 */
import { snapshotConfig } from './registry';

export type FeedbackTag = 'LIKE' | 'DISLIKE' | 'COMPARE';

export interface FeedbackEntry {
  timestamp: string; // ISO 8601
  tag: FeedbackTag;
  buildVersion: string;
  note: string;
  config: ReturnType<typeof snapshotConfig>;
}

const BUFFER_KEY = 'neondrift.tweaks-feedback';

export function loadBuffer(): FeedbackEntry[] {
  try {
    const raw = localStorage.getItem(BUFFER_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return parsed as FeedbackEntry[];
    return [];
  } catch {
    return [];
  }
}

function saveBuffer(entries: FeedbackEntry[]): void {
  try {
    localStorage.setItem(BUFFER_KEY, JSON.stringify(entries));
  } catch {
    // ignore
  }
}

export interface RecordResult {
  entry: FeedbackEntry;
  jsonl: string;
  /** true if we successfully wrote the line to the clipboard */
  copiedToClipboard: boolean;
}

export async function recordFeedback(tag: FeedbackTag, note: string): Promise<RecordResult> {
  const cfg = snapshotConfig();
  const entry: FeedbackEntry = {
    timestamp: new Date().toISOString(),
    tag,
    buildVersion: cfg.buildVersion,
    note: note.trim(),
    config: cfg,
  };
  const buf = loadBuffer();
  buf.push(entry);
  saveBuffer(buf);
  const jsonl = JSON.stringify(entry) + '\n';

  let copiedToClipboard = false;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(jsonl);
      copiedToClipboard = true;
    }
  } catch {
    copiedToClipboard = false;
  }
  return { entry, jsonl, copiedToClipboard };
}

export function clearBuffer(): void {
  saveBuffer([]);
}

/** Trigger a browser download of the full buffer as one JSONL file. */
export function downloadBuffer(): void {
  const buf = loadBuffer();
  const text = buf.map((e) => JSON.stringify(e)).join('\n') + (buf.length ? '\n' : '');
  const blob = new Blob([text], { type: 'application/x-ndjson' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tweaks-feedback-${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Copy current config snapshot to clipboard. */
export async function exportConfigToClipboard(): Promise<boolean> {
  const json = JSON.stringify(snapshotConfig(), null, 2);
  try {
    await navigator.clipboard.writeText(json);
    return true;
  } catch {
    return false;
  }
}
