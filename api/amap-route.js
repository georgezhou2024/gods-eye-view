// Vercel Serverless Function: 高德驾车路线规划
// 部署后通过 /api/amap-route?origin=经度,纬度&destination=经度,纬度 访问

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { searchParams } = new URL(req.url, 'http://localhost');
  const origin = searchParams.get('origin');
  const destination = searchParams.get('destination');

  if (!origin || !destination) {
    res.status(400).json({ status: '0', info: 'missing_params' });
    return;
  }

  const key = process.env.AMAP_WEB_SERVICE_KEY;
  if (!key) {
    res.status(500).json({ status: '0', info: 'no_key' });
    return;
  }

  try {
    const url = `https://restapi.amap.com/v3/direction/driving?key=${key}&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&extensions=base`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ status: '0', info: err.message });
  }
}
