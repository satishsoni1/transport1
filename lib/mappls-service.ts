import { sql } from '@/lib/db';

/**
 * IMPORTANT: The OAuth2 client-credentials token endpoint below (`outpost.mapmyindia.com`) is
 * Mappls' standard, stable, publicly-documented auth flow used across all their APIs. The
 * *fleet/asset current-location* endpoint, however, is part of their Fleet Tracking product,
 * whose exact path depends on your specific Mappls plan/dashboard and isn't reliably knowable
 * without your account's docs — so `api_base_url` is configurable in Settings > Integrations,
 * and the path below should be verified against your Mappls Fleet API docs before relying on
 * it for real tracking.
 */

const MAPPLS_TOKEN_URL = 'https://outpost.mapmyindia.com/api/security/oauth/token';

export interface GpsConfig {
  apiBaseUrl: string;
  clientId: string;
  clientSecret: string;
}

export async function resolveGpsConfig(transportId: number): Promise<GpsConfig | null> {
  const { rows } = await sql`
    SELECT * FROM gps_integration_settings WHERE transport_id = ${transportId} LIMIT 1
  `;
  const settings = rows[0];
  if (!settings?.enabled || !settings.client_id || !settings.client_secret) return null;
  return {
    apiBaseUrl: settings.api_base_url || 'https://apis.mappls.com',
    clientId: settings.client_id,
    clientSecret: settings.client_secret,
  };
}

async function getAccessToken(config: GpsConfig): Promise<string | null> {
  try {
    const response = await fetch(MAPPLS_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: config.clientId,
        client_secret: config.clientSecret,
      }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.access_token) return null;
    return data.access_token as string;
    // Note: Mappls tokens are typically valid ~24h. This fetches a fresh one on every call for
    // simplicity — fine for periodic manual refresh, but cache it if this is polled frequently.
  } catch (error) {
    console.error('Error fetching Mappls access token', error);
    return null;
  }
}

export type VehicleLocationResult =
  | { ok: true; latitude: number; longitude: number; speedKmph: number; heading: number; recordedAt: string }
  | { ok: false; reason: string };

/** Fetches the current location of a single tracked device from Mappls Fleet Tracking. */
export async function fetchVehicleLocation(deviceId: string, config: GpsConfig): Promise<VehicleLocationResult> {
  const token = await getAccessToken(config);
  if (!token) {
    return { ok: false, reason: 'Could not authenticate with Mappls (check client_id/client_secret)' };
  }

  try {
    const response = await fetch(
      `${config.apiBaseUrl}/fleet/v1/current_location?device_id=${encodeURIComponent(deviceId)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await response.json().catch(() => null);
    if (!response.ok || data?.latitude === undefined) {
      return { ok: false, reason: data?.message || `Mappls API returned ${response.status}` };
    }
    return {
      ok: true,
      latitude: Number(data.latitude),
      longitude: Number(data.longitude),
      speedKmph: Number(data.speed) || 0,
      heading: Number(data.heading) || 0,
      recordedAt: String(data.timestamp || new Date().toISOString()),
    };
  } catch (error) {
    console.error('Error fetching vehicle location from Mappls', error);
    return { ok: false, reason: error instanceof Error ? error.message : 'Unknown Mappls API error' };
  }
}
