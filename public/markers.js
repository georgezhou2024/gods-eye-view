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
      bottom: 80px;
      right: 20px;
      z-index: 99999;
      background: #1a1a2e;
      color: #00ff88;
      border: 1px solid #00ff88;
      border-radius: 6px;
      padding: 10px 18px;
      font-size: 14px;
      cursor: pointer;
      font-family: 'Inter', sans-serif;
      box-shadow: 0 2px 10px rgba(0,0,0,0.5);
    `;
    document.body.appendChild(btn);

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      addMode = !addMode;
      if (addMode) {
        btn.innerHTML = '📍 点击地图...';
        btn.style.background = '#00ff88';
        btn.style.color = '#1a1a2e';
        console.log('[Markers] 添加模式开启');
      } else {
        btn.innerHTML = '📍 添加标记';
        btn.style.background = '#1a1a2e';
        btn.style.color = '#00ff88';
        console.log('[Markers] 添加模式关闭');
      }
    });
  }

  // 获取地址（反向地理编码）
  async function getAddress(lng, lat) {
    try {
      console.log('[Markers] 查询地址:', lng, lat);
      const url = `/api/amap-geocode?location=${lng},${lat}`;
      const resp = await fetch(url);
      const data = await resp.json();
      console.log('[Markers] 地址结果:', data);
      if (data.status === '1' && data.regeocode) {
        return data.regeocode.formatted_address;
      }
      return `坐标: ${lng.toFixed(4)}, ${lat.toFixed(4)}`;
    } catch (e) {
      console.error('[Markers] 获取地址失败:', e);
      return `坐标: ${lng.toFixed(4)}, ${lat.toFixed(4)}`;
    }
  }

  // 添加标记
  async function addMarker(lng, lat) {
    const viewer = window.viewer;
    if (!viewer) {
      alert('地图还没加载完');
      return;
    }

    console.log('[Markers] 添加标记:', lng, lat);

    // WGS84 转 GCJ02
    const gcj = wgs84ToGcj02(lng, lat);
    const address = await getAddress(gcj.lng, gcj.lat);

    // 创建图钉标记
    const marker = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(lng, lat, 100),
      billboard: {
        image: 'data:image/svg+xml;base64,' + btoa(`
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="45" viewBox="0 0 36 45">
            <path d="M18 0 C8 0 0 8 0 18 C0 31 18 45 18 45 C18 45 36 31 36 18 C36 8 28 0 18 0 Z" fill="#ff4444" stroke="white" stroke-width="2"/>
            <circle cx="18" cy="18" r="7" fill="white"/>
          </svg>
        `),
        width: 36,
        height: 45,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
      label: {
        text: address,
        font: '13px sans-serif',
        fillColor: Cesium.Color.WHITE,
        backgroundColor: new Cesium.Color(0.1, 0.1, 0.2, 0.9),
        showBackground: true,
        pixelOffset: new Cesium.Cartesian2(0, -50),
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        outlineWidth: 2,
        outlineColor: Cesium.Color.BLACK,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
    });

    markers.push(marker);
    console.log('[Markers] 标记成功:', address);
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

    console.log('[Markers] 地图加载完成，绑定点击事件');

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    
    handler.setInputAction((click) => {
      if (!addMode) return;

      console.log('[Markers] 地图点击:', click.position);

      // 用 pickEllipsoid 检测点击位置（兼容 3D 和 2D 模式）
      const cartesian = viewer.camera.pickEllipsoid(click.position, viewer.scene.globe.ellipsoid);
      
      if (!cartesian) {
        console.log('[Markers] pickEllipsoid 失败，尝试 globe.pick');
        const ray = viewer.camera.getPickRay(click.position);
        const cartesian2 = viewer.scene.globe.pick(ray, viewer.scene);
        if (cartesian2) {
          const cartographic = Cesium.Cartographic.fromCartesian(cartesian2);
          const lng = Cesium.Math.toDegrees(cartographic.longitude);
          const lat = Cesium.Math.toDegrees(cartographic.latitude);
          console.log('[Markers] 坐标(globe):', lng, lat);
          addMarker(lng, lat);
        }
      } else {
        const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
        const lng = Cesium.Math.toDegrees(cartographic.longitude);
        const lat = Cesium.Math.toDegrees(cartographic.latitude);
        console.log('[Markers] 坐标(ellipsoid):', lng, lat);
        addMarker(lng, lat);
      }

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
    
    // 等 viewer 加载
    const checkViewer = setInterval(() => {
      if (window.viewer && window.Cesium) {
        clearInterval(checkViewer);
        setTimeout(setupClickHandler, 1000);
      }
    }, 500);

    console.log('[Markers] 标记功能加载完成');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
