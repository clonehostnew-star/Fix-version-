import type { DetectMongoDBConfigOutput } from '@/ai/flows/detect-mongodb-config';

export interface DeploymentLog {
  id: string;
  timestamp: string;
  stream: 'stdout' | 'stderr' | 'system' | 'input';
  message: string;
}

export interface DeploymentDetails {
  fileName: string | null;
  fileList: string[];
  packageJsonContent: Record<string, any> | null;
  dependencies: Record<string, string> | null;
}

export type MongoDbAnalysisResult = DetectMongoDBConfigOutput;

export type StreamedBotDeployData =
  | { type: 'init'; deploymentId: string }
  | { type: 'status'; message: string; stage: 'starting' | 'unpacking' | 'installing' | 'running' | 'analyzing' | 'finished' | 'stopped' | 'error' }
  | { type: 'log'; log: DeploymentLog }
  | { type: 'details'; details: Partial<DeploymentDetails> }
  | { type: 'mongo'; mongo: MongoDbAnalysisResult }
  | { type: 'error'; message: string };

export interface BotDeployState {
  deploymentId: string | null;
  status: string;
  stage: 'idle' | 'starting' | 'unpacking' | 'installing' | 'running' | 'analyzing' | 'finished' | 'stopped' | 'error';
  logs: DeploymentLog[];
  qrLogs: DeploymentLog[];
  details: DeploymentDetails;
  mongoDbInfo: MongoDbAnalysisResult | null;
  error: string | null;
  isDeploying: boolean;
  persisted?: boolean;
}

export interface FileNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  size: number;
}
