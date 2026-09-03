import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';

/** HTTP 401/403 or a login rejection — the secret token is wrong or revoked. */
export class BillzAuthError extends Error {}
/** fetch failure, timeout, non-2xx, `error` body or malformed response — Billz is unreachable. */
export class BillzNetworkError extends Error {}

const BILLZ_URL = 'https://api-admin.billz.ai';
const TIMEOUT_MS = 30_000;
/** Re-login this long before the access token's `exp` to avoid racing the expiry. */
const EXP_SKEW_MS = 60_000;

// Response shapes per docs/reference/billz2-api-notes.md (verified live 03.09.2026).

export interface BillzShopPrice {
  shop_id: string;
  shop_name: string;
  retail_price: number;
  retail_currency: string;
  promo_price: number;
}

export interface BillzShopMeasurement {
  shop_id: string;
  shop_name: string;
  active_measurement_value: number;
}

export interface BillzProductAttribute {
  attribute_name: string;
  attribute_value: string;
}

export interface BillzProductRow {
  id: string;
  parent_id: string; // '' on simple products and parents
  is_variative: boolean; // true on parent rows
  name: string;
  sku: string; // артикул — unique per size variant
  product_attributes?: BillzProductAttribute[] | null;
  shop_prices?: BillzShopPrice[] | null;
  shop_measurement_values?: BillzShopMeasurement[] | null;
}

export interface BillzProductsPage {
  count: number;
  products: BillzProductRow[];
}

export interface BillzShopRow {
  id: string;
  name: string;
}

interface CachedToken {
  /** sha256 of the secret token — the cache dies with a credential change. */
  key: string;
  accessToken: string;
  expiresAt: number; // ms epoch, 0 = unknown
}

/**
 * Outbound REST client for BILLZ 2 (api-admin.billz.ai).
 * Logs in with the merchant's secret token, caches the bearer access token in memory
 * (re-login once on 401), and exposes the two read endpoints the sync needs.
 * Injectable so e2e tests override the provider with a stub (login/getProducts/getShops).
 */
@Injectable()
export class BillzClient {
  private cached: CachedToken | null = null;

  /** Ensures a valid access token is cached for this secret; throws typed errors otherwise. */
  async login(secretToken: string): Promise<void> {
    await this.accessToken(secretToken, true);
  }

  async getProducts(secretToken: string, page: number, limit: number): Promise<BillzProductsPage> {
    const json = await this.get(secretToken, `/v2/products?limit=${limit}&page=${page}`);
    const body = json as { count?: number; products?: BillzProductRow[] };
    return {
      count: typeof body.count === 'number' ? body.count : 0,
      products: Array.isArray(body.products) ? body.products : [],
    };
  }

  async getShops(secretToken: string): Promise<BillzShopRow[]> {
    const json = await this.get(secretToken, '/v1/shop?limit=100');
    const body = json as { shops?: { id?: unknown; name?: unknown }[] };
    if (!Array.isArray(body.shops)) return [];
    return body.shops
      .filter((s) => typeof s.id === 'string' && s.id !== '')
      .map((s) => ({ id: s.id as string, name: typeof s.name === 'string' ? s.name : '' }));
  }

  // ---- internals -----------------------------------------------------------

  private async fetchJson(path: string, init: RequestInit): Promise<{ status: number; json: unknown }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(`${BILLZ_URL}${path}`, { ...init, signal: controller.signal });
    } catch {
      throw new BillzNetworkError('billz: fetch failed or timed out');
    } finally {
      clearTimeout(timer);
    }
    let json: unknown = null;
    try {
      json = await res.json();
    } catch {
      if (res.ok) throw new BillzNetworkError('billz: malformed JSON response');
    }
    return { status: res.status, json };
  }

  /** Returns a cached access token for this secret, logging in when missing/expired/forced. */
  private async accessToken(secretToken: string, force = false): Promise<string> {
    const key = createHash('sha256').update(secretToken).digest('hex');
    const c = this.cached;
    if (!force && c && c.key === key && (c.expiresAt === 0 || c.expiresAt - EXP_SKEW_MS > Date.now())) {
      return c.accessToken;
    }
    this.cached = null;

    const { status, json } = await this.fetchJson('/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret_token: secretToken }),
    });
    if (status === 400 || status === 401 || status === 403) throw new BillzAuthError(`billz: login http ${status}`);
    if (status < 200 || status >= 300) throw new BillzNetworkError(`billz: login http ${status}`);
    const token = (json as { data?: { access_token?: unknown } } | null)?.data?.access_token;
    if (typeof token !== 'string' || token === '') throw new BillzAuthError('billz: login returned no access token');

    this.cached = { key, accessToken: token, expiresAt: jwtExpiry(token) };
    return token;
  }

  /** Authorized GET with one re-login retry on 401. */
  private async get(secretToken: string, path: string): Promise<unknown> {
    let token = await this.accessToken(secretToken);
    let { status, json } = await this.fetchJson(path, { headers: { Authorization: `Bearer ${token}` } });
    if (status === 401) {
      // The cached token may have been revoked — re-login once, then fail.
      token = await this.accessToken(secretToken, true);
      ({ status, json } = await this.fetchJson(path, { headers: { Authorization: `Bearer ${token}` } }));
      if (status === 401) throw new BillzAuthError('billz: 401 after re-login');
    }
    if (status === 403) throw new BillzAuthError('billz: http 403');
    if (status < 200 || status >= 300) throw new BillzNetworkError(`billz: http ${status}`);
    if (json !== null && typeof json === 'object' && (json as { error?: unknown }).error) {
      throw new BillzNetworkError('billz: error body on 2xx response');
    }
    return json;
  }
}

/** Best-effort `exp` (ms) from a JWT payload; 0 when undecodable. */
function jwtExpiry(token: string): number {
  try {
    const payload = token.split('.')[1] ?? '';
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { exp?: unknown };
    return typeof parsed.exp === 'number' ? parsed.exp * 1000 : 0;
  } catch {
    return 0;
  }
}
