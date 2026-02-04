const form = document.querySelector('#download-form');
const repoPathInput = document.querySelector('#repo-path');
const repoRefInput = document.querySelector('#repo-ref');
const statusText = document.querySelector('#status-text');
const progressText = document.querySelector('#progress-text');
const progressFill = document.querySelector('#progress-fill');
const result = document.querySelector('#result');
const downloadButton = document.querySelector('#download-btn');
const resetButton = document.querySelector('#reset-btn');

const API_BASE = 'https://api.github.com/repos';

const resetState = () => {
  updateProgress(0);
  statusText.textContent = '等待输入仓库路径。';
  result.textContent = '';
  result.className = 'result';
  downloadButton.disabled = false;
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

const parseRepoInput = (input) => {
  const trimmed = input.trim().replace(/^https?:\/\//, '');
  const noDomain = trimmed.replace(/^github\.com\//, '');
  const parts = noDomain.split('/').filter(Boolean);
  if (parts.length < 2) {
    throw new Error('请输入完整的仓库路径，例如 owner/repo/path。');
  }

  const [owner, repo, marker, ref, ...pathParts] = parts;

  if (marker === 'tree' || marker === 'blob') {
    return {
      owner,
      repo,
      path: pathParts.join('/'),
      ref: ref || '',
    };
  }

  return {
    owner,
    repo,
    path: [marker, ref, ...pathParts].filter(Boolean).join('/'),
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
    const message = detail?.message || `请求失败: ${response.status}`;
    throw new Error(message);
  }
  return response.json();
};

const fetchWithProgress = async (url, onProgress) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`下载失败: ${response.status}`);
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
    throw new Error('无法识别的路径类型。');
  }

  return files;
};

const createZipName = ({ owner, repo, path }) => {
  const safePath = path ? path.replace(/[\\/]+/g, '_') : 'root';
  return `${owner}-${repo}-${safePath}.zip`;
};

const downloadZip = async ({ owner, repo, path, ref }) => {
  statusText.textContent = '正在获取文件列表...';
  updateProgress(5);

  const files = await collectFiles({ owner, repo, path, ref });
  if (!files.length) {
    throw new Error('该路径没有可下载的文件。');
  }

  statusText.textContent = `正在下载 ${files.length} 个文件...`;
  updateProgress(10);

  const zip = new window.JSZip();
  let downloaded = 0;

  for (const file of files) {
    const blob = await fetchWithProgress(file.download_url, () => {});
    const relativePath = path ? file.path.replace(`${path}/`, '') : file.path;
    zip.file(relativePath, blob);
    downloaded += 1;
    const percent = 10 + (downloaded / files.length) * 60;
    updateProgress(percent);
    statusText.textContent = `已下载 ${downloaded}/${files.length} 个文件...`;
  }

  statusText.textContent = '正在打包压缩文件...';
  const zipBlob = await zip.generateAsync(
    { type: 'blob' },
    (metadata) => {
      const percent = 70 + metadata.percent * 0.3;
      updateProgress(percent);
    }
  );

  updateProgress(100);
  statusText.textContent = '准备下载压缩包...';

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
    setResult('下载完成，文件已自动保存。', 'success');
  } catch (error) {
    console.error(error);
    updateProgress(0);
    statusText.textContent = '下载失败。';
    setResult(error.message || '下载过程中出现错误。', 'error');
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
