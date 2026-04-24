/**
 * Transport Isolation Utility
 * Provides helper functions for multi-tenant isolation in API routes
 */

import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');

export interface AuthenticatedUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  platformRole: 'super_admin' | 'transport_admin';
  transportId: number | null;
  transportName?: string;
  transportSlug?: string;
  transportStatus?: string;
}

/**
 * Extracts the authenticated user from the JWT token in the request
 * Returns null if not authenticated or token is invalid
 */
export async function getAuthenticatedUser(
  request: NextRequest
): Promise<AuthenticatedUser | null> {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return null;

    const verified = await jwtVerify(token, JWT_SECRET);
    const payload = verified.payload as any;

    return {
      id: payload.id,
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      role: payload.role,
      platformRole: payload.platformRole,
      transportId: payload.transportId || null,
      transportName: payload.transportName,
      transportSlug: payload.transportSlug,
      transportStatus: payload.transportStatus,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Ensures user is authenticated and is a transport admin
 * Returns the transport ID or throws an error
 */
export async function requireTransportAuth(request: NextRequest): Promise<number> {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    throw new Error('Unauthorized: No valid authentication token');
  }

  if (user.platformRole !== 'transport_admin' || !user.transportId) {
    throw new Error('Forbidden: Only transport admins can access this resource');
  }

  return user.transportId;
}

/**
 * Ensures user is a super admin
 */
export async function requireSuperAdmin(request: NextRequest): Promise<boolean> {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    throw new Error('Unauthorized: No valid authentication token');
  }

  if (user.platformRole !== 'super_admin') {
    throw new Error('Forbidden: Only super admins can access this resource');
  }

  return true;
}

/**
 * Gets transport ID from authenticated user
 * For super admins, returns null or throws based on context
 */
export async function getTransportIdFromAuth(request: NextRequest): Promise<number | null> {
  const user = await getAuthenticatedUser(request);
  return user?.transportId || null;
}

/**
 * Checks if authenticated user is super admin
 */
export async function isSuperAdmin(request: NextRequest): Promise<boolean> {
  const user = await getAuthenticatedUser(request);
  return user?.platformRole === 'super_admin' || false;
}

/**
 * Checks if authenticated user has access to a specific transport
 */
export async function hasTransportAccess(
  request: NextRequest,
  targetTransportId: number
): Promise<boolean> {
  const user = await getAuthenticatedUser(request);

  if (!user) return false;

  // Super admins have access to all transports
  if (user.platformRole === 'super_admin') return true;

  // Transport admins can only access their own transport
  return user.transportId === targetTransportId;
}
