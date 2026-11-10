export interface FileItem {
    id: string
    filename: string
    path: string
    directory: boolean
    extension: string | null
    fileSize: number | null
    encrypted: boolean
    modificationDate: string | null
}

export const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic', 'heif'])
export const VIDEO_EXT = new Set(['mp4', 'webm', 'mov', 'mkv'])
export const PDF_EXT = new Set(['pdf'])

const TEXT_EXT = new Set([
    'txt', 'md', 'markdown', 'rst', 'adoc', 'log',
    'json', 'jsonc', 'jsonl', 'ndjson', 'xml', 'csv', 'tsv', 'yaml', 'yml', 'toml',
    'ini', 'cfg', 'conf', 'properties', 'env', 'editorconfig', 'gitignore', 'gitattributes',
    'vtt', 'srt', 'ass', 'ssa', 'm3u', 'm3u8', 'mpd',
    'html', 'htm', 'css', 'scss', 'less', 'js', 'jsx', 'mjs', 'cjs', 'ts', 'tsx',
    'java', 'kt', 'py', 'rb', 'php', 'go', 'rs', 'c', 'h', 'cpp', 'cs', 'sql',
    'sh', 'bash', 'zsh', 'bat', 'cmd', 'ps1',
])
const TEXT_FILENAMES = new Set(['dockerfile', 'makefile', 'readme', 'license', 'changelog'])

export function isTextFile(item: Pick<FileItem, 'filename' | 'extension'>): boolean {
    const filename = item.filename.toLowerCase()
    const ext = (item.extension || filename.slice(filename.lastIndexOf('.') + 1)).toLowerCase()
    return TEXT_EXT.has(ext) || TEXT_FILENAMES.has(filename)
}

export function getViewerType(item: FileItem): 'image' | 'video' | 'pdf' | 'text' | null {
    if (item.directory) return null
    const ext = (item.extension ?? '').toLowerCase()
    if (IMAGE_EXT.has(ext)) return 'image'
    if (VIDEO_EXT.has(ext)) return 'video'
    if (PDF_EXT.has(ext)) return 'pdf'
    if (isTextFile(item)) return 'text'
    return null
}

