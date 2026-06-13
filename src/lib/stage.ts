const KNOWN = new Set(['writing', 'tracking', 'mixing', 'mastering']);

export function stageClass(stage?: string): string {
  return KNOWN.has(stage ?? '') ? `stage-${stage}` : 'stage-unknown';
}

export function stageBgClass(stage?: string): string {
  return KNOWN.has(stage ?? '') ? `stage-${stage}-bg` : '';
}
