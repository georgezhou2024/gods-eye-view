// 标记功能：点击地图添加标记，显示地址和照片
// + 搜索功能
// + 快捷城市按钮（北京、上海）
// + 标记文字复制

(function() {
  console.log('[Markers] 功能加载中...');

  let markers = [];
  let addMode = false;

  // 创建 UI
  function createUI() {
    // 1. 搜索框
    const searchBox = document.createElement('div');
    searchBox.id = 'search-box';
    searchBox.style.cssText = `
      position: fixed;
      top: 80px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 99999;
      display: flex;
      gap: 8px;
      font-family: 'Inter', sans-serif;
    `;

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = '🔍 搜索地名，如：上海新天地';
    input.style.cssText = `
      background: #1a1a2e;
      color: #00ff88;
      border: 1px solid #00ff88;
      border-radius: 20px;
      padding: 10px 20px;
      font-size: 14px;
      width: 280px;
      outline: none;
    `;
    searchBox.appendChild(input);

    const searchBtn = document.createElement('button');
    searchBtn.innerHTML = '搜索';
    searchBtn.style.cssText = `
      background: #00ff88;
      color: #1a1a2e;
      border: none;
      border-radius: 20px;
      padding: 10px 20px;
      font-size: 14px;
      cursor: pointer;
      font-weight: bold;
    `;
    searchBox.appendChild(searchBtn);

    document.body.appendChild(searchBox);

    // 搜索事件
    searchBtn.addEventListener('click', () => searchPlace(input.value));
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') searchPlace(input.value);
    });

    // 2. 快捷城市按钮
    const cityBar = document.createElement('div');
    cityBar.id = 'quick-cities';
    cityBar.style.cssText = `
      position: fixed;
      top: 130px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 99999;
      display: flex;
      gap: 10px;
      font-family: 'Inter', sans-serif;
    `;
    
    const cities = [
      { name: '北京', lng: 116.4074, lat: 39.9042 },
      { name: '上海', lng: 121.4737, lat: 31.2304 },
    ];

    cities.forEach(city => {
      const btn = document.createElement('button');
      btn.innerHTML = `📍 ${city.name}`;
      btn.style.cssText = `
        background: #1a1a2e;
        color: #00ff88;
        border: 1px solid #00ff88;
        border-radius: 20px;
        padding: 6px 14px;
        font-size: 12px;
        cursor: pointer;
      `;
      btn.addEventListener('click', () => {
        const viewer = window.viewer;
        if (!viewer) return;
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(city.lng, city.lat, 600),
          orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-35),
            roll: 0.0,
          },
          duration: 2.0,
        });
      });
      cityBar.appendChild(btn);
    });

    document.body.appendChild(cityBar);

    // 3. 添加标记按钮
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
      } else {
        btn.innerHTML = '📍 添加标记';
        btn.style.background = '#1a1a2e';
        btn.style.color = '#00ff88';
      }
    });

    // 4. 清除所有标记按钮
    const clearBtn = document.createElement('button');
    clearBtn.id = 'clear-markers-btn';
    clearBtn.innerHTML = '🗑️ 清除标记';
    clearBtn.style.cssText = `
      position: fixed;
      bottom: 130px;
      right: 20px;
      z-index: 99999;
      background: #1a1a2e;
      color: #ff4444;
      border: 1px solid #ff4444;
      border-radius: 6px;
      padding: 8px 16px;
      font-size: 13px;
      cursor: pointer;
      font-family: 'Inter', sans-serif;
      box-shadow: 0 2px 10px rgba(0,0,0,0.5);
    `;
    document.body.appendChild(clearBtn);

    clearBtn.addEventListener('click', () => {
      const viewer = window.viewer;
      if (!viewer) return;
      markers.forEach(m => viewer.entities.remove(m));
      markers = [];
    });
  }

  // 搜索地名
  async function searchPlace(keyword) {
    if (!keyword || !window.viewer) return;

    console.log('[Search] 搜索:', keyword);
    
    try {
      // 高德地理编码 API
      const url = `/api/amap-geocode?address=${encodeURIComponent(keyword)}`;
      const resp = await fetch(url);
      const data = await resp.json();
      console.log('[Search] 结果:', data);

      if (data.status === '1' && data.geocodes && data.geocodes.length > 0) {
        const location = data.geocodes[0].location.split(',');
        const lng = parseFloat(location[0]);
        const lat = parseFloat(location[1]);

        // GCJ02 转 WGS84
        const wgs = gcj02ToWgs84(lng, lat);

        // 飞过去
        window.viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(wgs.lng, wgs.lat, 600),
          orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-35),
            roll: 0.0,
          },
          duration: 2.0,
        });

        alert(`已找到: ${data.geocodes[0].formatted_address}`);
      } else {
        alert('未找到该地点');
      }
    } catch (e) {
      console.error('[Search] 搜索失败:', e);
      alert('搜索失败: ' + e.message);
    }
  }

  // 获取地址（反向地理编码）
  async function getAddress(lng, lat) {
    try {
      const url = `/api/amap-geocode?location=${lng},${lat}`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (data.status === '1' && data.regeocode) {
        return data.regeocode.formatted_address;
      }
      return `坐标: ${lng.toFixed(4)}, ${lat.toFixed(4)}`;
    } catch (e) {
      return `坐标: ${lng.toFixed(4)}, ${lat.toFixed(4)}`;
    }
  }

  // 添加标记
  async function addMarker(lng, lat) {
    const viewer = window.viewer;
    if (!viewer) return;

    const gcj = wgs84ToGcj02(lng, lat);
    const address = await getAddress(gcj.lng, gcj.lat);

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

  // GCJ02 转 WGS84
  function gcj02ToWgs84(lng, lat) {
    const gcj = wgs84ToGcj02(lng, lat);
    return { lng: lng * 2 - gcj.lng, lat: lat * 2 - gcj.lat };
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

      const cartesian = viewer.camera.pickEllipsoid(click.position, viewer.scene.globe.ellipsoid);
      
      if (!cartesian) {
        const ray = viewer.camera.getPickRay(click.position);
        const cartesian2 = viewer.scene.globe.pick(ray, viewer.scene);
        if (cartesian2) {
          const cartographic = Cesium.Cartographic.fromCartesian(cartesian2);
          const lng = Cesium.Math.toDegrees(cartographic.longitude);
          const lat = Cesium.Math.toDegrees(cartographic.latitude);
          addMarker(lng, lat);
        }
      } else {
        const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
        const lng = Cesium.Math.toDegrees(cartographic.longitude);
        const lat = Cesium.Math.toDegrees(cartographic.latitude);
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
    
    const checkViewer = setInterval(() => {
      if (window.viewer && window.Cesium) {
        clearInterval(checkViewer);
        setTimeout(setupClickHandler, 1000);
      }
    }, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
