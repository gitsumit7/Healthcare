// ABDM (Ayushman Bharat Digital Mission) Healthcare Professionals Registry lookup.
//
// Every ABDM API call needs a gateway session token obtained with the clientId/clientSecret NHA issues
// when you register for the sandbox (https://sandbox.abdm.gov.in). The HPR "fetch professional" endpoint
// differs between API versions, so its URL comes from ABDM_HPR_LOOKUP_URL (copy it from your sandbox
// docs); "{hprId}" in it is replaced with the ID being checked.

const env = (key, fallback) => process.env[key] || fallback;

export const abdmConfigured = () =>
  Boolean(process.env.ABDM_CLIENT_ID && process.env.ABDM_CLIENT_SECRET && process.env.ABDM_HPR_LOOKUP_URL);

let session = { token: null, expiresAt: 0 };

async function getSessionToken() {
  if (session.token && Date.now() < session.expiresAt) return session.token;

  const res = await fetch(env('ABDM_SESSION_URL', 'https://dev.abdm.gov.in/gateway/v0.5/sessions'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId: process.env.ABDM_CLIENT_ID, clientSecret: process.env.ABDM_CLIENT_SECRET }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.accessToken) {
    throw new Error(`ABDM session request failed (${res.status}): ${data.message || data.error || 'no access token'}`);
  }
  // Refresh a minute before the token actually expires.
  session = { token: data.accessToken, expiresAt: Date.now() + Math.max(60, (data.expiresIn || 600) - 60) * 1000 };
  return session.token;
}

const pick = (obj, keys) => {
  for (const key of keys) {
    const value = key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
    if (value != null && value !== '') return String(value);
  }
  return undefined;
};

/** Looks up a professional by HPR ID. Resolves to { found, name, council, registrationNumber }. */
export async function lookupHprProfessional(hprId) {
  if (!abdmConfigured()) throw new Error('ABDM HPR is not configured (set ABDM_CLIENT_ID, ABDM_CLIENT_SECRET, ABDM_HPR_LOOKUP_URL)');

  const token = await getSessionToken();
  const method = env('ABDM_HPR_LOOKUP_METHOD', 'POST').toUpperCase();
  const url = process.env.ABDM_HPR_LOOKUP_URL.replace('{hprId}', encodeURIComponent(hprId));
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-CM-ID': env('ABDM_CM_ID', 'sbx'),
    },
    body: method === 'GET' ? undefined : JSON.stringify({ hprId, idNumber: hprId }),
  });

  if (res.status === 404) return { found: false };
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`ABDM HPR lookup failed (${res.status}): ${data.message || data.error || 'unexpected response'}`);

  // Field names vary between HPR API versions; accept the common ones.
  const record = data.professional || data.data || data;
  return {
    found: true,
    name: pick(record, ['name', 'fullName', 'hprIdName', 'firstName']),
    council: pick(record, ['councilName', 'council.name', 'registrationCouncil', 'medicalCouncil']),
    registrationNumber: pick(record, ['registrationNumber', 'registrationNo', 'council.registrationNumber']),
  };
}

// Exposed for tests.
export const _resetAbdmSession = () => {
  session = { token: null, expiresAt: 0 };
};
