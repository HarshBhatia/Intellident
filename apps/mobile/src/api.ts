const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export async function fetchWithAuth(endpoint: string, getToken: () => Promise<string | null>, clinicId?: string, options: RequestInit = {}) {
  console.log(`[API] Fetching ${endpoint}...`);
  
  let token;
  try {
    token = await getToken();
  } catch (e) {
    console.error(`[API] Token error:`, e);
    throw e;
  }

  if (!token) throw new Error('No authentication token');

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (clinicId) {
    headers['X-Clinic-ID'] = clinicId;
  }

  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }

    return response.json();
  } catch (e) {
    console.error(`[API] Fetch error for ${endpoint}:`, e);
    throw e;
  }
}

export const api = {
  getClinics: (getToken: () => Promise<string | null>) => 
    fetchWithAuth('/api/clinics', getToken),
  
  getPatients: (getToken: () => Promise<string | null>, clinicId: string) => 
    fetchWithAuth('/api/patients', getToken, clinicId),
  
  getPatient: (getToken: () => Promise<string | null>, clinicId: string, patientId: string) =>
    fetchWithAuth(`/api/patients/${patientId}`, getToken, clinicId),
  
  createPatient: (getToken: () => Promise<string | null>, clinicId: string, data: any) =>
    fetchWithAuth('/api/patients', getToken, clinicId, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  uploadVoiceNote: async (getToken: () => Promise<string | null>, clinicId: string, uri: string, onProgress?: (percent: number) => void) => {
    const token = await getToken();
    if (!token) throw new Error('No authentication token');

    // Get file info using legacy import to avoid deprecation warning for now
    try {
      const FileSystem = require('expo-file-system');
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (fileInfo.exists) {
        console.log(`[API] Actual File Size: ${(fileInfo.size / 1024).toFixed(2)} KB`);
      }
    } catch (e) {
      console.log(`[API] Could not get file info: ${e.message}`);
    }

    const formData = new FormData();
    // @ts-ignore
    formData.append('audio', {
      uri,
      name: 'recording.m4a',
      type: 'audio/m4a',
    });

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // Attach listeners BEFORE opening/sending
      xhr.upload.addEventListener('progress', (event) => {
        console.log(`[API] Progress Event: ${event.loaded} / ${event.total} (computable: ${event.lengthComputable})`);
        if (event.lengthComputable && event.total > 0) {
          const percent = Math.round((event.loaded / event.total) * 100);
          if (onProgress) onProgress(percent);
        }
      });

      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          console.log(`[API] XHR Finished with status: ${xhr.status}`);
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch (e) {
              reject(new Error('Invalid JSON response'));
            }
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        }
      };

      xhr.onerror = (e) => {
        console.log(`[API] XHR Error:`, e);
        reject(new Error('Network request failed'));
      };
      
      xhr.open('POST', `${API_BASE_URL}/api/generate-notes`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('X-Clinic-ID', clinicId);
      
      console.log(`[API] XHR Sending to ${API_BASE_URL}...`);
      xhr.send(formData);
    });
  },
};
