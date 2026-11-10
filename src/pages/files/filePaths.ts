export function dirPath(parentPath: string, folderName: string): string {
    return parentPath + folderName + '/'
}

export function pathParts(path: string): string[] {
    if (path === '/') return []
    return path.replace(/^\//, '').replace(/\/$/, '').split('/')
}

export function pathAtIndex(parts: string[], index: number): string {
    if (index < 0) return '/'
    return '/' + parts.slice(0, index + 1).join('/') + '/'
}
