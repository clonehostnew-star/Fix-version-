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

// FIXED: Proper error handling for getAvailablePort
async function getAvailablePort(startPort = 10000): Promise<number> {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.unref();
        server.on('error', (err) => {
            reject(err);
        });
        server.listen(startPort, () => {
            const address = server.address();
            if (address && typeof address === 'object') {
                const port = address.port;
                server.close(() => resolve(port));
            } else {
                reject(new Error('Failed to get server address'));
            }
        });
    }).catch(() => {
        // Recursively try next port on error
        return getAvailablePort(startPort + 1);
    });
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

// ENHANCED: Better dependency installation with multiple fallbacks
async function installDependencies(botDir: string, serverId: string, deploymentId: string): Promise<void> {
    // First check Node version
    await addLog(serverId, deploymentId, { stream: 'system', message: 'Checking Node.js version...' });
    
    try {
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
        });
    } catch {
        addLog(serverId, deploymentId, { 
            stream: 'stderr', 
            message: 'Could not determine Node.js version' 
        });
    }

    const commands = [
        { cmd: ['npm', 'cache', 'clean', '--force'], desc: 'Cleaning npm cache', optional: true },
        { cmd: ['npm', 'install'], desc: 'Installing dependencies (npm install)' },
        { cmd: ['npm', 'ci'], desc: 'Installing dependencies (npm ci)' },
        { cmd: ['npm', 'install', '--legacy-peer-deps'], desc: 'Installing with legacy peer dependencies' },
        { cmd: ['npm', 'audit', 'fix'], desc: 'Fixing vulnerabilities', optional: true }
    ];

    for (const { cmd, desc, optional } of commands) {
        try {
            const success = await new Promise<boolean>((resolve) => {
                addLog(serverId, deploymentId, { stream: 'system', message: `${desc}...` });
                const proc = spawn(cmd[0], cmd.slice(1), { cwd: botDir, shell: true, stdio: 'pipe' });

                proc.stdout?.on('data', (data) => addLog(serverId, deploymentId, { stream: 'stdout', message: data.toString() }));
                proc.stderr?.on('data', (data) => addLog(serverId, deploymentId, { stream: 'stderr', message: data.toString() }));
                
                proc.on('close', (code) => {
                    if (code === 0) {
                        addLog(serverId, deploymentId, { stream: 'system', message: `${desc} completed successfully.` });
                        resolve(true);
                    } else {
                        addLog(serverId, deploymentId, { stream: 'stderr', message: `${desc} failed with code ${code}.` });
                        resolve(!!optional);
                    }
                });
                proc.on('error', (err) => {
                    addLog(serverId, deploymentId, { stream: 'stderr', message: `${desc} failed to start: ${err.message}` });
                    resolve(!!optional);
                });
            });

            if (!success && !optional) {
                throw new Error(`${desc} failed`);
            }
        } catch (error) {
            if (!optional) {
                throw error;
            }
        }
    }
}

// ENHANCED: Build project with better error handling
async function buildProject(botDir: string, serverId: string, deploymentId: string, parsedPackageJson: any): Promise<void> {
    if (parsedPackageJson.scripts && parsedPackageJson.scripts.build) {
        await addLog(serverId, deploymentId, { stream: 'system', message: 'Build script detected. Running npm run build...' });
        try {
            await new Promise<void>((resolve, reject) => {
                const proc = spawn('npm', ['run', 'build'], { cwd: botDir, shell: true, stdio: 'pipe' });
                proc.stdout?.on('data', (data) => addLog(serverId, deploymentId, { stream: 'stdout', message: data.toString() }));
                proc.stderr?.on('data', (data) => addLog(serverId, deploymentId, { stream: 'stderr', message: data.toString() }));
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

// ENHANCED: Start bot process with multiple start command fallbacks
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

        // Determine start command with fallbacks
        const startCommands = await determineStartCommand(deployment.botDir, serverId, deploymentId);
        
        let currentCommandIndex = 0;
        let lastError: string | null = null;

        while (currentCommandIndex < startCommands.length) {
            const { command, args, description } = startCommands[currentCommandIndex];
            
            await addLog(serverId, deploymentId, { 
                stream: 'system', 
                message: `Trying start command: ${description}` 
            });

            const result = await tryStartCommand(
                command, 
                args, 
                deployment.botDir, 
                botEnv, 
                serverId, 
                deploymentId,
                deployment
            );

            if (result.success) {
                return { success: true };
            } else {
                lastError = result.error || 'Unknown error';
                currentCommandIndex++;
                
                if (currentCommandIndex < startCommands.length) {
                    await addLog(serverId, deploymentId, { 
                        stream: 'system', 
                        message: 'Start command failed, trying alternative...' 
                    });
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }

        throw new Error(lastError || 'All start commands failed');

    } catch (err: any) {
        await updateState(serverId, deploymentId, prev => ({ ...prev, error: err.message, stage: 'error' }));
        return { success: false, error: err.message };
    }
}

// NEW: Helper function to determine possible start commands
async function determineStartCommand(botDir: string, serverId: string, deploymentId: string): Promise<Array<{command: string, args: string[], description: string}>> {
    const commands: Array<{command: string, args: string[], description: string}> = [];
    
    // Check package.json for start script first
    const packageJsonPath = path.join(botDir, 'package.json');
    if (await fs.pathExists(packageJsonPath)) {
        try {
            const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
            const parsedPackageJson = JSON.parse(packageJsonContent);
            
            if (parsedPackageJson.scripts && parsedPackageJson.scripts.start) {
                commands.push({
                    command: 'npm',
                    args: ['start'],
                    description: 'npm start (from package.json)'
                });
            }
        } catch (error) {
            await addLog(serverId, deploymentId, { 
                stream: 'stderr', 
                message: 'Could not parse package.json for start script' 
            });
        }
    }

    // Common WhatsApp bot entry points to check
    const commonEntryPoints = [
        'index.js', 'main.js', 'bot.js', 'start.js', 'app.js',
        'src/index.js', 'src/main.js', 'src/bot.js', 'src/start.js',
        'dist/index.js', 'dist/main.js', 'dist/bot.js'
    ];

    // Check which entry points exist
    const existingEntryPoints: string[] = [];
    for (const entryPoint of commonEntryPoints) {
        if (await fs.pathExists(path.join(botDir, entryPoint))) {
            existingEntryPoints.push(entryPoint);
        }
    }

    // Add direct node commands for existing entry points
    for (const entryPoint of existingEntryPoints) {
        commands.push({
            command: 'node',
            args: [entryPoint],
            description: `node ${entryPoint}`
        });
    }

    // If no specific commands found, add fallbacks
    if (commands.length === 0) {
        commands.push(
            { command: 'npm', args: ['start'], description: 'npm start (fallback)' },
            { command: 'node', args: ['index.js'], description: 'node index.js (fallback)' },
            { command: 'node', args: ['start.js'], description: 'node start.js (fallback)' },
            { command: 'node', args: ['main.js'], description: 'node main.js (fallback)' },
            { command: 'node', args: ['bot.js'], description: 'node bot.js (fallback)' }
        );
    }

    return commands;
}

// NEW: Helper function to try a specific start command
async function tryStartCommand(
    command: string, 
    args: string[], 
    cwd: string, 
    env: NodeJS.ProcessEnv, 
    serverId: string, 
    deploymentId: string,
    deployment: any
): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
        const proc = spawn(command, args, { 
            cwd, 
            env, 
            shell: true, 
            stdio: 'pipe' 
        });

        deployment.process = proc;
        deployment.autoRestart = true;
        deployment.restartAttempts = 0;

        proc.stdout?.on('data', (data) => {
            addLog(serverId, deploymentId, { stream: 'stdout', message: data.toString() });
        });

        proc.stderr?.on('data', (data) => {
            const message = data.toString();
            // Handle missing module or file errors
            if (message.includes('Cannot find module')) {
                const missingModule = message.match(/Cannot find module '([^']+)'/)?.[1];
                if (missingModule) {
                    addLog(serverId, deploymentId, { 
                        stream: 'stderr', 
                        message: `Missing module: ${missingModule}` 
                    });
                }
            }
            addLog(serverId, deploymentId, { stream: 'stderr', message });
        });

        proc.on('spawn', () => {
            addLog(serverId, deploymentId, { 
                stream: 'system', 
                message: `Bot process started with: ${command} ${args.join(' ')}` 
            });
            updateState(serverId, deploymentId, prev => ({ 
                ...prev, 
                status: 'Bot process started successfully.', 
                stage: 'running' 
            }));
        });

        proc.on('close', (code) => {
            if (deployment) {
                deployment.process = null;
            }
            
            if (code !== 0 && code !== null) {
                resolve({ success: false, error: `Process exited with code ${code}` });
            } else {
                resolve({ success: true });
            }
        });
        
        proc.on('error', (err) => {
            if (deployment) {
                deployment.process = null;
            }
            resolve({ success: false, error: err.message });
        });

        // Set a timeout to check if the process is still running
        setTimeout(() => {
            if (proc.exitCode === null) {
                resolve({ success: true });
            }
        }, 3000);
    });
}

// ENHANCED: Main deployment function with automatic package.json creation
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
        parsedPackageJson: null,
        autoRestart: false,
        restartAttempts: 0,
        maxRestartAttempts: MAX_RESTART_ATTEMPTS,
        serverName,
        serverId
    });
    
    await saveDeploymentState(serverId, deploymentId, initialState);

    (async () => {
        try {
            await fs.ensureDir(botDir);
            await addLog(serverId, deploymentId, { stream: 'system', message: 'Created temporary directory for bot.' });

            const zip = new AdmZip(Buffer.from(await file.arrayBuffer()));
            zip.extractAllTo(botDir, true);
            await addLog(serverId, deploymentId, { stream: 'system', message: 'Extracted ZIP file.' });

            // List extracted files
            const files = await fs.readdir(botDir);
            await updateState(serverId, deploymentId, prev => ({ 
                ...prev, 
                details: { ...prev.details, fileList: files } 
            }));

            // ENHANCED: Handle package.json - create if missing
            const packageJsonPath = path.join(botDir, 'package.json');
            let parsedPackageJson: any = null;
            
            if (!await fs.pathExists(packageJsonPath)) {
                await addLog(serverId, deploymentId, { stream: 'system', message: 'No package.json found, creating one...' });
                
                // Look for entry point for WhatsApp bots
                const entryPoints = ['index.js', 'main.js', 'bot.js', 'start.js', 'app.js'];
                let entryPoint = 'index.js';
                
                for (const point of entryPoints) {
                    if (await fs.pathExists(path.join(botDir, point))) {
                        entryPoint = point;
                        break;
                    }
                }
                
                // Also check for any .js file in root as last resort
                if (entryPoint === 'index.js') {
                    const files = await fs.readdir(botDir);
                    const jsFiles = files.filter(file => file.endsWith('.js') && !file.startsWith('.'));
                    if (jsFiles.length > 0) {
                        entryPoint = jsFiles[0];
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
                
                await addLog(serverId, deploymentId, { 
                    stream: 'system', 
                    message: `Created package.json with entry point: ${entryPoint}` 
                });
            } else {
                const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
                parsedPackageJson = JSON.parse(packageJsonContent);
                await addLog(serverId, deploymentId, { stream: 'system', message: 'Found existing package.json' });
            }

            await updateState(serverId, deploymentId, prev => ({ 
                ...prev, 
                details: { 
                    ...prev.details, 
                    packageJsonContent: parsedPackageJson,
                    dependencies: parsedPackageJson.dependencies || {} 
                } 
            }));
            deployments.get(deploymentId)!.parsedPackageJson = parsedPackageJson;

            await addLog(serverId, deploymentId, { stream: 'system', message: 'Analyzing dependencies...' });
            const envFileContent = await fs.pathExists(path.join(botDir, '.env')) ? await fs.readFile(path.join(botDir, '.env'), 'utf-8') : '';
            const mongoDbInfo = await detectMongoDBConfig({ packageJsonContent: JSON.stringify(parsedPackageJson), envFileContent });
            await updateState(serverId, deploymentId, prev => ({ ...prev, mongoDbInfo }));

            await installDependencies(botDir, serverId, deploymentId);
            await updateState(serverId, deploymentId, prev => ({ ...prev, status: 'Dependencies installed.', isDeploying: false }));
            
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

// Other actions remain the same...

export async function stopBotAction(serverId: string, deploymentId: string): Promise<{ success: boolean; message?: string }> {
	const deployments = getServerDeployments(serverId);
	const deployment = deployments.get(deploymentId);
	if (!deployment) return { success: false, message: 'Deployment not found' };

	await addLog(serverId, deploymentId, { stream: 'system', message: 'Stopping bot...' });
    deployment.autoRestart = false;
	if (deployment.process) {
		deployment.process.kill('SIGTERM');
        await updateState(serverId, deploymentId, prev => ({...prev, status: 'Bot stopped', stage: 'stopped'}));
        return { success: true, message: 'Bot stopped' };
	}
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
        await new Promise(resolve => setTimeout(resolve, 2000));
	}
    
    await updateState(serverId, deploymentId, prev => ({ ...prev, qrLogs: [], error: null }));
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

// File management functions
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
    deployment.process.stdin.write(data + '\n');
    await addLog(serverId, deploymentId, { stream: 'input', message: data });
    return { success: true };
}

export async function getDeploymentUpdates(serverId: string, deploymentId: string): Promise<BotDeployState | null> {
    const deployment = getServerDeployments(serverId).get(deploymentId);
    return deployment ? { ...deployment.state } : null;
}

export async function getServerName(serverId: string, deploymentId: string): Promise<string | null> {
    const deployment = getServerDeployments(serverId).get(deploymentId);
    return deployment?.serverName || null;
}