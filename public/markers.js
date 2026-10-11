// 标记功能：点击地图添加标记，显示地址和照片
(function() {
  console.log('[Markers] 标记功能加载中...');

  let markers = [];
  let addMode = false;

  // 创建 UI 按钮
  function createUI() {
    const btn = document.createElement('button');
    btn.id = 'add-marker-btn';
    btn.innerHTML = '📍 添加标记';
    btn.style.cssText = `
      position: fixed;
      top: 140px;
      left: 20px;
      z-index: 99999;
      background: #1a1a2e;
      color: #00ff88;
      border: 1px solid #00ff88;
      border-radius: 6px;
      padding: 8px 16px;
      font-size: 14px;
      cursor: pointer;
      font-family: 'Inter', sans-serif;
    `;
    document.body.appendChild(btn);

    btn.addEventListener('click', () => {
      addMode = !addMode;
      if (addMode) {
        btn.innerHTML = '📍 点击地图添加标记...';
        btn.style.background = '#00ff88';
        btn.style.color = '#1a1a2e';
      } else {
        btn.innerHTML = '📍 添加标记';
        btn.style.background = '#1a1a2e';
        btn.style.color = '#00ff88';
      }
    });

    // 创建标记弹窗容器
    const popup = document.createElement('div');
    popup.id = 'marker-popup';
    popup.style.cssText = `
      display: none;
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 999999;
      background: #1a1a2e;
      color: #fff;
      border: 1px solid #00ff88;
      border-radius: 10px;
      padding: 20px;
      width: 320px;
      font-family: 'Inter', sans-serif;
    `;
    document.body.appendChild(popup);
  }

  // 获取地址（反向地理编码）
  async function getAddress(lng, lat) {
    try {
      const resp = await fetch(`/api/amap-geocode?location=${lng},${lat}`);
      const data = await resp.json();
      if (data.status === '1' && data.regeocode) {
        return data.regeocode.formatted_address;
      }
      return '未知地址';
    } catch (e) {
      console.error('[Markers] 获取地址失败:', e);
      return '地址获取失败';
    }
  }

  // 添加标记
  async function addMarker(lng, lat) {
    const viewer = window.viewer;
    if (!viewer) return;

    // WGS84 转 GCJ02
    const gcj = wgs84ToGcj02(lng, lat);
    const address = await getAddress(gcj.lng, gcj.lat);

    // 创建图钉标记
    const marker = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(lng, lat, 0),
      billboard: {
        image: 'data:image/svg+xml;base64,' + btoa(`
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
            <path d="M16 0 C7 0 0 7 0 16 C0 28 16 40 16 40 C16 40 32 28 32 16 C32 7 25 0 16 0 Z" fill="#ff4444"/>
            <circle cx="16" cy="16" r="6" fill="white"/>
          </svg>
        `),
        width: 32,
        height: 40,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      },
      label: {
        text: address,
        font: '12px sans-serif',
        fillColor: Cesium.Color.WHITE,
        backgroundColor: new Cesium.Color(0.1, 0.1, 0.2, 0.8),
        showBackground: true,
        pixelOffset: new Cesium.Cartesian2(0, -45),
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      },
      properties: { address: address, lng: lng, lat: lat },
    });

    markers.push(marker);
    console.log('[Markers] 添加标记:', address);
  }

  // WGS84 转 GCJ02
  function wgs84ToGcj02(lng, lat) {
    const a = 6378245.0;
    const ee = 0.00669342162296594323;
    let dLat = transformLat(lng - 105.0, lat - 35.0);
    let dLng = transformLng(lng - 105.0, lat - 35.0);
    const radLat = lat / 180.0 * Math.PI;
    let magic = Math.sin(radLat);
    magic = 1 - ee * magic * magic;
    const sqrtMagic = Math.sqrt(magic);
    dLat = (dLat * 180.0) / ((a * (1 - ee)) / (magic * sqrtMagic) * Math.PI);
    dLng = (dLng * 180.0) / (a / sqrtMagic * Math.cos(radLat) * Math.PI);
    return { lng: lng + dLng, lat: lat + dLat };
  }

  function transformLat(x, y) {
    let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(y * Math.PI) + 40.0 * Math.sin(y / 3.0 * Math.PI)) * 2.0 / 3.0;
    ret += (160.0 * Math.sin(y / 12.0 * Math.PI) + 320 * Math.sin(y * Math.PI / 30.0)) * 2.0 / 3.0;
    return ret;
  }

  function transformLng(x, y) {
    let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(x * Math.PI) + 40.0 * Math.sin(x / 3.0 * Math.PI)) * 2.0 / 3.0;
    ret += (150.0 * Math.sin(x / 12.0 * Math.PI) + 300.0 * Math.sin(x / 30.0 * Math.PI)) * 2.0 / 3.0;
    return ret;
  }

  // 监听地图点击
  function setupClickHandler() {
    const viewer = window.viewer;
    if (!viewer) {
      setTimeout(setupClickHandler, 1000);
      return;
    }

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((click) => {
      if (!addMode) return;

      const ray = viewer.camera.getPickRay(click.position);
      const cartesian = viewer.scene.globe.pick(ray, viewer.scene);
      if (!cartesian) return;

      const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
      const lng = Cesium.Math.toDegrees(cartographic.longitude);
      const lat = Cesium.Math.toDegrees(cartographic.latitude);

      addMarker(lng, lat);
      addMode = false;
      const btn = document.getElementById('add-marker-btn');
      if (btn) {
        btn.innerHTML = '📍 添加标记';
        btn.style.background = '#1a1a2e';
        btn.style.color = '#00ff88';
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  }

  // 初始化
  function init() {
    createUI();
    setupClickHandler();
    console.log('[Markers] 标记功能加载完成');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
