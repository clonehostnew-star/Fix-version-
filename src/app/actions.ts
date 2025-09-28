'use server';

import type { BotDeployState, MongoDbAnalysisResult, DeploymentLog, FileNode } from '@/lib/types';
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

// Helper function to find available port - FIXED VERSION
async function getAvailablePort(startPort = 10000): Promise<number> {
    for (let port = startPort; port < 65535; port++) {
        try {
            const isAvailable = await new Promise<boolean>((resolve) => {
                const server = net.createServer();
                server.unref();
                server.on('error', () => resolve(false));
                server.listen(port, () => {
                    server.close(() => resolve(true));
                });
            });
            
            if (isAvailable) {
                return port;
            }
        } catch {
            // Continue to next port
        }
    }
    throw new Error('No available ports found');
}

// ADDED: Persistence functions from first version
export async function recoverLatestDeploymentAction(serverId: string): Promise<BotDeployState | null> {
    const deployments = getServerDeployments(serverId);
    const latestState = await loadLatestDeploymentForServer(serverId);

    if (latestState && latestState.deploymentId && !deployments.has(latestState.deploymentId)) {
        // If the latest deployment is not in memory, load it.
        // This happens on server restart.
        await addLog(serverId, latestState.deploymentId, { stream: 'system', message: 'Server restarted. Recovering latest deployment state.' });
        
        // The botDir is not restored here, as the files are ephemeral. User needs to re-deploy to run.
        const deploymentEntry = {
            state: { ...latestState, status: 'Recovered after server restart. Re-deploy to run.', stage: 'stopped' },
            process: null,
            botDir: null, 
            parsedPackageJson: null,
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

// Write input to bot process
export async function writeToBot(serverId: string, deploymentId: string, data: string): Promise<{ success: boolean; message?: string }> {
    const deployments = getServerDeployments(serverId);
    const deployment = deployments.get(deploymentId);
    if (!deployment?.process?.stdin) {
        return { success: false, message: 'Process not available' };
    }
    
    deployment.process.stdin.write(data);
    // ADDED: Persistence for logs
    const newLog: DeploymentLog = {
        id: Date.now().toString(),
        stream: 'input',
        message: data,
        timestamp: new Date().toISOString()
    };
    deployment.state.logs.push(newLog);
    await appendLogs(serverId, deploymentId, [newLog]);
    return { success: true };
}

// Get deployment updates
export async function getDeploymentUpdates(serverId: string, deploymentId: string): Promise<BotDeployState | null> {
    const deployments = getServerDeployments(serverId);
    const deployment = deployments.get(deploymentId);
    return deployment?.state || null;
}

// Check if deployment exists
export async function checkDeploymentExists(serverId: string, deploymentId: string): Promise<boolean> {
    const deployments = getServerDeployments(serverId);
    return deployments.has(deploymentId);
}

// Clear deployment logs - ENHANCED with persistence
export async function clearDeploymentLogs(serverId: string, deploymentId: string): Promise<{ success: boolean }> {
    const deployments = getServerDeployments(serverId);
    const deployment = deployments.get(deploymentId);
    if (!deployment) return { success: false };
    
    deployment.state.logs = [];
    deployment.state.qrLogs = [];
    deployment.state.error = null;
    
    // ADDED: Persistence clear
    await clearPersistenceLogs(serverId, deploymentId);
    await saveDeploymentState(serverId, deploymentId, deployment.state);
    
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
        // ADDED: Persistence delete
        await deleteDeployment(serverId, deploymentId);
    }
    return { success: true };
}

// Get server name for a deployment
export async function getServerName(serverId: string, deploymentId: string): Promise<string | null> {
    const deployments = getServerDeployments(serverId);
    const deployment = deployments.get(deploymentId);
    return deployment?.serverName || null;
}

// Internal state management - ENHANCED with persistence
const updateState = async (serverId: string, deploymentId: string, updater: (prevState: BotDeployState) => BotDeployState) => {
    const deployments = getServerDeployments(serverId);
    const deployment = deployments.get(deploymentId);
    if (deployment) {
        deployment.state = updater(deployment.state);
        // ADDED: Persistence save
        await saveDeploymentState(serverId, deploymentId, deployment.state);
    }
};

const addLog = async (serverId: string, deploymentId: string, log: Omit<DeploymentLog, 'id' | 'timestamp'>) => {
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
    
    // ADDED: Persistence append
    await appendLogs(serverId, deploymentId, [newLog]);
};

// FIXED: Install dependencies for a bot with legacy peer deps as fallback
async function installDependencies(botDir: string, serverId: string, deploymentId: string): Promise<void> {
    // Verify Node version - FIXED: Proper async handling
    await addLog(serverId, deploymentId, { stream: 'system', message: 'Checking Node.js version...' });
    
    try {
        await new Promise<void>((resolve, reject) => {
            const proc = spawn('node', ['--version'], { cwd: botDir, shell: true, stdio: 'pipe' });
            let versionOutput = '';
            
            proc.stdout?.on('data', (data) => {
                versionOutput += data.toString();
            });
            
            proc.on('close', async (code) => {
                if (code === 0) {
                    const version = versionOutput.trim();
                    await addLog(serverId, deploymentId, { stream: 'system', message: `Using ${version}` });
                    if (!version.includes('v20.')) {
                        await addLog(serverId, deploymentId, { 
                            stream: 'stderr', 
                            message: 'Warning: Recommended Node.js v20 not detected' 
                        });
                    }
                    resolve();
                } else {
                    reject(new Error('Failed to get Node version'));
                }
            });
            
            proc.on('error', (err) => {
                reject(err);
            });
        });
    } catch {
        await addLog(serverId, deploymentId, { 
            stream: 'stderr', 
            message: 'Could not determine Node.js version' 
        });
    }

    // First check if package.json exists and read it
    const packageJsonPath = path.join(botDir, 'package.json');
    let hasBuildScript = false;
    
    if (await fs.pathExists(packageJsonPath)) {
        try {
            const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
            const parsedPackageJson = JSON.parse(packageJsonContent);
            hasBuildScript = parsedPackageJson.scripts && parsedPackageJson.scripts.build;
        } catch (error) {
            await addLog(serverId, deploymentId, { 
                stream: 'stderr', 
                message: 'Could not parse package.json to check build script' 
            });
        }
    }

    // ENHANCED: Dependency installation with legacy peer deps as fallback
    const commands = [
        { cmd: ['npm', 'cache', 'clean', '--force'], desc: 'Cleaning npm cache', optional: true },
        { cmd: ['npm', 'install'], desc: 'Installing dependencies' },
        { cmd: ['npm', 'install', '--legacy-peer-deps'], desc: 'Installing with legacy peer dependencies', optional: true },
        { cmd: ['npm', 'ci'], desc: 'Installing dependencies (ci)', optional: true },
        { cmd: ['npm', 'audit', 'fix'], desc: 'Fixing vulnerabilities', optional: true }
    ];

    // Add build command only if the script exists
    if (hasBuildScript) {
        commands.push({ cmd: ['npm', 'run', 'build'], desc: 'Building project', optional: false });
    } else {
        await addLog(serverId, deploymentId, { 
            stream: 'system', 
            message: 'Skipping build - no build script found in package.json' 
        });
    }

    // Execute all commands
    let lastError: string | null = null;
    
    for (const { cmd, desc, optional } of commands) {
        const success = await new Promise<boolean>(async (resolve) => {
            await addLog(serverId, deploymentId, { stream: 'system', message: `${desc}...` });
            const proc = spawn(cmd[0], cmd.slice(1), { cwd: botDir, shell: true, stdio: 'pipe' });
            
            proc.stdout?.on('data', async (data) => {
                await addLog(serverId, deploymentId, { stream: 'stdout', message: data.toString() });
            });
            
            proc.stderr?.on('data', async (data) => {
                await addLog(serverId, deploymentId, { stream: 'stderr', message: data.toString() });
            });
            
            proc.on('close', async (code) => {
                if (code === 0) {
                    await addLog(serverId, deploymentId, { stream: 'system', message: `${desc} completed successfully` });
                    resolve(true);
                } else {
                    const errorMsg = `${desc} failed (code ${code})`;
                    await addLog(serverId, deploymentId, { stream: 'stderr', message: errorMsg });
                    lastError = errorMsg;
                    resolve(!!optional);
                }
            });
            
            proc.on('error', async (err) => {
                const errorMsg = `${desc} error: ${err.message}`;
                await addLog(serverId, deploymentId, { stream: 'stderr', message: errorMsg });
                lastError = errorMsg;
                resolve(!!optional);
            });
        });

        if (!success && !optional) {
            throw new Error(lastError || `${desc} failed`);
        }
    }
}

// Start bot process with fallback mechanisms
async function startBotProcess(serverId: string, deploymentId: string): Promise<{ success: boolean; error?: string }> {
    const deployments = getServerDeployments(serverId);
    const deployment = deployments.get(deploymentId);
    if (!deployment || !deployment.botDir) {
        return { success: false, error: 'Deployment not ready' };
    }

    await updateState(serverId, deploymentId, prev => ({ 
        ...prev, 
        status: 'Starting the bot...', 
        stage: 'running' 
    }));

    try {
        const botEnv = { ...process.env };
        const port = await getAvailablePort();
        botEnv.PORT = port.toString();
        await addLog(serverId, deploymentId, { stream: 'system', message: `Assigned port ${port} to bot process.` });

        if (deployment.state.mongoDbInfo?.connectionString) {
            botEnv.MONGODB_URI = deployment.state.mongoDbInfo.connectionString;
            await addLog(serverId, deploymentId, { stream: 'system', message: 'MONGODB_URI set for bot process.' });
        }

        // Determine the correct start command with fallbacks
        const startCommands = await determineStartCommand(deployment.botDir, serverId, deploymentId);
        
        let currentCommandIndex = 0;
        let lastError: string | null = null;

        // Try each start command until one works or all fail
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
                lastError = result.error || null;
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
        await updateState(serverId, deploymentId, prev => ({...prev, 
            error: `Failed to start bot process: ${err.message}`, 
            status: 'Failed to start bot.', 
            stage: 'error', 
            isDeploying: false 
        }));
        return { success: false, error: err.message };
    }
}

// Helper function to determine possible start commands for WhatsApp bots
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

// Helper function to try a specific start command
async function tryStartCommand(
    command: string, 
    args: string[], 
    cwd: string, 
    env: NodeJS.ProcessEnv, 
    serverId: string, 
    deploymentId: string,
    deployment: any
): Promise<{ success: boolean; error?: string }> {
    return new Promise(async (resolve) => {
        const proc = spawn(command, args, { 
            cwd, 
            env, 
            shell: true, 
            stdio: 'pipe' 
        });

        deployment.process = proc;
        deployment.autoRestart = true;
        deployment.restartAttempts = 0;

        proc.stdout?.on('data', async (data) => {
            await addLog(serverId, deploymentId, { stream: 'stdout', message: data.toString() });
        });

        proc.stderr?.on('data', async (data) => {
            const message = data.toString();
            // Handle missing module errors
            if (message.includes('Cannot find module')) {
                const missingModule = message.match(/Cannot find module '([^']+)'/)?.[1];
                if (missingModule) {
                    await addLog(serverId, deploymentId, { 
                        stream: 'stderr', 
                        message: `CRITICAL: Missing required module: ${missingModule}` 
                    });
                }
            }
            // Handle file not found errors
            else if (message.includes('Cannot find module') && message.includes('.js')) {
                const match = message.match(/Cannot find module '([^']+\.js)'/);
                if (match) {
                    await addLog(serverId, deploymentId, { 
                        stream: 'stderr', 
                        message: `File not found: ${match[1]}, will try alternative start command` 
                    });
                    proc.kill('SIGTERM');
                    resolve({ success: false, error: `File not found: ${match[1]}` });
                    return;
                }
            }
            await addLog(serverId, deploymentId, { stream: 'stderr', message });
        });

        proc.on('spawn', async () => {
            await addLog(serverId, deploymentId, { 
                stream: 'system', 
                message: `Bot process started with: ${command} ${args.join(' ')}` 
            });
            await updateState(serverId, deploymentId, prev => ({ 
                ...prev, 
                status: 'Bot process started successfully.', 
                stage: 'running' 
            }));
        });

        proc.on('close', async (code) => {
            if (deployment) {
                deployment.process = null;
            }
            
            if (code !== 0 && code !== null) {
                resolve({ success: false, error: `Process exited with code ${code}` });
            } else {
                resolve({ success: true });
            }
        });
        
        proc.on('error', async (err) => {
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

// Stop bot process (non-destructive: keep files and deployment state)
export async function stopBotAction(serverId: string, deploymentId: string): Promise<{ success: boolean; message?: string }> {
	const deployments = getServerDeployments(serverId);
	const deployment = deployments.get(deploymentId);
	if (!deployment) {
		return { success: false, message: 'Deployment not found' };
	}

	await addLog(serverId, deploymentId, { stream: 'system', message: 'Stopping bot (non-destructive)...' });
	let killed = true;
	if (deployment.process) {
		deployment.autoRestart = false;
		killed = deployment.process.kill('SIGTERM');
	}

	if (killed) {
		deployment.process = null;
		await updateState(serverId, deploymentId, prev => ({
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

		await addLog(serverId, deploymentId, { stream: 'system', message: 'Completely stopping bot and cleaning up (destructive)...' });

		// Stop the process first
		let killed = true;
		if (deployment.process) {
			try {
				deployment.autoRestart = false;
				killed = deployment.process.kill('SIGTERM');
				
				await new Promise(resolve => setTimeout(resolve, 1000));
				
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
			}
		}

		// Remove deployment from tracking
		deployments.delete(deploymentId);
		await deleteDeployment(serverId, deploymentId);
		
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

	await addLog(serverId, deploymentId, { stream: 'system', message: 'Restarting bot...' });

	if (deployment.process) {
		await stopBotAction(serverId, deploymentId);
		await new Promise(resolve => setTimeout(resolve, 2000));
	}

	await updateState(serverId, deploymentId, prev => ({ 
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

    await saveDeploymentState(serverId, deploymentId, initialState);

    (async () => {
        try {
            await addLog(serverId, deploymentId, { 
                stream: 'system', 
                message: 'Starting deployment process...' 
            });

            // Create temp directory
            const tempDir = path.join(os.tmpdir(), `bot-${Date.now()}`);
            const botDir = path.join(tempDir, 'bot');
            await fs.ensureDir(botDir);

            const deployments = getServerDeployments(serverId);
            const deployment = deployments.get(deploymentId);
            if (deployment) deployment.botDir = botDir;

            await addLog(serverId, deploymentId, { 
                stream: 'system', 
                message: 'Extracting bot files...' 
            });

            // Extract zip file
            const zip = new AdmZip(Buffer.from(await file.arrayBuffer()));
            zip.extractAllTo(botDir, true);

            // List extracted files
            const files = await fs.readdir(botDir);
            await updateState(serverId, deploymentId, prev => ({ 
                ...prev, 
                details: { ...prev.details, fileList: files } 
            }));

            await addLog(serverId, deploymentId, { 
                stream: 'system', 
                message: `Extracted ${files.length} files` 
            });

            // Handle package.json
            let packageJsonPath = path.join(botDir, 'package.json');
            let parsedPackageJson: any = null;
            
            if (!await fs.pathExists(packageJsonPath)) {
                await addLog(serverId, deploymentId, { 
                    stream: 'system', 
                    message: 'No package.json found, creating one...' 
                });
                
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
                const content = await fs.readFile(packageJsonPath, 'utf-8');
                parsedPackageJson = JSON.parse(content);
                await addLog(serverId, deploymentId, { 
                    stream: 'system', 
                    message: 'Found existing package.json' 
                });
            }

            await updateState(serverId, deploymentId, prev => ({ 
                ...prev, 
                details: { 
                    ...prev.details, 
                    packageJsonContent: parsedPackageJson,
                    dependencies: parsedPackageJson.dependencies || {} 
                } 
            }));

            if (deployment) deployment.parsedPackageJson = parsedPackageJson;

            // Quick dependency check and install
            await addLog(serverId, deploymentId, { 
                stream: 'system', 
                message: 'Checking dependencies...' 
            });

            try {
                await installDependencies(botDir, serverId, deploymentId);
                await addLog(serverId, deploymentId, { 
                    stream: 'system', 
                    message: 'Dependencies installed successfully' 
                });
            } catch (depError: any) {
                await addLog(serverId, deploymentId, { 
                    stream: 'stderr', 
                    message: `Dependency installation warning: ${depError.message}` 
                });
            }

            // MongoDB analysis
            await addLog(serverId, deploymentId, { 
                stream: 'system', 
                message: 'Analyzing MongoDB configuration...' 
            });

            const envPath = path.join(botDir, '.env');
            const envFileContent = await fs.pathExists(envPath)
                ? await fs.readFile(envPath, 'utf-8')
                : '';

            const packageJsonContent = parsedPackageJson ? JSON.stringify(parsedPackageJson) : '{}';

            try {
                const mongoDbInfo = await detectMongoDBConfig({ packageJsonContent, envFileContent });
                await updateState(serverId, deploymentId, prev => ({ 
                    ...prev, 
                    mongoDbInfo 
                }));
                
                if (mongoDbInfo.requiresMongoDB) {
                    await addLog(serverId, deploymentId, { 
                        stream: 'system', 
                        message: 'MongoDB requirement detected and configured' 
                    });
                } else {
                    await addLog(serverId, deploymentId, { 
                        stream: 'system', 
                        message: 'No MongoDB requirement detected' 
                    });
                }
            } catch (mongoError: any) {
                await addLog(serverId, deploymentId, { 
                    stream: 'stderr', 
                    message: `MongoDB analysis warning: ${mongoError.message}` 
                });
            }

            // Start the bot
            await addLog(serverId, deploymentId, { 
                stream: 'system', 
                message: 'Starting bot process...' 
            });

            const startResult = await startBotProcess(serverId, deploymentId);
            if (startResult.success) {
                await updateState(serverId, deploymentId, prev => ({ 
                    ...prev, 
                    status: 'Bot deployed successfully',
                    stage: 'running',
                    isDeploying: false,
                    error: null
                }));
                await addLog(serverId, deploymentId, { 
                    stream: 'system', 
                    message: '🎉 Bot deployed and running successfully!' 
                });
                
                try {
                    const { setServerStatus } = await import('@/lib/userStorage');
                    setServerStatus('admin@whatsapp-bot.com', serverId, 'online');
                } catch (error) {
                    console.log('Could not update server status:', error);
                }
            } else {
                throw new Error(startResult.error || 'Failed to start bot');
            }

        } catch (error: any) {
            console.error('Deployment error:', error);
            
            await updateState(serverId, deploymentId, prev => ({ 
                ...prev, 
                error: error.message,
                stage: 'error',
                isDeploying: false 
            }));
            
            await addLog(serverId, deploymentId, { 
                stream: 'stderr', 
                message: `Deployment failed: ${error.message}` 
            });
        }
    })();

    return { deploymentId, error: null };
}

// File manager functions
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
    
    if (stats.size > 10 * 1024 * 1024) {
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
        await fs.ensureDir(path.dirname(fullPath));
        await fs.writeFile(fullPath, '', 'utf-8');
    }
    
    return { success: true };
}

export async function deleteFileAction(serverId: string, deploymentId: string, filePath: string): Promise<{ success: boolean }> {
    const fullPath = getValidatedFilePath(serverId, deploymentId, filePath);
    
    const deployments = getServerDeployments(serverId);
    const deployment = deployments.get(deploymentId);
    if (deployment?.botDir && fullPath === deployment.botDir) {
        throw new Error("Cannot delete the root bot directory");
    }
    
    await fs.remove(fullPath);
    return { success: true };
}