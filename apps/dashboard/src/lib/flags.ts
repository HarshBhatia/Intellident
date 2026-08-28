export const FLAG_KEYS = [
  'aiNotes',
  'aiChat',
  'messaging',
  'filesXrays',
  'logoUpload',
  'invoices',
  'patientFinancialsTab',
] as const;

export type FlagKey = (typeof FLAG_KEYS)[number];

const ENV_BY_FLAG: Record<FlagKey, string> = {
  aiNotes: 'NEXT_PUBLIC_FF_AI_NOTES',
  aiChat: 'NEXT_PUBLIC_FF_AI_CHAT',
  messaging: 'NEXT_PUBLIC_FF_MESSAGING',
  filesXrays: 'NEXT_PUBLIC_FF_FILES',
  logoUpload: 'NEXT_PUBLIC_FF_LOGO',
  invoices: 'NEXT_PUBLIC_FF_INVOICES',
  patientFinancialsTab: 'NEXT_PUBLIC_FF_FINANCIALS_TAB',
};

function readFlag(key: FlagKey): boolean {
  return process.env[ENV_BY_FLAG[key]] === 'true';
}

export const flags: Record<FlagKey, boolean> = {
  aiNotes: readFlag('aiNotes'),
  aiChat: readFlag('aiChat'),
  messaging: readFlag('messaging'),
  filesXrays: readFlag('filesXrays'),
  logoUpload: readFlag('logoUpload'),
  invoices: readFlag('invoices'),
  patientFinancialsTab: readFlag('patientFinancialsTab'),
};

export function isFlagEnabled(key: FlagKey): boolean {
  return flags[key] === true;
}
