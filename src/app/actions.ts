'use server';

import type { BotDeployState, MongoDbAnalysisResult, DeploymentLog, FileNode } from '@/lib/types';
import AdmZip from 'adm-zip';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { spawn, type ChildProcess } from 'child_process';
import { randomUUID } from 'crypto';
import net from 'net';
import { saveDeploymentState, appendLogs, loadDeploymentState, loadLatestDeploymentForServer, clearLogs, deleteDeployment } from '@/lib/persistence';


const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB
const AUTO_RESTART_DELAY = 5000; // 5 seconds
const MAX_RESTART_ATTEMPTS = 5;

// Server deployment store - now tracks by serverId + deploymentId
const serverDeployments = new Map<string, Map<string, {
    state: BotDeployState;
    process: ChildProcess | null;
    botDir: string | null;
    parsedPackageJson: any | null;
    autoRestart: boolean;
    restartAttempts: number;
    maxRestartAttempts: number;
    serverName: string;
    serverId: string;
}>>();

// Helper function to get deployments for a specific server
function getServerDeployments(serverId: string): Map<string, {
    state: BotDeployState;
    process: ChildProcess | null;
    botDir: string | null;
    parsedPackageJson: any | null;
    autoRestart: boolean;
    restartAttempts: number;
    maxRestartAttempts: number;
    serverName: string;
    serverId: string;
}> {
    if (!serverDeployments.has(serverId)) {
        serverDeployments.set(serverId, new Map());
    }
    return serverDeployments.get(serverId)!;
}

// Helper function to find available port
async function getAvailablePort(startPort = 10000): Promise<number> {
    return new Promise<number>((resolve, reject) => {
        const server = net.createServer();
        server.unref();
        server.on('error', reject);
        server.listen(startPort, () => {
            const port = (server.address() as net.AddressInfo).port;
            server.close(() => resolve(port));
        });
    }).catch(() => getAvailablePort(startPort + 1));
}

// Write input to bot process
export async function writeToBot(serverId: string, deploymentId: string, data: string): Promise<{ success: boolean; message?: string }> {
    const deployments = getServerDeployments(serverId);
    const deployment = deployments.get(deploymentId);
    if (!deployment?.process?.stdin) {
        return { success: false, message: 'Process not available' };
    }
    
    deployment.process.stdin.write(data);
    deployment.state.logs.push({
        id: Date.now().toString(),
        stream: 'input',
        message: data,
        timestamp: new Date().toISOString()
    });
    return { success: true };
}

// Get deployment updates
export async function getDeploymentUpdates(serverId: string, deploymentId: string): Promise<BotDeployState | null> {
    const deployments = getServerDeployments(serverId);
    const deployment = deployments.get(deploymentId);
    if (deployment?.state) {
        // Persist periodically
        saveDeploymentState(serverId, deploymentId, deployment.state).catch(() => {});
        return { ...deployment.state, persisted: false } as any;
    }
    // Fallback to persisted storage if in-memory is gone (browser closed, server restarted)
    const persisted = await loadDeploymentState(serverId, deploymentId);
    return persisted ? { ...persisted, persisted: true } as any : null;
}

// Pagination: load older logs
export async function loadOlderLogsAction(serverId: string, deploymentId: string, beforeTimestamp?: number): Promise<DeploymentLog[]> {
    const db = (await import('@/lib/firebase/admin')).getDb();
    const database = db;
    if (!database) return [];
    const key = `${serverId}__${deploymentId}`;
    let q = database.collection('deployments').doc(key).collection('logs').orderBy('ts', 'desc').limit(2000);
    if (beforeTimestamp) q = q.where('ts', '<', beforeTimestamp);
    const snap = await q.get();
    const logs: DeploymentLog[] = [] as any;
    snap.forEach((d: any) => {
        const v = d.data();
        logs.push({ id: String(v.id || v.ts), timestamp: new Date(v.ts).toISOString(), stream: v.stream, message: v.message });
    });
    return logs.reverse();
}

// Check if deployment exists
export async function checkDeploymentExists(serverId: string, deploymentId: string): Promise<boolean> {
    const deployments = getServerDeployments(serverId);
    if (deployments.has(deploymentId)) return true;
    const persisted = await loadDeploymentState(serverId, deploymentId);
    return !!persisted;
}

// Clear deployment logs
export async function clearDeploymentLogs(serverId: string, deploymentId: string): Promise<{ success: boolean }> {
    const deployments = getServerDeployments(serverId);
    const deployment = deployments.get(deploymentId);
    if (!deployment) return { success: false };
    
    deployment.state.logs = [];
    deployment.state.qrLogs = [];
    await clearLogs(serverId, deploymentId).catch(() => {});
    deployment.state.error = null;
    return { success: true };
}

// Completely reset deployment
export async function resetDeploymentState(serverId: string, deploymentId: string): Promise<{ success: boolean }> {
    const deployments = getServerDeployments(serverId);
    const deployment = deployments.get(deploymentId);
    if (deployment) {
        // Clean up process if exists
        if (deployment.process) {
            deployment.process.kill('SIGTERM');
        }
        // Remove temp files
        if (deployment.botDir) {
            await fs.remove(deployment.botDir).catch(() => {});
        }
        deployments.delete(deploymentId);
    }
    try {
        // Also update persisted state to reflect reset
        const deployments = getServerDeployments(serverId);
        const deployment = deployments.get(deploymentId);
        if (deployment) {
            await saveDeploymentState(serverId, deploymentId, deployment.state);
        }
    } catch {}
    return { success: true };
}

// Get server name for a deployment
export async function getServerName(serverId: string, deploymentId: string): Promise<string | null> {
    const deployments = getServerDeployments(serverId);
    const deployment = deployments.get(deploymentId);
    return deployment?.serverName || null;
}

// Internal state management
const updateState = (serverId: string, deploymentId: string, updater: (prevState: BotDeployState) => BotDeployState) => {
    const deployments = getServerDeployments(serverId);
    const deployment = deployments.get(deploymentId);
    if (deployment) {
        deployment.state = updater(deployment.state);
    }
};

const addLog = (serverId: string, deploymentId: string, log: Omit<DeploymentLog, 'id' | 'timestamp'>) => {
    const deployments = getServerDeployments(serverId);
    const deployment = deployments.get(deploymentId);
    if (!deployment) return;
    
    const newLog = { 
        ...log, 
        id: Date.now().toString(), 
        timestamp: new Date().toISOString() 
    };
    
    if (newLog.message.includes('QR code')) {
        deployment.state.qrLogs = [newLog];
    } else {
        deployment.state.logs.push(newLog);
    }
    // Persist log in background (best-effort)
    appendLogs(serverId, deploymentId, [newLog]).catch(() => {});
};

// Install dependencies for a bot with enhanced commands and retries
async function installDependencies(botDir: string, serverId: string, deploymentId: string): Promise<void> {
    // Verify Node version
    addLog(serverId, deploymentId, { stream: 'system', message: 'Checking Node.js version...' });
    await new Promise<void>((resolve, reject) => {
        const proc = spawn('node', ['--version'], { cwd: botDir, shell: true, stdio: 'pipe' });
        proc.stdout?.on('data', (data) => {
            const version = data.toString().trim();
            addLog(serverId, deploymentId, { stream: 'system', message: `Using ${version}` });
            if (!version.includes('v20.')) {
                addLog(serverId, deploymentId, { 
                    stream: 'stderr', 
                    message: 'Warning: Recommended Node.js v20 not detected' 
                });
            }
        });
        proc.on('close', (code) => code === 0 ? resolve() : reject());
        proc.on('error', () => reject());
    }).catch(() => {
        addLog(serverId, deploymentId, { 
            stream: 'stderr', 
            message: 'Could not determine Node.js version' 
        });
    });

    // First check if package.json exists and read it
    const packageJsonPath = path.join(botDir, 'package.json');
    let hasBuildScript = false;
    let hasPostinstall = false;
    let hasPrepare = false;
    
    if (await fs.pathExists(packageJsonPath)) {
        try {
            const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
            const parsedPackageJson = JSON.parse(packageJsonContent);
            hasBuildScript = parsedPackageJson.scripts && parsedPackageJson.scripts.build;
            hasPostinstall = parsedPackageJson.scripts && parsedPackageJson.scripts.postinstall;
            hasPrepare = parsedPackageJson.scripts && parsedPackageJson.scripts.prepare;
        } catch (error) {
            addLog(serverId, deploymentId, { 
                stream: 'stderr', 
                message: 'Could not parse package.json to check build script' 
            });
        }
    }

    // Detect package manager preference
    const useYarn = await fs.pathExists(path.join(botDir, 'yarn.lock'));
    const usePnpm = !useYarn && await fs.pathExists(path.join(botDir, 'pnpm-lock.yaml'));
    const pm = useYarn ? 'yarn' : usePnpm ? 'pnpm' : 'npm';

    // Helper to run a command and log output
    async function runCmd(desc: string, argv: string[], opts?: { optional?: boolean }): Promise<boolean> {
        return await new Promise<boolean>((resolve) => {
            addLog(serverId, deploymentId, { stream: 'system', message: `${desc}...` });
            const proc = spawn(argv[0], argv.slice(1), {
                cwd: botDir,
                shell: true,
                stdio: 'pipe',
                env: {
                    ...process.env,
                    // Ensure devDependencies are installed for bots that rely on ts/tsx tooling
                    npm_config_production: 'false',
                    CI: '1',
                    npm_config_loglevel: 'error',
                    npm_config_timeout: '600000',
                    npm_config_fetch_retries: '5',
                    npm_config_fetch_retry_maxtimeout: '120000',
                    npm_config_fetch_retry_mintimeout: '20000',
                },
            });
            proc.stdout?.on('data', (d) => addLog(serverId, deploymentId, { stream: 'stdout', message: d.toString() }));
            proc.stderr?.on('data', (d) => addLog(serverId, deploymentId, { stream: 'stderr', message: d.toString() }));
            proc.on('close', (code) => {
                if (code === 0) {
                    addLog(serverId, deploymentId, { stream: 'system', message: `${desc} completed successfully` });
                    resolve(true);
                } else {
                    addLog(serverId, deploymentId, { stream: 'stderr', message: `${desc} failed (code ${code})` });
                    resolve(!!opts?.optional);
                }
            });
            proc.on('error', (err) => {
                addLog(serverId, deploymentId, { stream: 'stderr', message: `${desc} error: ${err.message}` });
                resolve(!!opts?.optional);
            });
        });
    }

    // Clean cache (best-effort)
    if (pm === 'npm') await runCmd('Cleaning npm cache', ['npm', 'cache', 'clean', '--force'], { optional: true });

    // Install with simple, predictable fallbacks
    let installOk = false;
    if (pm === 'npm') {
        installOk = await runCmd('Installing dependencies (npm ci)', ['npm', 'ci']);
        if (!installOk) installOk = await runCmd('Installing with legacy peer deps', ['npm', 'install', '--legacy-peer-deps']);
        await runCmd('Rebuilding native modules', ['npm', 'rebuild'], { optional: true });
    } else if (pm === 'yarn') {
        installOk = await runCmd('Installing dependencies (yarn)', ['yarn', 'install', '--frozen-lockfile', '--check-files']);
        await runCmd('Rebuilding native modules', ['yarn', 'rebuild'], { optional: true });
    } else {
        // pnpm
        installOk = await runCmd('Installing dependencies (pnpm)', ['pnpm', 'install', '--frozen-lockfile']);
        await runCmd('Rebuilding native modules', ['pnpm', 'rebuild', '-r'], { optional: true });
    }

    if (!installOk) {
        throw new Error('Dependency installation failed after fallbacks');
    }

    // Optional: audit fix (best-effort, npm only)
    if (pm === 'npm') await runCmd('Fixing vulnerabilities', ['npm', 'audit', 'fix'], { optional: true });

    // Build only if script exists
    if (hasBuildScript) {
        const built = await runCmd('Building project', ['npm', 'run', 'build']);
        if (!built) throw new Error('Build failed');
    } else {
        addLog(serverId, deploymentId, { stream: 'system', message: 'Skipping build - no build script found in package.json' });
    }

    // Run postinstall/prepare if present
    if (hasPostinstall) {
        await new Promise<void>((resolve) => {
            addLog(serverId, deploymentId, { stream: 'system', message: 'Running postinstall script...' });
            const proc = spawn('npm', ['run', 'postinstall'], { cwd: botDir, shell: true, stdio: 'pipe' });
            proc.stdout?.on('data', (d) => addLog(serverId, deploymentId, { stream: 'stdout', message: d.toString() }));
            proc.stderr?.on('data', (d) => addLog(serverId, deploymentId, { stream: 'stderr', message: d.toString() }));
            proc.on('close', () => resolve());
            proc.on('error', () => resolve());
        });
    }
    if (hasPrepare) {
        await new Promise<void>((resolve) => {
            addLog(serverId, deploymentId, { stream: 'system', message: 'Running prepare script...' });
            const proc = spawn('npm', ['run', 'prepare'], { cwd: botDir, shell: true, stdio: 'pipe' });
            proc.stdout?.on('data', (d) => addLog(serverId, deploymentId, { stream: 'stdout', message: d.toString() }));
            proc.stderr?.on('data', (d) => addLog(serverId, deploymentId, { stream: 'stderr', message: d.toString() }));
            proc.on('close', () => resolve());
            proc.on('error', () => resolve());
        });
    }
}

// Recover latest deployment for a server from persistent storage
export async function recoverLatestDeploymentAction(serverId: string): Promise<BotDeployState | null> {
    try {
        const state = await loadLatestDeploymentForServer(serverId);
        return state;
    } catch {
        return null;
    }
}

// Start bot process
async function startBotProcess(serverId: string, deploymentId: string): Promise<{ success: boolean; error?: string }> {
    const deployments = getServerDeployments(serverId);
    const deployment = deployments.get(deploymentId);
    if (!deployment || !deployment.botDir) {
        return { success: false, error: 'Deployment not ready' };
    }

    updateState(serverId, deploymentId, prev => ({ 
        ...prev, 
        status: 'Starting the bot (npm start)...', 
        stage: 'running' 
    }));

    try {
        const botEnv = { ...process.env };
        const port = await getAvailablePort();
        botEnv.PORT = port.toString();
        addLog(serverId, deploymentId, { stream: 'system', message: `Assigned port ${port} to bot process.` });

        if (deployment.state.mongoDbInfo?.connectionString) {
            botEnv.MONGODB_URI = deployment.state.mongoDbInfo.connectionString;
            addLog(serverId, deploymentId, { stream: 'system', message: 'MONGODB_URI set for bot process.' });
        }

        // Fallback-aware launcher: try `npm start`, fall back to `node <entry>` if npm is unavailable
        let attemptedFallback = false;
        let sawNpmNotFound = false;

        const startNodeFallback = async () => {
            if (attemptedFallback) return;
            attemptedFallback = true;
            try {
                // Determine entry point from parsed package.json or common candidates
                const candidates = ['index.js', 'app.js', 'main.js', 'bot.js', 'start.js'];
                let entryPoint = (deployment.parsedPackageJson?.main as string) || '';
                if (!entryPoint || !(await fs.pathExists(path.join(deployment.botDir!, entryPoint)))) {
                    entryPoint = '';
                    for (const c of candidates) {
                        if (await fs.pathExists(path.join(deployment.botDir!, c))) { entryPoint = c; break; }
                    }
                }
                if (!entryPoint) {
                    throw new Error('Could not determine bot entry point for fallback.');
                }
                addLog(serverId, deploymentId, { stream: 'system', message: `Falling back to direct node start: node ${entryPoint}` });
                const nodeProc = spawn('node', [entryPoint], {
                    cwd: deployment.botDir!,
                    env: botEnv,
                    shell: true,
                    stdio: 'pipe',
                });

                deployment.process = nodeProc;

                nodeProc.stdout?.on('data', (data) =>
                    addLog(serverId, deploymentId, { stream: 'stdout', message: data.toString() })
                );
                nodeProc.stderr?.on('data', (data) => {
                    const message = data.toString();
                    addLog(serverId, deploymentId, { stream: 'stderr', message });
                });
                nodeProc.on('spawn', () => {
                    updateState(serverId, deploymentId, prev => ({
                        ...prev,
                        status: 'Bot process started successfully (node fallback).',
                        stage: 'running'
                    }));
                    const localDeployments = getServerDeployments(serverId);
                    const localDeployment = localDeployments.get(deploymentId);
                    if (localDeployment) saveDeploymentState(serverId, deploymentId, localDeployment.state).catch(() => {});
                });
                nodeProc.on('close', (code) => {
                    const localDeployments = getServerDeployments(serverId);
                    const localDeployment = localDeployments.get(deploymentId);
                    if (localDeployment) {
                        localDeployment.process = null;
                    }
                    if (code !== 0 && code !== null) {
                        updateState(serverId, deploymentId, prev => ({ ...prev,
                            error: `Bot process exited with code ${code}.`,
                            status: `Bot process exited unexpectedly (code ${code}).`,
                            stage: 'error',
                            isDeploying: false
                        }));
                    } else if (code === 0) {
                        updateState(serverId, deploymentId, prev => ({ ...prev,
                            status: 'Bot process exited cleanly.',
                            stage: 'finished',
                            isDeploying: false
                        }));
                    } else {
                        updateState(serverId, deploymentId, prev => ({ ...prev,
                            status: 'Bot process stopped.',
                            stage: 'finished',
                            isDeploying: false
                        }));
                    }
                    const ld2 = getServerDeployments(serverId).get(deploymentId);
                    if (ld2) saveDeploymentState(serverId, deploymentId, ld2.state).catch(() => {});
                });
                nodeProc.on('error', (err) => {
                    const localDeployments = getServerDeployments(serverId);
                    const localDeployment = localDeployments.get(deploymentId);
                    if (localDeployment) {
                        localDeployment.process = null;
                    }
                    updateState(serverId, deploymentId, prev => ({ ...prev,
                        error: `Failed to start bot with node: ${err.message}`,
                        status: 'Failed to start bot.',
                        stage: 'error',
                        isDeploying: false
                    }));
                });
            } catch (e: any) {
                updateState(serverId, deploymentId, prev => ({ ...prev,
                    error: e?.message || 'Failed to start bot (fallback).',
                    status: 'Failed to start bot.',
                    stage: 'error',
                    isDeploying: false
                }));
            }
        };

        const npmStart = spawn('npm', ['start'], {
            cwd: deployment.botDir,
            env: botEnv,
            shell: true,
            stdio: 'pipe'
        });

        deployment.process = npmStart;
        deployment.autoRestart = true;
        deployment.restartAttempts = 0;

        npmStart.stdout?.on('data', (data) =>
            addLog(serverId, deploymentId, { stream: 'stdout', message: data.toString() })
        );

        npmStart.stderr?.on('data', async (data) => {
            const message = data.toString();
            // Detect environments where npm is unavailable
            if (/npm(\s*:\s*not\s*found)|command\s+not\s+found\s*:.*npm/i.test(message)) {
                sawNpmNotFound = true;
            }
            // Handle missing module errors
            if (message.includes('Cannot find module')) {
                const missingModule = message.match(/Cannot find module '([^']+)'/)?.[1];
                if (missingModule) {
                    addLog(serverId, deploymentId, {
                        stream: 'stderr',
                        message: `CRITICAL: Missing required module: ${missingModule}`
                    });
                    const deployments = getServerDeployments(serverId);
                    const deployment = deployments.get(deploymentId);
                    if (deployment && deployment.restartAttempts < deployment.maxRestartAttempts) {
                        addLog(serverId, deploymentId, { stream: 'system', message: `Attempting to auto-install ${missingModule}...` });
                        try {
                            await new Promise<void>((resolve) => {
                                const proc = spawn('npm', ['install', `${missingModule}`], { cwd: deployment.botDir!, shell: true, stdio: 'pipe' });
                                proc.stdout?.on('data', (d) => addLog(serverId, deploymentId, { stream: 'stdout', message: d.toString() }));
                                proc.stderr?.on('data', (d) => addLog(serverId, deploymentId, { stream: 'stderr', message: d.toString() }));
                                proc.on('close', () => resolve());
                                proc.on('error', () => resolve());
                            });
                            addLog(serverId, deploymentId, { stream: 'system', message: `Auto-install completed. Restarting bot...` });
                            deployment.restartAttempts += 1;
                            try { npmStart.kill('SIGTERM'); } catch {}
                            await new Promise(res => setTimeout(res, 500));
                            await startBotProcess(serverId, deploymentId);
                            return; // stop further stderr handling
                        } catch (e: any) {
                            addLog(serverId, deploymentId, { stream: 'stderr', message: `Auto-install failed: ${e?.message || 'unknown error'}` });
                        }
                    } else {
                        updateState(serverId, deploymentId, prev => ({
                            ...prev,
                            error: `Missing required module: ${missingModule}`,
                            status: `Please add ${missingModule} to your package.json and redeploy.`,
                            stage: 'error',
                            isDeploying: false
                        }));
                    }
                }
            }
            // Handle port conflicts
            else if (message.includes('EADDRINUSE')) {
                addLog(serverId, deploymentId, {
                    stream: 'stderr',
                    message: `Port conflict detected. Trying to resolve automatically...`
                });
            }
            addLog(serverId, deploymentId, { stream: 'stderr', message });
        });

        npmStart.on('spawn', () => {
            updateState(serverId, deploymentId, prev => ({
                ...prev,
                status: 'Bot process started successfully.',
                stage: 'running'
            }));
            // Persist when process starts
            const localDeployments = getServerDeployments(serverId);
            const localDeployment = localDeployments.get(deploymentId);
            if (localDeployment) saveDeploymentState(serverId, deploymentId, localDeployment.state).catch(() => {});
        });

        npmStart.on('close', async (code) => {
            // If npm is unavailable, fallback to node
            if (!attemptedFallback && (code === 127 || sawNpmNotFound)) {
                addLog(serverId, deploymentId, { stream: 'system', message: 'npm not available in production runtime; falling back to node.' });
                return startNodeFallback();
            }

            const localDeployments = getServerDeployments(serverId);
            const localDeployment = localDeployments.get(deploymentId);
            if (localDeployment) {
                localDeployment.process = null;
            }
            if (code !== 0 && code !== null) {
                updateState(serverId, deploymentId, prev => ({...prev,
                    error: `Bot process exited with code ${code}.`,
                    status: `Bot process exited unexpectedly (code ${code}).`,
                    stage: 'error',
                    isDeploying: false
                }));
            } else if (code === 0) {
                updateState(serverId, deploymentId, prev => ({...prev,
                    status: 'Bot process exited cleanly.',
                    stage: 'finished',
                    isDeploying: false
                }));
            } else {
                updateState(serverId, deploymentId, prev => ({...prev,
                    status: 'Bot process stopped.',
                    stage: 'finished',
                    isDeploying: false
                }));
            }
            const ld2 = getServerDeployments(serverId).get(deploymentId);
            if (ld2) saveDeploymentState(serverId, deploymentId, ld2.state).catch(() => {});
        });
        
        npmStart.on('error', async (err) => {
            // ENOENT typically means npm is not installed/available
            if (!attemptedFallback && (err as any)?.code === 'ENOENT') {
                addLog(serverId, deploymentId, { stream: 'system', message: 'npm command not found; using node fallback.' });
                return startNodeFallback();
            }
            if (deployment) {
                deployment.process = null;
            }
            updateState(serverId, deploymentId, prev => ({...prev,
                error: `Failed to start bot process: ${err.message}`,
                status: 'Failed to start bot.',
                stage: 'error',
                isDeploying: false
            }));
        });

        return { success: true };
    } catch (err: any) {
        updateState(serverId, deploymentId, prev => ({...prev, 
            error: `Failed to start bot process: ${err.message}`, 
            status: 'Failed to start bot.', 
            stage: 'error', 
            isDeploying: false 
        }));
        const deployments = getServerDeployments(serverId);
        const deployment = deployments.get(deploymentId);
        if (deployment) saveDeploymentState(serverId, deploymentId, deployment.state).catch(() => {});
        return { success: false, error: err.message };
    }
}

// Stop bot process (non-destructive: keep files and deployment state)
export async function stopBotAction(serverId: string, deploymentId: string): Promise<{ success: boolean; message?: string }> {
	const deployments = getServerDeployments(serverId);
	const deployment = deployments.get(deploymentId);
	if (!deployment) {
		return { success: false, message: 'Deployment not found' };
	}

	addLog(serverId, deploymentId, { stream: 'system', message: 'Stopping bot (non-destructive)...' });
	let killed = true;
	if (deployment.process) {
		deployment.autoRestart = false;
		killed = deployment.process.kill('SIGTERM');
	}

	if (killed) {
		deployment.process = null;
		updateState(serverId, deploymentId, prev => ({
			...prev,
			status: 'Bot stopped',
			stage: 'stopped'
		}));
		
		return { success: true, message: 'Bot stopped' };
	}
	return { success: false, message: 'Failed to stop bot process' };
}

// Complete stop: terminate process and remove files and state (destructive)
export async function completeStopBotAction(serverId: string, deploymentId: string): Promise<{ success: boolean; message?: string }> {
	try {
		const deployments = getServerDeployments(serverId);
		const deployment = deployments.get(deploymentId);
		
		if (!deployment) {
			return { success: false, message: 'Deployment not found' };
		}

		addLog(serverId, deploymentId, { stream: 'system', message: 'Completely stopping bot and cleaning up (destructive)...' });

		// Stop the process first
		let killed = true;
		if (deployment.process) {
			try {
				deployment.autoRestart = false;
				killed = deployment.process.kill('SIGTERM');
				
				// Wait a bit for process to terminate
				await new Promise(resolve => setTimeout(resolve, 1000));
				
				// Force kill if still running
				if (deployment.process.exitCode === null) {
					deployment.process.kill('SIGKILL');
				}
			} catch (error) {
				console.error('Error killing process:', error);
				killed = false;
			}
		}

		// Clean up files
		if (deployment.botDir) {
			try {
				await fs.remove(deployment.botDir);
				console.log('Bot directory removed:', deployment.botDir);
			} catch (error) {
				console.error('Error removing bot directory:', error);
				// Continue even if file cleanup fails
			}
		}

        // Remove deployment from tracking
		deployments.delete(deploymentId);
        await deleteDeployment(serverId, deploymentId).catch(() => {});
		
		return { success: true, message: 'Bot completely stopped and removed' };
		
	} catch (error: any) {
		console.error('Error in completeStopBotAction:', error);
		return { success: false, message: `Failed to stop bot: ${error.message}` };
	}
}

// Restart bot process (uses non-destructive stop)
export async function restartBotAction(serverId: string, deploymentId: string): Promise<{ success: boolean; message?: string }> {
	const deployments = getServerDeployments(serverId);
	const deployment = deployments.get(deploymentId);
	if (!deployment) return { success: false, message: 'Deployment not found' };

	addLog(serverId, deploymentId, { stream: 'system', message: 'Restarting bot...' });

	if (deployment.process) {
		await stopBotAction(serverId, deploymentId);
		await new Promise(resolve => setTimeout(resolve, 2000));
	}

	updateState(serverId, deploymentId, prev => ({ 
		...prev, 
		qrLogs: [], 
		logs: [...prev.logs, {
			id: Date.now().toString(),
			stream: 'system',
			message: '--- RESTARTING ---',
			timestamp: new Date().toISOString()
		}]
	}));

    const result = await startBotProcess(serverId, deploymentId);
	return result.success 
		? { success: true, message: 'Bot restarted' }
		: { success: false, message: result.error };
}

// Main deployment handler
export async function deployBotAction(
    formData: FormData,
    serverName: string,
    serverId: string
): Promise<{ deploymentId: string | null; error: string | null }> {
    const file = formData.get('zipfile') as File | null;
    if (!file) return { deploymentId: null, error: 'No file uploaded' };
    if (file.size > MAX_FILE_SIZE) {
        return { deploymentId: null, error: `File too large (max ${MAX_FILE_SIZE / (1024 * 1024)}MB)` };
    }

    const deploymentId = randomUUID();
    const initialState: BotDeployState = {
        deploymentId,
        status: 'Initializing deployment',
        stage: 'starting',
        logs: [],
        qrLogs: [],
        details: {
            fileName: file.name,
            fileList: [],
            packageJsonContent: null,
            dependencies: null,
        },
        mongoDbInfo: null,
        error: null,
        isDeploying: true,
    };

    const deployments = getServerDeployments(serverId);
    deployments.set(deploymentId, { 
        state: initialState, 
        process: null,
        botDir: null,
        parsedPackageJson: null,
        autoRestart: false,
        restartAttempts: 0,
        maxRestartAttempts: MAX_RESTART_ATTEMPTS,
        serverName,
        serverId
    });

    (async () => {
        try {
            addLog(serverId, deploymentId, { 
                stream: 'system', 
                message: 'Starting deployment process...' 
            });
            await saveDeploymentState(serverId, deploymentId, initialState).catch(() => {});

            // Create temp directory
            const tempDir = path.join(os.tmpdir(), `bot-${Date.now()}`);
            const botDir = path.join(tempDir, 'bot');
            await fs.ensureDir(botDir);

            const deployments = getServerDeployments(serverId);
            const deployment = deployments.get(deploymentId);
            if (deployment) deployment.botDir = botDir;

            addLog(serverId, deploymentId, { 
                stream: 'system', 
                message: 'Extracting bot files...' 
            });

            // Extract zip file
            const zip = new AdmZip(Buffer.from(await file.arrayBuffer()));
            zip.extractAllTo(botDir, true);

            // List extracted files
            const files = await fs.readdir(botDir);
            updateState(serverId, deploymentId, prev => ({ 
                ...prev, 
                details: { ...prev.details, fileList: files } 
            }));

            addLog(serverId, deploymentId, { 
                stream: 'system', 
                message: `Extracted ${files.length} files` 
            });

            // Handle package.json
            let packageJsonPath = path.join(botDir, 'package.json');
            let parsedPackageJson: any = null;
            
            if (!await fs.pathExists(packageJsonPath)) {
                addLog(serverId, deploymentId, { 
                    stream: 'system', 
                    message: 'No package.json found, creating one...' 
                });
                
                // Look for entry point
                const entryPoints = ['index.js', 'app.js', 'main.js', 'bot.js', 'start.js'];
                let entryPoint = 'index.js';
                
                for (const point of entryPoints) {
                    if (await fs.pathExists(path.join(botDir, point))) {
                        entryPoint = point;
                        break;
                    }
                }
                
                // Create simple package.json
                const packageJson = {
                    name: `bot-${deploymentId}`,
                    version: '1.0.0',
                    main: entryPoint,
                    scripts: { start: `node ${entryPoint}` },
                    dependencies: {}
                };
                
                await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
                parsedPackageJson = packageJson;
                
                addLog(serverId, deploymentId, { 
                    stream: 'system', 
                    message: `Created package.json with entry point: ${entryPoint}` 
                });
            } else {
                const content = await fs.readFile(packageJsonPath, 'utf-8');
                parsedPackageJson = JSON.parse(content);
                addLog(serverId, deploymentId, { 
                    stream: 'system', 
                    message: 'Found existing package.json' 
                });

                // Ensure a start script exists for smoother starts on hosts
                try {
                    const hasStart = !!(parsedPackageJson.scripts && parsedPackageJson.scripts.start);
                    if (!hasStart) {
                        // Determine an entry point
                        const candidates = ['index.js', 'app.js', 'main.js', 'bot.js', 'start.js'];
                        let entryPoint = parsedPackageJson.main || 'index.js';
                        for (const c of candidates) {
                            if (await fs.pathExists(path.join(botDir, c))) { entryPoint = c; break; }
                        }
                        parsedPackageJson.scripts = parsedPackageJson.scripts || {};
                        parsedPackageJson.scripts.start = `node ${entryPoint}`;
                        await fs.writeFile(packageJsonPath, JSON.stringify(parsedPackageJson, null, 2));
                        addLog(serverId, deploymentId, { 
                            stream: 'system', 
                            message: `Added missing start script to package.json (node ${entryPoint})` 
                        });
                    }
                } catch {}
            }

            updateState(serverId, deploymentId, prev => ({ 
                ...prev, 
                details: { 
                    ...prev.details, 
                    packageJsonContent: parsedPackageJson,
                    dependencies: parsedPackageJson.dependencies || {} 
                } 
            }));

            if (deployment) deployment.parsedPackageJson = parsedPackageJson;

            // Quick dependency check and install
            addLog(serverId, deploymentId, { 
                stream: 'system', 
                message: 'Checking dependencies...' 
            });

            try {
                await installDependencies(botDir, serverId, deploymentId);
                addLog(serverId, deploymentId, { 
                    stream: 'system', 
                    message: 'Dependencies installed successfully' 
                });
            } catch (depError: any) {
                addLog(serverId, deploymentId, { 
                    stream: 'stderr', 
                    message: `Dependency installation warning: ${depError.message}` 
                });
                // Continue anyway - some bots work without dependencies
            }

            // MongoDB analysis (guarded to avoid AI deps when disabled)
            const envPath = path.join(botDir, '.env');
            const envFileContent = await fs.pathExists(envPath)
                ? await fs.readFile(envPath, 'utf-8')
                : '';
            const packageJsonContent = parsedPackageJson ? JSON.stringify(parsedPackageJson) : '{}';
            if (process.env.DISABLE_AI === '1') {
                addLog(serverId, deploymentId, { 
                    stream: 'system', 
                    message: 'Skipping AI-based MongoDB analysis (DISABLE_AI=1)' 
                });
            } else {
                addLog(serverId, deploymentId, { 
                    stream: 'system', 
                    message: 'Analyzing MongoDB configuration...' 
                });
                try {
                    const { detectMongoDBConfig } = await import('@/ai/flows/detect-mongodb-config');
                    const mongoDbInfo = await detectMongoDBConfig({ packageJsonContent, envFileContent });
                    updateState(serverId, deploymentId, prev => ({ 
                        ...prev, 
                        mongoDbInfo 
                    }));
                    if (mongoDbInfo.requiresMongoDB) {
                        addLog(serverId, deploymentId, { 
                            stream: 'system', 
                            message: 'MongoDB requirement detected and configured' 
                        });
                    } else {
                        addLog(serverId, deploymentId, { 
                            stream: 'system', 
                            message: 'No MongoDB requirement detected' 
                        });
                    }
                } catch (mongoError: any) {
                    addLog(serverId, deploymentId, { 
                        stream: 'stderr', 
                        message: `MongoDB analysis skipped/unavailable: ${mongoError.message}` 
                    });
                }
            }

            // Fallback: if AI is not available, still ensure core install and start run
            // The installation already ran above; this ensures we do not depend on AI for success

            // Start the bot
            addLog(serverId, deploymentId, { 
                stream: 'system', 
                message: 'Starting bot process...' 
            });

            const startResult = await startBotProcess(serverId, deploymentId);
            if (startResult.success) {
                updateState(serverId, deploymentId, prev => ({ 
                    ...prev, 
                    status: 'Bot deployed successfully',
                    stage: 'running',
                    isDeploying: false,
                    error: null
                }));
                const deployments = getServerDeployments(serverId);
                const deployment = deployments.get(deploymentId);
                if (deployment) saveDeploymentState(serverId, deploymentId, deployment.state).catch(() => {});
                addLog(serverId, deploymentId, { 
                    stream: 'system', 
                    message: '🎉 Bot deployed and running successfully!' 
                });
                
                // Update server status to online
                try {
                    const { setServerStatus } = await import('@/lib/userStorage');
                    setServerStatus('admin@whatsapp-bot.com', serverId, 'active' as any);
                } catch (error) {
                    console.log('Could not update server status:', error);
                }
            } else {
                throw new Error(startResult.error || 'Failed to start bot');
            }

        } catch (error: any) {
            console.error('Deployment error:', error);
            
            updateState(serverId, deploymentId, prev => ({ 
                ...prev, 
                error: error.message,
                stage: 'error',
                isDeploying: false 
            }));
            const deployments = getServerDeployments(serverId);
            const deployment = deployments.get(deploymentId);
            if (deployment) saveDeploymentState(serverId, deploymentId, deployment.state).catch(() => {});
            
            addLog(serverId, deploymentId, { 
                stream: 'stderr', 
                message: `Deployment failed: ${error.message}` 
            });
        }
    })();

    return { deploymentId, error: null };
}

// File manager functions - FIXED VERSION
const getValidatedFilePath = (serverId: string, deploymentId: string, subPath: string): string => {
    const deployments = getServerDeployments(serverId);
    const deployment = deployments.get(deploymentId);
    if (!deployment) {
        throw new Error('Deployment not found');
    }
    
    if (!deployment.botDir) {
        throw new Error('Deployment files not ready yet. Please wait for deployment to complete.');
    }
    
    const targetPath = path.join(deployment.botDir, subPath);
    
    // Security check: ensure the target path is within the bot directory
    if (!targetPath.startsWith(deployment.botDir)) {
        throw new Error('Access denied: path traversal attempt');
    }
    
    return targetPath;
}

export async function listFiles(serverId: string, deploymentId: string, subPath: string = ''): Promise<{ files: FileNode[] }> {
    const targetPath = getValidatedFilePath(serverId, deploymentId, subPath);
    
    try {
        const files = await fs.readdir(targetPath);
        
        const fileNodes: FileNode[] = await Promise.all(
            files.map(async (file) => {
                const filePath = path.join(targetPath, file);
                const stats = await fs.stat(filePath);
                return {
                    name: file,
                    type: stats.isDirectory() ? 'directory' : 'file',
                    path: path.join(subPath, file),
                    size: stats.size,
                };
            })
        );
        
        fileNodes.sort((a, b) => a.type === b.type 
            ? a.name.localeCompare(b.name) 
            : a.type === 'directory' ? -1 : 1
        );

        return { files: fileNodes };
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            throw new Error('Directory not found');
        }
        throw error;
    }
}

export async function getFileContent(serverId: string, deploymentId: string, filePath: string): Promise<{ content: string }> {
    const fullPath = getValidatedFilePath(serverId, deploymentId, filePath);
    const stats = await fs.stat(fullPath);
    
    if (stats.isDirectory()) {
        throw new Error("Cannot read directory content");
    }
    
    if (stats.size > 10 * 1024 * 1024) { // 10MB limit
        throw new Error("File too large to edit");
    }
    
    return { content: await fs.readFile(fullPath, 'utf-8') };
}

export async function saveFileContent(serverId: string, deploymentId: string, filePath: string, content: string): Promise<{ success: boolean }> {
    const fullPath = getValidatedFilePath(serverId, deploymentId, filePath);
    await fs.writeFile(fullPath, content, 'utf-8');
    return { success: true };
}

export async function createNewFile(serverId: string, deploymentId: string, newPath: string): Promise<{ success: boolean }> {
    const fullPath = getValidatedFilePath(serverId, deploymentId, newPath);
    
    if (await fs.pathExists(fullPath)) {
        throw new Error("Path already exists");
    }
    
    if (newPath.endsWith('/')) {
        await fs.ensureDir(fullPath);
    } else {
        // Ensure parent directory exists
        await fs.ensureDir(path.dirname(fullPath));
        await fs.writeFile(fullPath, '', 'utf-8');
    }
    
    return { success: true };
}

export async function deleteFileAction(serverId: string, deploymentId: string, filePath: string): Promise<{ success: boolean }> {
    const fullPath = getValidatedFilePath(serverId, deploymentId, filePath);
    
    // Prevent deleting the entire bot directory
    const deployments = getServerDeployments(serverId);
    const deployment = deployments.get(deploymentId);
    if (deployment?.botDir && fullPath === deployment.botDir) {
        throw new Error("Cannot delete the root bot directory");
    }
    
    await fs.remove(fullPath);
    return { success: true };
}