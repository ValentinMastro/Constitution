/** Déclenche le téléchargement d'un Blob côté navigateur. */
export function downloadBlob(filename: string, blob: Blob): void {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Nom de fichier sûr à partir d'un libellé libre. */
export function safeFileName(name: string): string {
	return (name.trim() || 'projet').replace(/[^\p{L}\p{N}\-_ ]/gu, '').replace(/\s+/g, '_');
}
