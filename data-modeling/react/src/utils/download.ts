// Trigger a client-side file download from an in-memory string. Wraps the text
// in a Blob, points a throwaway <a download> at an object URL, clicks it, and
// revokes the URL. No dependency needed — the platform does this in a few lines.

export function downloadText(filename: string, text: string, mime = 'text/plain'): void {
    const url = URL.createObjectURL(new Blob([text], { type: mime }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
}
