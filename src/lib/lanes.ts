export function laneIdFromHash(hash: string): string | null {
  if (!hash) return null;
  const id = hash.startsWith('#') ? hash.slice(1) : hash;
  return id.length ? id : null;
}

export function hasDetailLane(id: string, doc: Document = document): boolean {
  const escaped = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(id) : id.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return !!doc.querySelector(`[data-detail-lane="${escaped}"]`);
}

export function resolveInitialDetail(explicit: string | null, hash: string): string | null {
  if (explicit) return explicit;
  return laneIdFromHash(hash);
}
