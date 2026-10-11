// Vercel Serverless Function: 高德 POI 搜索
// 部署后通过 /api/amap-search?keywords=关键词 访问

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { searchParams } = new URL(req.url, 'http://localhost');
  const keywords = searchParams.get('keywords');
  const city = searchParams.get('city') || '北京';

  if (!keywords) {
    res.status(400).json({ status: '0', info: 'missing_keywords' });
    return;
  }

  const key = process.env.AMAP_WEB_SERVICE_KEY;
  if (!key) {
    res.status(500).json({ status: '0', info: 'no_key' });
    return;
  }

  try {
    const url = `https://restapi.amap.com/v3/place/text?key=${key}&keywords=${encodeURIComponent(keywords)}&city=${encodeURIComponent(city)}&citylimit=false&offset=10&page=1`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ status: '0', info: err.message });
  }
}
