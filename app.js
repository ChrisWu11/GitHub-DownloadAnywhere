const form = document.querySelector('#download-form');
const repoPathInput = document.querySelector('#repo-path');
const repoRefInput = document.querySelector('#repo-ref');
const statusText = document.querySelector('#status-text');
const progressText = document.querySelector('#progress-text');
const progressFill = document.querySelector('#progress-fill');
const result = document.querySelector('#result');
const downloadButton = document.querySelector('#download-btn');
const resetButton = document.querySelector('#reset-btn');
const fileList = document.querySelector('#file-list');
const fileCount = document.querySelector('#file-count');

const API_BASE = 'https://api.github.com/repos';

const resetState = () => {
  updateProgress(0);
  statusText.textContent = 'Waiting for a GitHub path.';
  result.textContent = '';
  result.className = 'result';
  downloadButton.disabled = false;
  fileList.innerHTML = '';
  fileCount.textContent = '0 files';
};

const updateProgress = (value) => {
  const clamped = Math.max(0, Math.min(100, value));
  progressFill.style.width = `${clamped}%`;
  progressText.textContent = `${Math.round(clamped)}%`;
};

const setResult = (message, tone = 'info') => {
  result.textContent = message;
  result.className = `result ${tone}`;
};

const updateFileCount = (count) => {
  fileCount.textContent = `${count} files`;
};

const renderFileItem = (file) => {
  const listItem = document.createElement('li');
  listItem.className = 'file-item';

  const name = document.createElement('span');
  name.textContent = file.path;

  const status = document.createElement('span');
  status.className = 'file-status pending';
  status.textContent = 'Pending';

  listItem.append(name, status);
  fileList.appendChild(listItem);

  return status;
};

const updateFileStatus = (statusNode, state) => {
  statusNode.className = `file-status ${state}`;
  if (state === 'success') {
    statusNode.textContent = 'Success';
  } else if (state === 'error') {
    statusNode.textContent = 'Failed';
  } else {
    statusNode.textContent = 'Pending';
  }
};

const parseRepoInput = (input) => {
  const trimmed = input.trim();
  let pathSource = trimmed;

  if (trimmed.includes('github.com')) {
    try {
      const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
      if (url.hostname.endsWith('github.com')) {
        pathSource = url.pathname;
      }
    } catch (error) {
      console.warn('Unable to parse URL input. Falling back to path parsing.', error);
    }
  }

  const parts = pathSource.replace(/^\/+/, '').split('/').filter(Boolean);
  if (parts.length < 2) {
    throw new Error('Please enter a full repository path, e.g. owner/repo/path.');
  }

  const [owner, repo] = parts;
  const markerIndex = parts.findIndex((part) => part === 'tree' || part === 'blob');

  if (markerIndex >= 0) {
    const ref = parts[markerIndex + 1] || '';
    const path = parts.slice(markerIndex + 2).join('/');
    return {
      owner,
      repo,
      path,
      ref,
    };
  }

  return {
    owner,
    repo,
    path: parts.slice(2).join('/'),
    ref: '',
  };
};

const getContentsUrl = ({ owner, repo, path, ref }) => {
  const encodedPath = path ? `/${path}` : '';
  const url = new URL(`${API_BASE}/${owner}/${repo}/contents${encodedPath}`);
  if (ref) {
    url.searchParams.set('ref', ref);
  }
  return url.toString();
};

const fetchJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    const message = detail?.message || `Request failed: ${response.status}`;
    throw new Error(message);
  }
  return response.json();
};

const fetchWithProgress = async (url, onProgress) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }
  const total = Number(response.headers.get('Content-Length')) || 0;
  if (!response.body || total === 0) {
    const blob = await response.blob();
    onProgress?.(total, total || blob.size);
    return blob;
  }

  const reader = response.body.getReader();
  let received = 0;
  const chunks = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    onProgress?.(received, total);
  }

  return new Blob(chunks);
};

const collectFiles = async ({ owner, repo, path, ref }, files = []) => {
  const url = getContentsUrl({ owner, repo, path, ref });
  const data = await fetchJson(url);

  if (Array.isArray(data)) {
    for (const item of data) {
      if (item.type === 'file') {
        files.push(item);
      } else if (item.type === 'dir') {
        await collectFiles({ owner, repo, path: item.path, ref }, files);
      }
    }
  } else if (data.type === 'file') {
    files.push(data);
  } else {
    throw new Error('Unrecognized path type.');
  }

  return files;
};

const createZipName = ({ repo, path }) => {
  if (!path) {
    return `${repo}.zip`;
  }
  const normalized = path.replace(/\\/g, '/').replace(/\/+$/, '');
  const lastSegment = normalized.split('/').filter(Boolean).pop() || repo;
  return `${lastSegment}.zip`;
};

const downloadZip = async ({ owner, repo, path, ref }) => {
  statusText.textContent = 'Fetching file list...';
  updateProgress(5);

  const files = await collectFiles({ owner, repo, path, ref });
  if (!files.length) {
    throw new Error('No downloadable files found at this path.');
  }

  fileList.innerHTML = '';
  updateFileCount(files.length);

  statusText.textContent = `Downloading ${files.length} files...`;
  updateProgress(10);

  const zip = new window.JSZip();
  let downloaded = 0;

  for (const file of files) {
    const statusNode = renderFileItem(file);
    try {
      const blob = await fetchWithProgress(file.download_url, () => {});
      const relativePath = path ? file.path.replace(`${path}/`, '') : file.path;
      zip.file(relativePath, blob);
      updateFileStatus(statusNode, 'success');
      downloaded += 1;
      const percent = 10 + (downloaded / files.length) * 60;
      updateProgress(percent);
      statusText.textContent = `Downloaded ${downloaded}/${files.length} files...`;
    } catch (error) {
      updateFileStatus(statusNode, 'error');
      throw error;
    }
  }

  statusText.textContent = 'Packaging zip file...';
  const zipBlob = await zip.generateAsync(
    { type: 'blob' },
    (metadata) => {
      const percent = 70 + metadata.percent * 0.3;
      updateProgress(percent);
    }
  );

  updateProgress(100);
  statusText.textContent = 'Preparing your download...';

  const downloadLink = document.createElement('a');
  const url = URL.createObjectURL(zipBlob);
  downloadLink.href = url;
  downloadLink.download = createZipName({ owner, repo, path });
  downloadLink.click();
  URL.revokeObjectURL(url);
};

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  setResult('');
  downloadButton.disabled = true;

  try {
    const parsed = parseRepoInput(repoPathInput.value);
    const manualRef = repoRefInput.value.trim();
    const ref = manualRef || parsed.ref || '';
    await downloadZip({ owner: parsed.owner, repo: parsed.repo, path: parsed.path, ref });
    setResult('Download complete. The zip file has been saved.', 'success');
  } catch (error) {
    console.error(error);
    updateProgress(0);
    statusText.textContent = 'Download failed.';
    setResult(error.message || 'An error occurred during download.', 'error');
  } finally {
    downloadButton.disabled = false;
  }
});

resetButton.addEventListener('click', () => {
  repoPathInput.value = '';
  repoRefInput.value = '';
  resetState();
});

resetState();
