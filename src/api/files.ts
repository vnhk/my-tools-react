/**
 * Downloads selected files and folders as a single ZIP archive.
 * @param ids Array of UUIDs (can be both file and folder IDs)
 * @param fileName Name of the downloaded file
 */
export const downloadFilesAsZip = async (ids: string[], fileName: string = "files.zip") => {
  if (!ids || ids.length === 0) return;

  const token = localStorage.getItem('token') ?? undefined

  const response = await fetch('/api/files/download-zip', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(ids),
  });
/**
 * Downloads selected files and folders as a single ZIP archive.
 * @param ids Array of UUIDs (can be both file and folder IDs)
 * @param fileName Name of the downloaded file
 */
export const downloadFilesAsZip = async (ids: string[], fileName: string = "files.zip") => {
  if (!ids || ids.length === 0) return;

  const token = localStorage.getItem('token') ?? undefined

  const response = await fetch('/api/files/download-zip', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(ids),
  });

  if (!response.ok) {
    throw new Error('Failed to generate ZIP');
  }

  // Handle binary response
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);

  // Trigger browser download
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();

  // Cleanup
  link.parentNode?.removeChild(link);
  window.URL.revokeObjectURL(url);
};
  if (!response.ok) {
    throw new Error('Failed to generate ZIP');
  }

  // Handle binary response
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);

  // Trigger browser download
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
/**
 * Downloads selected files and folders as a single ZIP archive.
 * @param ids Array of UUIDs (can be both file and folder IDs)
 * @param fileName Name of the downloaded file
 */
export const downloadFilesAsZip = async (ids: string[], fileName: string = "files.zip") => {
  if (!ids || ids.length === 0) return;

  const token = localStorage.getItem('token') ?? undefined

  const response = await fetch('/api/files/download-zip', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(ids),
  });

  if (!response.ok) {
    throw new Error('Failed to generate ZIP');
  }

  // Handle binary response
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
/**
 * Downloads selected files and folders as a single ZIP archive.
 * @param ids Array of UUIDs (can be both file and folder IDs)
 * @param fileName Name of the downloaded file
 */
export const downloadFilesAsZip = async (ids: string[], fileName: string = "files.zip") => {
  if (!ids || ids.length === 0) return;

  const token = localStorage.getItem('token') ?? undefined

  const response = await fetch('/api/files/download-zip', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(ids),
  });

  if (!response.ok) {
    throw new Error('Failed to generate ZIP');
  }

  // Handle binary response
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);

  // Trigger browser download
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
/**
 * Downloads selected files and folders as a single ZIP archive.
 * @param ids Array of UUIDs (can be both file and folder IDs)
 * @param fileName Name of the downloaded file
 */
export const downloadFilesAsZip = async (ids: string[], fileName: string = "files.zip") => {
  if (!ids || ids.length === 0) return;

  const token = localStorage.getItem('token') ?? undefined

  const response = await fetch('/api/files/download-zip', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(ids),
  });

  if (!response.ok) {
    throw new Error('Failed to generate ZIP');
  }

  // Handle binary response
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);

  // Trigger browser download
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();

  // Cleanup
  link.parentNode?.removeChild(link);
  window.URL.revokeObjectURL(url);
};
  // Cleanup
  link.parentNode?.removeChild(link);
  window.URL.revokeObjectURL(url);
};
  // Trigger browser download
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();

  // Cleanup
  link.parentNode?.removeChild(link);
  window.URL.revokeObjectURL(url);
};
  // Cleanup
  link.parentNode?.removeChild(link);
  window.URL.revokeObjectURL(url);
};
