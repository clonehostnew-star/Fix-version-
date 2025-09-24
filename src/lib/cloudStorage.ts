// Cloud storage system for cross-browser data persistence
// This uses localStorage as fallback but can be extended to use cloud storage

export interface CloudStorageData {
  email: string;
  data: any;
  timestamp: number;
  version: string;
}

const STORAGE_VERSION = '1.0.0';
const CLOUD_STORAGE_KEY = 'whatsapp-bot-cloud-storage';

// Try to get data from cloud storage first, fallback to localStorage
export async function getCloudData(email: string, key: string): Promise<any> {
  if (typeof window === 'undefined') return null;
  
  try {
    // First try to get from cloud storage
    const cloudData = await getFromCloudStorage(email, key);
    if (cloudData) {
      // Also update local storage as cache
      setLocalData(email, key, cloudData);
      return cloudData;
    }
    
    // Fallback to local storage
    return getLocalData(email, key);
  } catch (error) {
    console.error('Error getting cloud data:', error);
    // Fallback to local storage
    return getLocalData(email, key);
  }
}

// Save data to both cloud storage and local storage
export async function setCloudData(email: string, key: string, data: any): Promise<void> {
  if (typeof window === 'undefined') return;
  
  try {
    // Save to cloud storage
    await saveToCloudStorage(email, key, data);
    
    // Also save to local storage as cache
    setLocalData(email, key, data);
    
    // Dispatch storage event for real-time updates
    window.dispatchEvent(new Event('storage'));
  } catch (error) {
    console.error('Error saving cloud data:', error);
    // Fallback to local storage only
    setLocalData(email, key, data);
  }
}

// Local storage functions (fallback)
function getLocalData(email: string, key: string): any {
  try {
    const storageKey = `${key}__${email.toLowerCase().replace(/[^a-z0-9_.-]+/g, '_')}`;
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error('Error reading local data:', error);
    return null;
  }
}

function setLocalData(email: string, key: string, data: any): void {
  try {
    const storageKey = `${key}__${email.toLowerCase().replace(/[^a-z0-9_.-]+/g, '_')}`;
    localStorage.setItem(storageKey, JSON.stringify(data));
  } catch (error) {
    console.error('Error writing local data:', error);
  }
}

// Cloud storage functions (placeholder for future implementation)
async function getFromCloudStorage(email: string, key: string): Promise<any> {
  // For now, this is a placeholder that returns null
  // In the future, this could connect to Firebase, Supabase, or other cloud storage
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Check if we have any cloud data stored locally (simulating cloud sync)
  const cloudStorageKey = `${CLOUD_STORAGE_KEY}__${email.toLowerCase().replace(/[^a-z0-9_.-]+/g, '_')}`;
  const cloudData = localStorage.getItem(cloudStorageKey);
  
  if (cloudData) {
    try {
      const parsed = JSON.parse(cloudData);
      // Check if this key exists in cloud data
      if (parsed[key]) {
        return parsed[key];
      }
    } catch (error) {
      console.error('Error parsing cloud data:', error);
    }
  }
  
  return null;
}

async function saveToCloudStorage(email: string, key: string, data: any): Promise<void> {
  // For now, this stores data locally but simulates cloud storage
  // In the future, this would upload to actual cloud storage
  
  try {
    const cloudStorageKey = `${CLOUD_STORAGE_KEY}__${email.toLowerCase().replace(/[^a-z0-9_.-]+/g, '_')}`;
    const existingData = localStorage.getItem(cloudStorageKey);
    
    let cloudData: Record<string, any> = {};
    if (existingData) {
      try {
        cloudData = JSON.parse(existingData);
      } catch (error) {
        console.error('Error parsing existing cloud data:', error);
      }
    }
    
    // Update the specific key
    cloudData[key] = data;
    cloudData.timestamp = Date.now();
    cloudData.version = STORAGE_VERSION;
    
    // Store back to "cloud storage" (local for now)
    localStorage.setItem(cloudStorageKey, JSON.stringify(cloudData));
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
  } catch (error) {
    console.error('Error saving to cloud storage:', error);
    throw error;
  }
}

// Sync data across tabs/windows
export function syncDataAcrossTabs(email: string, key: string, data: any): void {
  if (typeof window === 'undefined') return;
  
  // Store in cloud storage
  setCloudData(email, key, data);
  
  // Dispatch custom event for other tabs
  window.dispatchEvent(new CustomEvent('cloud-storage-update', {
    detail: { email, key, data }
  }));
}

// Listen for cloud storage updates from other tabs
export function listenForCloudUpdates(callback: (email: string, key: string, data: any) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  
  const handleUpdate = (event: CustomEvent) => {
    const { email, key, data } = event.detail;
    callback(email, key, data);
  };
  
  window.addEventListener('cloud-storage-update', handleUpdate as EventListener);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('cloud-storage-update', handleUpdate as EventListener);
  };
}

// Export storage keys for consistency
export const STORAGE_KEYS = {
  SERVERS: 'userServers',
  COINS: 'coinBalance',
  HISTORY: 'userHistory',
  ZIPS: 'userZips',
  SITE_USERS: 'siteUsers',
  ADMINS: 'admins',
  OWNERS: 'owners',
  MARKETPLACE: 'whatsapp-bot-marketplace'
} as const;