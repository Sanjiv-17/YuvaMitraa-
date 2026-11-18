export interface CredentialValidationResult {
  valid: boolean;
  sanitized: string;
  reason?: 'missing' | 'placeholder' | 'masked' | 'non_bytestring';
}

const PLACEHOLDER_PATTERN =
  /^(MY_|YOUR_|REPLACE_|ENTER_|PLACEHOLDER|TODO|EXAMPLE|CHANGEME|TEST_KEY|NULL|UNDEFINED|NONE|<.*>)/i;

// Detects bullet/mask characters such as • (U+2022), ●, ◦, ▪, ∗ or repeated asterisks
const MASKED_PATTERN = /[\u2022\u25CF\u25E6\u25AA\u2217]|\*{3,}/;

// HTTP header values in fetch() require single-byte ByteString characters; API keys
// should strictly be printable ASCII (0x21..0x7E) without whitespace or control chars.
const PRINTABLE_ASCII_HEADER_PATTERN = /^[\x21-\x7E]+$/;

export function validateHeaderCredential(rawValue?: string): CredentialValidationResult {
  const sanitized = (rawValue ?? '').trim();
  if (!sanitized) {
    return { valid: false, sanitized: '', reason: 'missing' };
  }

  if (MASKED_PATTERN.test(sanitized)) {
    return { valid: false, sanitized, reason: 'masked' };
  }

  if (PLACEHOLDER_PATTERN.test(sanitized)) {
    return { valid: false, sanitized, reason: 'placeholder' };
  }

  if (!PRINTABLE_ASCII_HEADER_PATTERN.test(sanitized)) {
    return { valid: false, sanitized, reason: 'non_bytestring' };
  }

  return { valid: true, sanitized };
}

export function isValidHttpEndpoint(rawUrl?: string): boolean {
  const trimmed = (rawUrl ?? '').trim();
  if (!trimmed || !PRINTABLE_ASCII_HEADER_PATTERN.test(trimmed)) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function formatCredentialConfigMessage(
  envVarLabel: string,
  validation: CredentialValidationResult,
  docsUrl: string
): string {
  switch (validation.reason) {
    case 'masked':
      return `${envVarLabel} appears to contain masked characters (e.g. '•' or '***'). Replace it with the raw unmasked ASCII key in .env to enable syncing. Documentation: ${docsUrl}`;
    case 'placeholder':
      return `${envVarLabel} is set to a placeholder value. Replace it with a valid credential in .env to enable syncing. Documentation: ${docsUrl}`;
    case 'non_bytestring':
      return `${envVarLabel} contains invalid whitespace or non-ASCII characters (incompatible with HTTP request headers). Verify the key in .env. Documentation: ${docsUrl}`;
    default:
      return `${envVarLabel} is an optional credential and not currently configured. Source skipped until a valid credential is set in .env. Documentation: ${docsUrl}`;
  }
}
