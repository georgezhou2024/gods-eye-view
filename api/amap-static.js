// Vercel Serverless Function: 高德静态地图
// 部署后通过 /api/amap-static?location=经度,纬度&zoom=16&size=400*250 访问

export default async function handler(req, res) {
  const { searchParams } = new URL(req.url, 'http://localhost');
  const location = searchParams.get('location');
  const zoom = searchParams.get('zoom') || '16';
  const size = searchParams.get('size') || '400*250';

  if (!location) {
    res.status(400).send('missing location');
    return;
  }

  const key = process.env.AMAP_WEB_SERVICE_KEY;
  if (!key) {
    res.status(500).send('no key');
    return;
  }

  try {
    const url = `https://restapi.amap.com/v3/staticmap?key=${key}&location=${encodeURIComponent(location)}&zoom=${zoom}&size=${size}`;
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(Buffer.from(buffer));
  } catch (err) {
    res.status(500).send(err.message);
  }
}
