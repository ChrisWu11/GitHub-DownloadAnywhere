# GitHub Folder Downloader

## Quick Start

Click here to open the app:

https://chriswu11.github.io/GitHub-DownloadAnywhere/

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
