/**
 * Socratic Schema Definitions (v0.1.2)
 * Strictly defines the IPC payloads emitted by the kepoin Telemetry Hub.
 * The reskyu daemon MUST use these interfaces to parse incoming data.
 */

export interface KepoinBasePayload {
  timestamp: string;
}

export interface KepoinCrashPayload extends KepoinBasePayload {
  incidentLocation: string;
  errorMessage: string;
  errorStack?: string;
  isFatal?: boolean;
  localVariables?: Record<string, any>;
  componentStack?: string;
}

export interface KepoinTelemetryPayload extends KepoinBasePayload {
  status: string;
  target: string;
  message?: string;
  [key: string]: any;
}

export interface PhantomSnapshotPayload extends KepoinTelemetryPayload {
  status: 'Phantom Snapshot';
  domContext: string;
  cssContext: Record<string, string>;
  imageSlice: string; // Base64 Canvas Payload
}

export interface DashcamFrame {
  id?: number;
  event: string;
  type?: string;
  location: string;
  timestamp: number;
}

export interface KepoinCompressedEnvelope {
  type: 'kepoin:compressed';
  originalType: 'kepoin:telemetry' | 'kepoin:crash';
  encoding: 'deflate';
  data: string; // Base64 encoded zlib deflated JSON string
}
