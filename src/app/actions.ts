'use server';

import type { BotDeployState, DeploymentLog, FileNode } from '@/lib/types';
import { detectMongoDBConfig } from '@/ai/flows/detect-mongodb-config';
import { saveDeploymentState, appendLogs, loadDeploymentState, loadLatestDeploymentForServer, clearLogs as clearPersistenceLogs, deleteDeployment } from '@/lib/persistence';
import AdmZip from 'adm-zip';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { spawn, type ChildProcess } from 'child_process';
import { randomUUID } from 'crypto';
import net from 'net';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB
const AUTO_RESTART_DELAY = 5000; // 5 seconds
const MAX_RESTART_ATTEMPTS = 5;
const LOG_PAGE_SIZE = 100;

// In-memory store for active deployments
const serverDeployments = new Map<string, Map<string, {
    state: BotDeployState;
    process: ChildProcess | null;
    botDir: string | null;
    parsedPackageJson: any | null; // Added parsedPackageJson here
    autoRestart: boolean;
    restartAttempts: number;
    maxRestartAttempts: number;
    serverName: string;
    serverId: string;
}>>();

function getServerDeployments(serverId: string) {
    if (!serverDeployments.has(serverId)) {
        serverDeployments.set(serverId, new Map());
    }
    return serverDeployments.get(serverId)!;
}

async function getAvailablePort(startPort = 10000): Promise<number> {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.unref();
        server.on('error', reject);
        server.listen(startPort, () => {
            const port = (server.address() as net.AddressInfo).port;
            server.close(() => resolve(port));
        });
    }).catch(() => getAvailablePort(startPort + 1));
}

const updateState = async (serverId: string, deploymentId: string, updater: (prevState: BotDeployState) => BotDeployState) => {
    const deployments = getServerDeployments(serverId);
    const deployment = deployments.get(deploymentId);
    if (deployment) {
        const newState = updater(deployment.state);
        deployment.state = newState;
        await saveDeploymentState(serverId, deploymentId, newState);
    }
};

const addLog = async (serverId: string, deploymentId: string, log: Omit<DeploymentLog, 'id' | 'timestamp'>) => {
    const deployments = getServerDeployments(serverId);
    const deployment = deployments.get(deploymentId);
    if (!deployment) return;

    const newLog: DeploymentLog = { 
        ...log, 
        id: Date.now().toString() + Math.random(), 
        timestamp: new Date().toISOString() 
    };

    if (newLog.message.includes('QR code')) {
        deployment.state.qrLogs = [newLog];
    } else {
        deployment.state.logs.push(newLog);
    }

    await appendLogs(serverId, deploymentId, [newLog]);
    await saveDeploymentState(serverId, deploymentId, deployment.state); // Persist state with new logs
};

export async function recoverLatestDeploymentAction(serverId: string): Promise<BotDeployState | null> {
    const deployments = getServerDeployments(serverId);
    const latestState = await loadLatestDeploymentForServer(serverId);

    if (latestState && !deployments.has(latestState.deploymentId)) {
        // If the latest deployment is not in memory, load it.
        // This happens on server restart.
        await addLog(serverId, latestState.deploymentId, { stream: 'system', message: 'Server restarted. Recovering latest deployment state.' });
        
        // The botDir is not restored here, as the files are ephemeral. User needs to re-deploy to run.
        const deploymentEntry = {
            state: { ...latestState, status: 'Recovered after server restart. Re-deploy to run.', stage: 'stopped' },
            process: null,
            botDir: null, 
            parsedPackageJson: null, // Assuming package.json is not re-parsed on recovery
            autoRestart: false,
            restartAttempts: 0,
            maxRestartAttempts: MAX_RESTART_ATTEMPTS,
            serverName: latestState.details.fileName, 
            serverId: serverId,
        };
        deployments.set(latestState.deploymentId, deploymentEntry as any);
        return latestState;
    }
    return null;
}


export async function loadOlderLogsAction(serverId: string, deploymentId: string, beforeLogId: string): Promise<DeploymentLog[]> {
    const deploymentState = await loadDeploymentState(serverId, deploymentId);
    if (!deploymentState) return [];

    const logIndex = deploymentState.logs.findIndex(log => log.id === beforeLogId);
    if (logIndex === -1) return [];

    const startIndex = Math.max(0, logIndex - LOG_PAGE_SIZE);
    return deploymentState.logs.slice(startIndex, logIndex);
}



async function installDependencies(botDir: string, serverId: string, deploymentId: string): Promise<void> {
    const commands = [
        { cmd: ['npm', 'install'], desc: 'Installing dependencies (npm install)' },
        { cmd: ['npm', 'ci'], desc: 'Installing dependencies (npm ci)' },
        { cmd: ['npm', 'install', '--legacy-peer-deps'], desc: 'Installing with legacy peer dependencies' }
    ];

    let installed = false;
    for (const { cmd, desc } of commands) {
        try {
            await new Promise<void>((resolve, reject) => {
                addLog(serverId, deploymentId, { stream: 'system', message: `${desc}...` });
                const proc = spawn(cmd[0], cmd.slice(1), { cwd: botDir, shell: true, stdio: 'pipe' });

                proc.stdout.on('data', (data) => addLog(serverId, deploymentId, { stream: 'stdout', message: data.toString() }));
                proc.stderr.on('data', (data) => addLog(serverId, deploymentId, { stream: 'stderr', message: data.toString() }));
                
                proc.on('close', (code) => {
                    if (code === 0) {
                        addLog(serverId, deploymentId, { stream: 'system', message: `${desc} completed.` });
                        installed = true;
                        resolve();
                    } else {
                        addLog(serverId, deploymentId, { stream: 'stderr', message: `${desc} failed with code ${code}. Trying next command...` });
                        reject(new Error(`Command failed: ${desc}`));
                    }
                });
                proc.on('error', (err) => {
                     addLog(serverId, deploymentId, { stream: 'stderr', message: `${desc} failed to start: ${err.message}` });
                     reject(err);
                });
            });
            if (installed) break; // Exit loop on success
        } catch (error) {
            console.error(error); // Log error and continue to the next command
        }
    }

    if (!installed) {
        throw new Error('All dependency installation attempts failed.');
    }
}

async function buildProject(botDir: string, serverId: string, deploymentId: string, parsedPackageJson: any): Promise<void> {
    if (parsedPackageJson.scripts && parsedPackageJson.scripts.build) {
        await addLog(serverId, deploymentId, { stream: 'system', message: 'Build script detected. Running npm run build...' });
        try {
            await new Promise<void>((resolve, reject) => {
                const proc = spawn('npm', ['run', 'build'], { cwd: botDir, shell: true, stdio: 'pipe' });
                proc.stdout.on('data', (data) => addLog(serverId, deploymentId, { stream: 'stdout', message: data.toString() }));
                proc.stderr.on('data', (data) => addLog(serverId, deploymentId, { stream: 'stderr', message: data.toString() }));
                proc.on('close', (code) => {
                    if (code === 0) {
                        addLog(serverId, deploymentId, { stream: 'system', message: 'Build completed successfully.' });
                        resolve();
                    } else {
                        addLog(serverId, deploymentId, { stream: 'stderr', message: `Build failed with code ${code}.` });
                        reject(new Error(`Build failed with code ${code}`));
                    }
                });
                proc.on('error', (err) => {
                    addLog(serverId, deploymentId, { stream: 'stderr', message: `Build command failed to start: ${err.message}` });
                    reject(err);
                });
            });
        } catch (error: any) {
            throw new Error(`Project build failed: ${error.message}`);
        }
    } else {
        await addLog(serverId, deploymentId, { stream: 'system', message: 'No build script found in package.json. Skipping build step.' });
    }
}

async function startBotProcess(serverId: string, deploymentId: string): Promise<{ success: boolean; error?: string }> {
    const deployments = getServerDeployments(serverId);
    const deployment = deployments.get(deploymentId);
    if (!deployment || !deployment.botDir) {
        return { success: false, error: 'Deployment not ready. Bot directory missing.' };
    }

    await updateState(serverId, deploymentId, prev => ({ ...prev, status: 'Starting bot...', stage: 'running' }));

    try {
        const botEnv = { ...process.env };
        const port = await getAvailablePort();
        botEnv.PORT = port.toString();
        await addLog(serverId, deploymentId, { stream: 'system', message: `Assigning port ${port}` });

        if (deployment.state.mongoDbInfo?.connectionString) {
            botEnv.MONGODB_URI = deployment.state.mongoDbInfo.connectionString;
            await addLog(serverId, deploymentId, { stream: 'system', message: 'MongoDB connection string configured.' });
        }

        const proc = spawn('npm', ['start'], { cwd: deployment.botDir, env: botEnv, shell: true, stdio: 'pipe' });
        deployment.process = proc;
        deployment.autoRestart = true;
        deployment.restartAttempts = 0;

        proc.stdout?.on('data', (data) => addLog(serverId, deploymentId, { stream: 'stdout', message: data.toString() }));
        proc.stderr?.on('data', (data) => addLog(serverId, deploymentId, { stream: 'stderr', message: data.toString() }));

        proc.on('spawn', () => updateState(serverId, deploymentId, prev => ({ ...prev, status: 'Bot is running.', stage: 'running' })));

        proc.on('close', async (code) => {
            const currentDeployment = getServerDeployments(serverId).get(deploymentId);
            if (!currentDeployment) return;

            currentDeployment.process = null;
            const message = `Process exited with code ${code}`;
            await addLog(serverId, deploymentId, { stream: 'stderr', message });

            if (code !== 0 && currentDeployment.autoRestart && currentDeployment.restartAttempts < currentDeployment.maxRestartAttempts) {
                currentDeployment.restartAttempts++;
                await addLog(serverId, deploymentId, { stream: 'system', message: `Attempting to auto-restart... (${currentDeployment.restartAttempts}/${currentDeployment.maxRestartAttempts})` });
                setTimeout(() => startBotProcess(serverId, deploymentId), AUTO_RESTART_DELAY);
            } else {
                 await updateState(serverId, deploymentId, prev => ({ ...prev, status: 'Stopped', stage: code === 0 ? 'finished' : 'error', error: message }));
            }
        });
        
        return { success: true };

    } catch (err: any) {
        await updateState(serverId, deploymentId, prev => ({ ...prev, error: err.message, stage: 'error' }));
        return { success: false, error: err.message };
    }
}


export async function deployBotAction(formData: FormData, serverName: string, serverId: string): Promise<{ deploymentId: string | null; error: string | null }> {
    const file = formData.get('zipfile') as File | null;
    if (!file) return { deploymentId: null, error: 'No file uploaded.' };
    if (file.size > MAX_FILE_SIZE) return { deploymentId: null, error: `File too large (max ${MAX_FILE_SIZE / (1024 * 1024)}MB).` };

    const deploymentId = randomUUID();
    const deployments = getServerDeployments(serverId);
    const tempDir = path.join(os.tmpdir(), `bot-${deploymentId}-${Date.now()}`);
    const botDir = path.join(tempDir, 'bot');

    const initialState: BotDeployState = {
        deploymentId,
        status: 'Initializing...',
        stage: 'starting',
        logs: [],
        qrLogs: [],
        details: { fileName: file.name, fileList: [], packageJsonContent: null, dependencies: null },
        mongoDbInfo: null,
        error: null,
        isDeploying: true,
    };

    deployments.set(deploymentId, { 
        state: initialState, 
        process: null,
        botDir,
        parsedPackageJson: null, // Initial state
        autoRestart: false,
        restartAttempts: 0,
        maxRestartAttempts: MAX_RESTART_ATTEMPTS,
        serverName,
        serverId
    });
    
    await saveDeploymentState(serverId, deploymentId, initialState); // Initial save

    (async () => {
        try {
            await fs.ensureDir(botDir);
            await addLog(serverId, deploymentId, { stream: 'system', message: 'Created temporary directory for bot.' });

            const zip = new AdmZip(Buffer.from(await file.arrayBuffer()));
            zip.extractAllTo(botDir, true);
            await addLog(serverId, deploymentId, { stream: 'system', message: 'Extracted ZIP file.' });

            const packageJsonPath = path.join(botDir, 'package.json');
            if (!await fs.pathExists(packageJsonPath)) throw new Error('package.json not found in the uploaded zip.');
            
            const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
            const parsedPackageJson = JSON.parse(packageJsonContent);

            await updateState(serverId, deploymentId, prev => ({ ...prev, details: { ...prev.details, packageJsonContent: parsedPackageJson, dependencies: parsedPackageJson.dependencies } }));
            deployments.get(deploymentId)!.parsedPackageJson = parsedPackageJson; // Store parsed package.json

            await addLog(serverId, deploymentId, { stream: 'system', message: 'Analyzing dependencies...' });
            const envFileContent = await fs.pathExists(path.join(botDir, '.env')) ? await fs.readFile(path.join(botDir, '.env'), 'utf-8') : '';
            const mongoDbInfo = await detectMongoDBConfig({ packageJsonContent, envFileContent });
            await updateState(serverId, deploymentId, prev => ({ ...prev, mongoDbInfo }));

            await installDependencies(botDir, serverId, deploymentId);
            await updateState(serverId, deploymentId, prev => ({ ...prev, status: 'Dependencies installed.', isDeploying: false }));
            
            // NEW: Run build script if available
            await buildProject(botDir, serverId, deploymentId, parsedPackageJson);
            await updateState(serverId, deploymentId, prev => ({ ...prev, status: 'Project built.' }));

            const startResult = await startBotProcess(serverId, deploymentId);
            if (!startResult.success) throw new Error(startResult.error || "Failed to start bot process.");

        } catch (error: any) {
            console.error('Deployment error:', error);
            await updateState(serverId, deploymentId, prev => ({ ...prev, error: error.message, stage: 'error', isDeploying: false }));
        } finally {
             const finalDeployment = deployments.get(deploymentId);
             if (finalDeployment) {
                await saveDeploymentState(serverId, deploymentId, finalDeployment.state);
             }
        }
    })();

    return { deploymentId, error: null };
}

// Other actions (stop, restart, clear, etc.)

export async function stopBotAction(serverId: string, deploymentId: string): Promise<{ success: boolean; message?: string }> {
	const deployments = getServerDeployments(serverId);
	const deployment = deployments.get(deploymentId);
	if (!deployment) return { success: false, message: 'Deployment not found' };

	await addLog(serverId, deploymentId, { stream: 'system', message: 'Stopping bot...' });
    deployment.autoRestart = false; // Disable auto-restart on manual stop
	if (deployment.process) {
		deployment.process.kill('SIGTERM'); // Send termination signal
        await updateState(serverId, deploymentId, prev => ({...prev, status: 'Bot stopped', stage: 'stopped'}));
        return { success: true, message: 'Bot stopped' };
	}
    // If no process, just update state
    await updateState(serverId, deploymentId, prev => ({...prev, status: 'Bot already stopped', stage: 'stopped'}));
	return { success: true, message: 'Bot was already stopped' };
}

export async function restartBotAction(serverId: string, deploymentId: string): Promise<{ success: boolean; message?: string }> {
	const deployments = getServerDeployments(serverId);
	const deployment = deployments.get(deploymentId);
	if (!deployment) return { success: false, message: 'Deployment not found' };

	await addLog(serverId, deploymentId, { stream: 'system', message: 'Restarting bot...' });

	if (deployment.process) {
        await stopBotAction(serverId, deploymentId); 
        await new Promise(resolve => setTimeout(resolve, 2000)); // wait for process to die
	}
    
    await updateState(serverId, deploymentId, prev => ({ ...prev, qrLogs: [], error: null })); // Clear QR and errors
	const result = await startBotProcess(serverId, deploymentId);
	return result.success 
		? { success: true, message: 'Bot restarted' }
		: { success: false, message: result.error };
}

export async function clearDeploymentLogs(serverId: string, deploymentId: string): Promise<{ success: boolean }> {
    await updateState(serverId, deploymentId, prev => ({ ...prev, logs: [], qrLogs: [] }));
    await clearPersistenceLogs(serverId, deploymentId);
    return { success: true };
}

export async function completeStopBotAction(serverId: string, deploymentId: string): Promise<{ success: boolean; message?: string }> {
    const deployments = getServerDeployments(serverId);
    const deployment = deployments.get(deploymentId);
    if (!deployment) return { success: false, message: 'Deployment not found' };

    await stopBotAction(serverId, deploymentId);

    if (deployment.botDir) {
        await fs.remove(deployment.botDir).catch(err => console.error(`Failed to remove bot directory: ${err.message}`));
    }
    
deployments.delete(deploymentId);
    await deleteDeployment(serverId, deploymentId);

    return { success: true, message: 'Bot completely stopped and data removed' };
}

// File management functions remain largely the same, but need to use the in-memory botDir

const getValidatedFilePath = (serverId: string, deploymentId: string, subPath: string): string => {
    const deployment = getServerDeployments(serverId).get(deploymentId);
    if (!deployment || !deployment.botDir) {
        throw new Error('Deployment not found or bot directory is not available.');
    }
    const targetPath = path.join(deployment.botDir, subPath);
    if (!targetPath.startsWith(deployment.botDir)) {
        throw new Error('Access denied: Path traversal detected.');
    }
    return targetPath;
}

export async function listFiles(serverId: string, deploymentId: string, subPath: string = ''): Promise<{ files: FileNode[] }> {
    const targetPath = getValidatedFilePath(serverId, deploymentId, subPath);
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
    fileNodes.sort((a, b) => (a.type === b.type) ? a.name.localeCompare(b.name) : (a.type === 'directory' ? -1 : 1));
    return { files: fileNodes };
}

export async function getFileContent(serverId: string, deploymentId: string, filePath: string): Promise<{ content: string }> {
    const fullPath = getValidatedFilePath(serverId, deploymentId, filePath);
    if ((await fs.stat(fullPath)).isDirectory()) throw new Error("Cannot read content of a directory.");
    if ((await fs.stat(fullPath)).size > 10 * 1024 * 1024) throw new Error("File is too large to display.");
    return { content: await fs.readFile(fullPath, 'utf-8') };
}

export async function saveFileContent(serverId: string, deploymentId: string, filePath: string, content: string): Promise<{ success: boolean }> {
    const fullPath = getValidatedFilePath(serverId, deploymentId, filePath);
    await fs.writeFile(fullPath, content, 'utf-8');
    return { success: true };
}

export async function checkDeploymentExists(serverId: string, deploymentId: string): Promise<boolean> {
    return getServerDeployments(serverId).has(deploymentId);
}

export async function writeToBot(serverId: string, deploymentId: string, data: string): Promise<{ success: boolean; message?: string }> {
    const deployment = getServerDeployments(serverId).get(deploymentId);
    if (!deployment?.process?.stdin) {
        return { success: false, message: 'Process not running or input stream not available.' };
    }
    deployment.process.stdin.write(data + '\n'); // Add newline to simulate pressing enter
    await addLog(serverId, deploymentId, { stream: 'input', message: data });
    return { success: true };
}

export async function getDeploymentUpdates(serverId: string, deploymentId: string): Promise<BotDeployState | null> {
    const deployment = getServerDeployments(serverId).get(deploymentId);
    // Return a copy of the state to avoid direct mutation from the client
    return deployment ? { ...deployment.state } : null;
}

export async function getServerName(serverId: string, deploymentId: string): Promise<string | null> {
    const deployment = getServerDeployments(serverId).get(deploymentId);
    return deployment?.serverName || null;
}
