export const unique = (arr) => Array.from(new Set(arr));
export const humanFileSize = (size) => {
    if (size === 0) return '0 B';
    const i = Math.floor(Math.log(size) / Math.log(1024));
    return (size / Math.pow(1024, i)).toFixed(2) * 1 + ' ' + ['B', 'KB', 'MB', 'GB', 'TB'][i];
};
export function escapeHtml(s) {
    return s.replace?.(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") ?? s;
}

export const isNumericArray = (arr) => arr.every(v => v === null || v === '' || !isNaN(Number(v)));