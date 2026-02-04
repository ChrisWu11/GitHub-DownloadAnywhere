# GitHub Folder Downloader

A lightweight web tool that lets you download a zip of any public GitHub file or folder by pasting its path. The app resolves the target directory and packages the current contents into a single zip for you to save locally.

## What You Can Do

- Download a **folder** from a public GitHub repository as a zip.
- Download a **single file** (it will be packaged into a zip).
- Track progress and see a per-file success/failure log during downloads.

## Requirements

- A modern web browser (Chrome, Edge, Firefox, Safari).
- Public GitHub repositories (private repos require an access token, which is not supported in this demo UI).

## Quick Start

Choose one of the following ways to open the app:

### Option A: Open the HTML file directly

1. Download this project.
2. Open `index.html` in your browser.

> Some browsers restrict local file access. If downloads fail, use Option B.

### Option B: Run a local static server

From the project directory, start a simple server (example with Python):

```bash
python -m http.server 8000
```

Then open:

```
http://localhost:8000
```

## How to Use

1. **Paste a GitHub path** into the input field. You can use:
   - A repository path: `owner/repo/path/to/folder`
   - A full GitHub URL: `https://github.com/owner/repo/tree/branch/path`
   - A single-file URL: `https://github.com/owner/repo/blob/branch/path/file.ext`
2. **(Optional) Enter a branch or tag**. If left empty, the app uses the branch from the URL or the repository default.
3. Click **Download**.
4. Watch the progress bar and the download log.
5. The zip file will be saved with the **folder name** (or the repository name if no folder is provided).

## Example Inputs

- `https://github.com/ChrisWu11/CanvasBarrage/blob/main/docs/kunkun.gif`
- `https://github.com/ChrisWu11/CanvasBarrage/tree/main/docs`
- `ChrisWu11/CanvasBarrage/docs`

## Notes

- Only **public repositories** are supported.
- Large folders may take longer to download.
- The filename of the zip matches the target folder name (or repo name if no folder is specified).

## License

This project is provided as-is for educational and demo purposes.
