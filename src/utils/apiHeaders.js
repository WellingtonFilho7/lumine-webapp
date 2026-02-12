export function buildApiHeaders({ apiToken = '', appVersion = '', deviceId = '' } = {}) {
  const metaHeaders = {
    ...(deviceId ? { 'X-Device-Id': deviceId } : {}),
    ...(appVersion ? { 'X-App-Version': appVersion } : {}),
  };

  const authHeaders = apiToken ? { Authorization: `Bearer ${apiToken}` } : {};
  const baseHeaders = { ...authHeaders, ...metaHeaders };
  const jsonHeaders = { 'Content-Type': 'application/json', ...baseHeaders };

  return {
    authHeaders,
    metaHeaders,
    baseHeaders,
    jsonHeaders,
  };
}
