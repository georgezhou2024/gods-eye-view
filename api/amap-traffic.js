// Vercel Serverless Function: 高德实时交通代理
// 部署后通过 /api/amap-traffic?rect=经度1,纬度1;经度2,纬度2 访问

export default async function handler(req, res) {
  // 解决 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { searchParams } = new URL(req.url, 'http://localhost');
  const rect = searchParams.get('rect');

  if (!rect) {
    res.status(400).json({ error: 'missing_rect', message: '需要 rect 参数' });
    return;
  }

  const key = process.env.AMAP_WEB_SERVICE_KEY || '1213edcbeb01da766f9487c8a574c440';
  if (!key) {
    res.status(500).json({ error: 'no_key', message: '未配置 AMAP_WEB_SERVICE_KEY' });
    return;
  }

  try {
    const url = `https://restapi.amap.com/v3/traffic/status/rectangle?key=${key}&rectangle=${encodeURIComponent(rect)}&extensions=all`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: 'fetch_failed', message: err.message });
  }
}
