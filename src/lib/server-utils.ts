export interface Server {
  name: string;
  id: string;
  status: 'online' | 'offline' | 'deploying' | 'failed' | 'suspended';
  credentials: {
    username: string;
    password: string;
    email: string;
  };
  deploymentId?: string;
  lastActive?: number;
}

export const SERVER_COST = 50;

export function generateServerId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}

export function generateServerCredentials() {
  const username = `user${Math.floor(1000 + Math.random() * 9000)}`;
  const password = Math.random().toString(36).slice(-10) + Math.floor(10 + Math.random() * 90);
  const email = `${username}@botserver.com`;
  
  return { username, password, email };
}

export function getServersFromStorage(): Server[] {
  try {
    const stored = localStorage.getItem('userServers');
    if (!stored) {
      console.log('No servers found in localStorage');
      return [];
    }
    
    const servers = JSON.parse(stored);
    console.log('Retrieved servers from localStorage:', servers);
    return servers;
  } catch (error) {
    console.error('Error reading servers from localStorage:', error);
    return [];
  }
}

export function saveServersToStorage(servers: Server[]): boolean {
  try {
    console.log('Saving servers to localStorage:', servers);
    localStorage.setItem('userServers', JSON.stringify(servers));
    return true;
  } catch (error) {
    console.error('Error saving servers to localStorage:', error);
    return false;
  }
}

export function findServerById(serverId: string): Server | null {
  const servers = getServersFromStorage();
  const found = servers.find(s => s.id === serverId);
  console.log(`Looking for server with ID: ${serverId}, found:`, found);
  return found || null;
}

export function findServerByName(serverName: string): Server | null {
  const servers = getServersFromStorage();
  const found = servers.find(s => s.name === serverName);
  console.log(`Looking for server with name: ${serverName}, found:`, found);
  return found || null;
}

export function addServer(server: Server): boolean {
  try {
    console.log('Adding server:', server);
    const servers = getServersFromStorage();
    const updatedServers = [...servers, server];
    return saveServersToStorage(updatedServers);
  } catch (error) {
    console.error('Error adding server:', error);
    return false;
  }
}

export function updateServer(serverId: string, updates: Partial<Server>): boolean {
  try {
    const servers = getServersFromStorage();
    const updatedServers = servers.map(s => 
      s.id === serverId ? { ...s, ...updates } : s
    );
    return saveServersToStorage(updatedServers);
  } catch (error) {
    console.error('Error updating server:', error);
    return false;
  }
}

export function deleteServer(serverId: string): boolean {
  try {
    const servers = getServersFromStorage();
    const updatedServers = servers.filter(s => s.id !== serverId);
    return saveServersToStorage(updatedServers);
  } catch (error) {
    console.error('Error deleting server:', error);
    return false;
  }
}