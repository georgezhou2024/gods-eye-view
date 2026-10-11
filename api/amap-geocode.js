// Vercel Serverless Function: 高德地理编码
// 支持两种模式：
// 1. 反向地理编码：?location=经度,纬度
// 2. 正向地理编码：?address=地名

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { searchParams } = new URL(req.url, 'http://localhost');
  const key = process.env.AMAP_WEB_SERVICE_KEY;
  
  if (!key) {
    res.status(500).json({ status: '0', info: 'no_key' });
    return;
  }

  const location = searchParams.get('location');
  const address = searchParams.get('address');

  try {
    let url;
    if (location) {
      // 反向地理编码
      url = `https://restapi.amap.com/v3/geocode/regeo?key=${key}&location=${encodeURIComponent(location)}&extensions=base`;
    } else if (address) {
      // 正向地理编码
      url = `https://restapi.amap.com/v3/geocode/geo?key=${key}&address=${encodeURIComponent(address)}`;
    } else {
      res.status(400).json({ status: '0', info: 'missing_params' });
      return;
    }

    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ status: '0', info: err.message });
  }
}
