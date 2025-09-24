// Utilities for user-scoped client storage and simple role/permissions
// NOTE: This app is currently client-only for persistence. We scope all
// keys by the authenticated email so data survives logouts and does not
// mix between different users using the same browser.

export type AdminPermissions = {
  claimAnytime?: boolean;
  manageUsers?: boolean;
  grantCoins?: boolean;
  suspendUsers?: boolean;
};

export type UserProfile = {
  email: string;
  displayName?: string;
  username?: string;
  createdAt: number;
  suspended?: boolean;
  banned?: boolean;
  bannedAt?: number;
  bannedBy?: string;
  suspendedAt?: number;
  suspendedBy?: string;
  lastSignIn?: number;
};

export type HistoryRecord = {
  id: string;
  serverId: string;
  serverName: string;
  fileName?: string | null;
  status: 'deploying' | 'active' | 'failed' | 'stopped' | 'paused';
  message?: string;
  timestamp: number;
};

const DEFAULT_OWNER_EMAILS = new Set<string>([
  'projectvpn89@gmail.com',
]);

function emailKey(email?: string | null): string | null {
  if (!email) return null;
  return email.toLowerCase().replace(/[^a-z0-9_.-]+/g, '_');
}

export function rawScopedKey(email: string | null | undefined, base: string): string {
  const ek = emailKey(email) || 'anonymous';
  return `${base}__${ek}`;
}

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

// Coin balance
export function getCoinBalance(email?: string | null): number | 'unlimited' {
  if (email && isOwner(email)) return 'unlimited';
  const key = rawScopedKey(email || null, 'coinBalance');
  const raw = typeof window === 'undefined' ? null : localStorage.getItem(key);
  const num = raw ? Number(raw) : 0;
  return Number.isFinite(num) ? num : 0;
}

export function setCoinBalance(email: string | null | undefined, value: number) {
  if (!email) return;
  if (isOwner(email)) return; // owners are unlimited
  const key = rawScopedKey(email, 'coinBalance');
  localStorage.setItem(key, String(Math.max(0, Math.floor(value))));
  window.dispatchEvent(new Event('storage'));
}

export function addCoins(email: string | null | undefined, delta: number) {
  if (!email) return;
  if (isOwner(email)) return;
  const current = getCoinBalance(email);
  const next = (typeof current === 'number' ? current : 0) + delta;
  setCoinBalance(email, next);
}

// Automatic monthly billing and server suspension
export function processMonthlyBilling(email: string): { 
  success: boolean; 
  message: string; 
  serversSuspended: number;
  newBalance: number;
} {
  if (!email || isOwner(email)) {
    return { success: false, message: 'Owner accounts are not billed', serversSuspended: 0, newBalance: 0 };
  }

  try {
    const currentBalance = getCoinBalance(email);
    if (typeof currentBalance !== 'number') {
      return { success: false, message: 'Invalid balance', serversSuspended: 0, newBalance: 0 };
    }

    const MONTHLY_COST = 50; // 50 coins per month per server
    const userServers = getServers(email);
    const totalCost = userServers.length * MONTHLY_COST;

    if (currentBalance >= totalCost) {
      // User has enough coins, deduct the cost
      const newBalance = currentBalance - totalCost;
      setCoinBalance(email, newBalance);
      
      return { 
        success: true, 
        message: `Monthly billing successful. ${totalCost} coins deducted for ${userServers.length} server(s).`, 
        serversSuspended: 0, 
        newBalance 
      };
    } else {
      // User doesn't have enough coins, suspend all servers
      const updatedServers = userServers.map(server => ({
        ...server,
        status: 'suspended' as const,
        suspendedAt: Date.now(),
        suspendedBy: 'system'
      })) as StoredServer[];
      
      setServers(email, updatedServers);
      
      return { 
        success: false, 
        message: `Insufficient coins for monthly billing. ${userServers.length} server(s) suspended.`, 
        serversSuspended: userServers.length, 
        newBalance: currentBalance 
      };
    }
  } catch (error) {
    console.error('Error processing monthly billing:', error);
    return { 
      success: false, 
      message: 'Error processing monthly billing', 
      serversSuspended: 0, 
      newBalance: 0 
    };
  }
}

// Servers
export type StoredServer = {
  name: string;
  id: string;
  status: 'online' | 'offline' | 'deploying' | 'failed' | 'suspended';
  credentials: { username: string; password: string; email: string };
  deploymentId?: string;
  lastActive?: number;
};

export function getServers(email?: string | null): StoredServer[] {
  const key = rawScopedKey(email || null, 'userServers');
  return readJSON<StoredServer[]>(key, []);
}

export function setServers(email: string | null | undefined, servers: StoredServer[]) {
  if (!email) return;
  const key = rawScopedKey(email, 'userServers');
  writeJSON(key, servers);
}

// Per-server status
export function setServerStatus(email: string | null | undefined, serverId: string, status: 'deploying' | 'active' | 'failed' | 'offline' | 'suspended' | 'paused') {
  if (!email) return;
  const key = rawScopedKey(email, `serverStatus_${serverId}`);
  localStorage.setItem(key, status);
}

export function getServerStatus(email: string | null | undefined, serverId: string): 'deploying' | 'active' | 'failed' | 'offline' | 'paused' | 'suspended' | null {
  if (!email) return null;
  
  // Check the stored status first
  const key = rawScopedKey(email, `serverStatus_${serverId}`);
  const storedStatus = localStorage.getItem(key) as any;
  
  // Check deployment state from control panel persistence
  const deploymentKey = `whatsapp-bot-deployment-id-${serverId}`;
  const deploymentId = localStorage.getItem(deploymentKey);
  
  // Check deployment state
  const stateKey = `whatsapp-bot-state-${serverId}`;
  const deploymentState = localStorage.getItem(stateKey);
  
  if (deploymentState) {
    try {
      const state = JSON.parse(deploymentState);
      if (state.stage === 'finished' && state.status) {
        if (state.status.includes('stopped') || state.status.includes('paused')) {
          return 'paused';
        } else if (state.status.includes('failed') || state.status.includes('error')) {
          return 'failed';
        } else if (state.status.includes('running') || state.status.includes('online')) {
          return 'active';
        }
      } else if (state.stage === 'error') {
        return 'failed';
      } else if (state.stage === 'deploying' || state.isDeploying) {
        return 'deploying';
      }
    } catch (e) {
      console.error('Error parsing deployment state:', e);
    }
  }
  
  // Check if server is suspended
  if (storedStatus === 'suspended') {
    return 'suspended';
  }
  
  // Fallback to stored status
  return storedStatus || null;
}

// History
export function getHistory(email?: string | null): HistoryRecord[] {
  const key = rawScopedKey(email || null, 'deploymentHistory');
  return readJSON<HistoryRecord[]>(key, []);
}

export function addHistory(email: string | null | undefined, record: Omit<HistoryRecord, 'id' | 'timestamp'>) {
  if (!email) return;
  const items = getHistory(email);
  items.unshift({ id: `${Date.now()}_${Math.random().toString(36).slice(2,8)}`, timestamp: Date.now(), ...record });
  const key = rawScopedKey(email, 'deploymentHistory');
  writeJSON(key, items.slice(0, 500));
}

// Uploaded zips
export function getZips(email?: string | null): Array<{name: string, data: string, size: number, uploadedAt: number}> {
  const key = rawScopedKey(email || null, 'uploadedZips');
  return readJSON<Array<{name: string, data: string, size: number, uploadedAt: number}>>(key, []);
}

export function addZip(email: string | null | undefined, name: string, fileData?: File) {
  if (!email) return;
  const z = getZips(email);
  
  if (fileData) {
    // Store actual file data
    const reader = new FileReader();
    reader.onload = () => {
      const zipEntry = {
        name,
        data: reader.result as string,
        size: fileData.size,
        uploadedAt: Date.now()
      };
      z.unshift(zipEntry);
      const key = rawScopedKey(email, 'uploadedZips');
      writeJSON(key, Array.from(new Set(z.map(z => z.name))).slice(0, 500).map(name => 
        z.find(zip => zip.name === name) || {name, data: '', size: 0, uploadedAt: Date.now()}
      ));
    };
    reader.readAsDataURL(fileData);
  } else {
    // Fallback for just name
    z.unshift({name, data: '', size: 0, uploadedAt: Date.now()});
    const key = rawScopedKey(email, 'uploadedZips');
    writeJSON(key, Array.from(new Set(z.map(z => z.name))).slice(0, 500).map(name => 
      z.find(zip => zip.name === name) || {name, data: '', size: 0, uploadedAt: Date.now()}
    ));
  }
}

export function downloadZip(email: string | null | undefined, fileName: string): void {
  if (!email) return;
  const zips = getZips(email);
  const zip = zips.find(z => z.name === fileName);
  if (zip && zip.data) {
    // Create download link
    const link = document.createElement('a');
    link.href = zip.data;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// Users registry (for owner/admin tools in this client-only app)
export function addOrUpdateUserProfile(profile: UserProfile) {
  const list = readJSON<UserProfile[]>('siteUsers', []);
  const idx = list.findIndex(u => u.email.toLowerCase() === profile.email.toLowerCase());
  if (idx >= 0) list[idx] = { ...list[idx], ...profile };
  else list.unshift(profile);
  writeJSON('siteUsers', list);
}

export function getAllUsers(): UserProfile[] {
  return readJSON<UserProfile[]>('siteUsers', []);
}

export function getUserProfile(email: string): UserProfile | undefined {
  const users = getAllUsers();
  return users.find(u => u.email.toLowerCase() === email.toLowerCase());
}


// Roles
export function isOwner(email?: string | null): boolean {
  if (!email) return false;
  const stored = readJSON<string[]>('owners', []);
  return DEFAULT_OWNER_EMAILS.has(email.toLowerCase()) || stored.map(e => e.toLowerCase()).includes(email.toLowerCase());
}

export function getAdmins(): Record<string, AdminPermissions> {
  return readJSON<Record<string, AdminPermissions>>('admins', {});
}

export function isAdmin(email?: string | null): boolean {
  if (!email) return false;
  if (isOwner(email)) return true;
  const admins = getAdmins();
  return !!admins[email.toLowerCase()];
}

export function getAdminPermissions(email?: string | null): AdminPermissions {
  if (!email) return {};
  if (isOwner(email)) return { claimAnytime: true, manageUsers: true, grantCoins: true, suspendUsers: true };
  const admins = getAdmins();
  return admins[email.toLowerCase()] || {};
}

export function addAdmin(email: string, permissions?: AdminPermissions) {
  const admins = getAdmins();
  admins[email.toLowerCase()] = permissions || { claimAnytime: true };
  writeJSON('admins', admins);
}

export function removeAdmin(email: string) {
  const admins = getAdmins();
  delete admins[email.toLowerCase()];
  writeJSON('admins', admins);
}

// Owners management
export function getOwners(): string[] {
  return readJSON<string[]>('owners', []);
}

export function addOwner(email: string) {
  const owners = getOwners();
  const e = email.toLowerCase();
  if (!owners.map(o => o.toLowerCase()).includes(e)) {
    owners.push(email);
    writeJSON('owners', owners);
  }
}

export function removeOwner(email: string) {
  const owners = getOwners().filter(o => o.toLowerCase() !== email.toLowerCase());
  writeJSON('owners', owners);
}

// Secrets for owner visibility (demo only)
type UserSecret = { lastPassword?: string };
export function setUserSecret(email: string, secret: UserSecret) {
  const all = readJSON<Record<string, UserSecret>>('userSecrets', {});
  all[email.toLowerCase()] = { ...(all[email.toLowerCase()] || {}), ...secret };
  writeJSON('userSecrets', all);
}
export function getUserSecret(email: string): UserSecret | undefined {
  const all = readJSON<Record<string, UserSecret>>('userSecrets', {});
  return all[email.toLowerCase()];
}

// Ban
export function setBanned(email: string, banned: boolean) {
  try {
    // Update user profile
    const list = getAllUsers();
    const idx = list.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    if (idx >= 0) {
      list[idx].banned = banned;
      list[idx].bannedAt = banned ? Date.now() : undefined;
      list[idx].bannedBy = banned ? 'admin' : undefined;
      writeJSON('siteUsers', list);
    }
    
    // If banning, also suspend all their servers
    if (banned) {
      const userServers = getServers(email);
      userServers.forEach(server => {
        setServerStatus(email, server.id, 'suspended');
        // Mark server as suspended in server data
        const updatedServers = userServers.map(s => 
          s.id === server.id ? { ...s, status: 'suspended' as const, suspendedAt: Date.now() } : s
        ) as StoredServer[];
        setServers(email, updatedServers);
      });
    }
    
    // Dispatch storage event for cross-browser sync
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage'));
    }
  } catch (error) {
    console.error('Error setting banned status:', error);
  }
}

export function isBanned(email?: string | null): boolean {
  if (!email) return false;
  try {
    const list = getAllUsers();
    const found = list.find(u => u.email.toLowerCase() === email.toLowerCase());
    return !!found?.banned;
  } catch (error) {
    console.error('Error checking banned status:', error);
    return false;
  }
}



// Suspend
export function setSuspended(email: string, suspended: boolean) {
  try {
    // Update user profile
    const list = getAllUsers();
    const idx = list.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    if (idx >= 0) {
      list[idx].suspended = suspended;
      list[idx].suspendedAt = suspended ? Date.now() : undefined;
      list[idx].suspendedBy = suspended ? 'admin' : undefined;
      writeJSON('siteUsers', list);
    }
    

    
    // If suspending, also suspend all their servers
    if (suspended) {
      const userServers = getServers(email);
      userServers.forEach(server => {
        setServerStatus(email, server.id, 'suspended');
        // Mark server as suspended in server data
        const updatedServers = userServers.map(s => 
          s.id === server.id ? { ...s, status: 'suspended' as const, suspendedAt: Date.now() } : s
        ) as StoredServer[];
        setServers(email, updatedServers);
      });
    }
    
    // Dispatch storage event for cross-browser sync
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage'));
    }
  } catch (error) {
    console.error('Error setting suspended status:', error);
  }
}

export function isSuspended(email?: string | null): boolean {
  if (!email) return false;
  try {
    const list = getAllUsers();
    const found = list.find(u => u.email.toLowerCase() === email.toLowerCase());
    return !!found?.suspended;
  } catch (error) {
    console.error('Error checking suspended status:', error);
    return false;
  }
}



// Server suspension
export function suspendServer(email: string, serverId: string, suspended: boolean) {
  try {
    const userServers = getServers(email);
    const updatedServers = userServers.map(server => 
      server.id === serverId 
        ? { 
            ...server, 
            status: (suspended ? 'suspended' : 'offline') as StoredServer['status'],
            suspendedAt: suspended ? Date.now() : undefined
          }
        : server
    ) as StoredServer[];
    
    setServers(email, updatedServers);
    setServerStatus(email, serverId, suspended ? 'suspended' : 'offline');
    
    // Dispatch storage event for cross-browser sync
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage'));
    }
  } catch (error) {
    console.error('Error suspending server:', error);
  }
}

export function isServerSuspended(email: string, serverId: string): boolean {
  try {
    const status = getServerStatus(email, serverId);
    return status === 'suspended';
  } catch (error) {
    console.error('Error checking server suspension:', error);
    return false;
  }
}

// Simple user access check - reverted to basic functionality
export function canUserAccess(email?: string | null): boolean {
  if (!email) return false;
  try {
    const banned = isBanned(email);
    const suspended = isSuspended(email);
    return !banned && !suspended;
  } catch (error) {
    console.error('Error checking user access:', error);
    return true; // Default to allowing access on error
  }
}

// Grant coins to a user (owners/admins)
export function grantCoinsTo(email: string, amount: number) {
  if (!email || !Number.isFinite(amount)) return;
  addCoins(email, Math.floor(amount));
}

// Delete account (client-side clean)
export function deleteAccountData(email: string) {
  // remove from siteUsers
  const users = getAllUsers().filter(u => u.email.toLowerCase() !== email.toLowerCase());
  writeJSON('siteUsers', users);
  // remove roles
  const admins = getAdmins();
  delete admins[email.toLowerCase()];
  writeJSON('admins', admins);
  removeOwner(email);
  // remove scoped keys
  const ek = email.toLowerCase().replace(/[^a-z0-9_.-]+/g, '_');
  const keys = [
    `coinBalance__${ek}`,
    `userServers__${ek}`,
    `deploymentHistory__${ek}`,
    `uploadedZips__${ek}`,
  ];
  keys.forEach(k => localStorage.removeItem(k));
}

// Migration helpers for legacy, non-scoped keys
export function migrateLegacyKeysToScoped(email?: string | null) {
  if (!email) return;
  const ek = emailKey(email)!;
  const legacyCoins = typeof window === 'undefined' ? null : localStorage.getItem('coinBalance');
  if (legacyCoins !== null && localStorage.getItem(`coinBalance__${ek}`) === null) {
    localStorage.setItem(`coinBalance__${ek}`, legacyCoins);
  }
  const legacyServers = typeof window === 'undefined' ? null : localStorage.getItem('userServers');
  if (legacyServers !== null && localStorage.getItem(`userServers__${ek}`) === null) {
    localStorage.setItem(`userServers__${ek}`, legacyServers);
  }
}

// Clear legacy global data to prevent user data mixing
export function clearLegacyGlobalData() {
  if (typeof window === 'undefined') return;
  
  // Remove any legacy global keys that could cause data mixing
  const legacyKeys = [
    'userServers',
    'coinBalance',
    'deploymentHistory',
    'uploadedZips'
  ];
  
  legacyKeys.forEach(key => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
    }
  });
}

// Ensure user data isolation on login
export function ensureUserDataIsolation(email: string) {
  if (!email) return;
  
  // Clear any legacy global data first
  clearLegacyGlobalData();
  
  // Ensure the user has their own scoped data
  const ek = emailKey(email);
  if (!ek) return;
  
  // Initialize empty data if none exists
  if (localStorage.getItem(`coinBalance__${ek}`) === null) {
    localStorage.setItem(`coinBalance__${ek}`, '50'); // Default starting coins
  }
  
  if (localStorage.getItem(`userServers__${ek}`) === null) {
    localStorage.setItem(`userServers__${ek}`, '[]');
  }
  
  if (localStorage.getItem(`deploymentHistory__${ek}`) === null) {
    localStorage.setItem(`deploymentHistory__${ek}`, '[]');
  }
  
  if (localStorage.getItem(`uploadedZips__${ek}`) === null) {
    localStorage.setItem(`uploadedZips__${ek}`, '[]');
  }
}

