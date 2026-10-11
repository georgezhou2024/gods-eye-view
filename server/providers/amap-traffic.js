import path from 'node:path';
import { promises as fsp } from 'node:fs';

/**
 * 高德地图实时交通代理
 *
 * 接口: GET /api/amap/traffic?rect=116.40,39.90;116.48,39.95
 * 返回: 高德交通态势 JSON
 *
 * Key 从环境变量 AMAP_WEB_SERVICE_KEY 读取
 * 缓存: 内存缓存 2 分钟
 */
export function amapTrafficProxy() {
  const CACHE_TTL_MS = 120_000;
  const UPSTREAM_TIMEOUT_MS = 10000;
  const MEM_MAX_ENTRIES = 64;

  /** @type {Map<string, {at:number, data:any}>} */
  const mem = new Map();

  function getKey() {
    return process.env.AMAP_WEB_SERVICE_KEY || '';
  }

  async function fetchTraffic(rect) {
    const key = getKey();
    if (!key) {
      return { error: 'no_key', message: '未配置 AMAP_WEB_SERVICE_KEY' };
    }

    const url = `https://restapi.amap.com/v3/traffic/status/rectangle?key=${key}&rectangle=${encodeURIComponent(rect)}&extensions=all`;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);

      if (!res.ok) {
        return { error: 'upstream_error', status: res.status };
      }

      const data = await res.json();
      return data;
    } catch (err) {
      return { error: 'fetch_failed', message: err?.message || String(err) };
    }
  }

  return {
    name: 'amap-traffic-proxy',
    configureServer(server) {
      server.middlewares.use('/api/amap/traffic', async (req, res) => {
        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const rect = url.searchParams.get('rect') || '';

        if (!rect) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: 'missing_rect', message: '需要 rect 参数，格式: 经度1,纬度1;经度2,纬度2' }));
          return;
        }

        // 缓存检查
        const cacheKey = rect;
        const cached = mem.get(cacheKey);
        if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('X-Cache', 'HIT');
          res.end(JSON.stringify(cached.data));
          return;
        }

        const data = await fetchTraffic(rect);

        // 写入缓存
        if (data && data.status === '1') {
          mem.set(cacheKey, { at: Date.now(), data });
          // 简单的 LRU：超过上限删最老的
          if (mem.size > MEM_MAX_ENTRIES) {
            const firstKey = mem.keys().next().value;
            mem.delete(firstKey);
          }
        }

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('X-Cache', 'MISS');
        res.end(JSON.stringify(data));
      });

      // 状态接口
      server.middlewares.use('/api/amap/status', async (req, res) => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({
          hasKey: !!getKey(),
          cacheEntries: mem.size,
        }));
      });
    },
  };
}
