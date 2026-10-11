// 标记功能 + 搜索功能 + 快捷城市

(function() {
  console.log('[App] 功能加载中...');

  let markers = [];
  let addMode = false;
  let searchResults = [];
  let highlightEntity = null;

  function createUI() {
    // 搜索框
    const searchBox = document.createElement('div');
    searchBox.id = 'search-box';
    searchBox.style.cssText = `
      position: fixed;
      top: 80px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 99999;
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

    // 搜索结果下拉列表
    const resultsDiv = document.createElement('div');
    resultsDiv.id = 'search-results';
    resultsDiv.style.cssText = `
      display: none;
      margin-top: 5px;
      background: #1a1a2e;
      border: 1px solid #00ff88;
      border-radius: 10px;
      max-height: 300px;
      overflow-y: auto;
    `;
    searchBox.appendChild(resultsDiv);

    document.body.appendChild(searchBox);

    // 输入时自动搜索
    let searchTimeout;
    input.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        if (input.value.trim()) {
          searchPlace(input.value.trim());
        } else {
          resultsDiv.style.display = 'none';
        }
      }, 500);
    });

    // 快捷城市按钮
    const cityBar = document.createElement('div');
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
      btn.addEventListener('click', () => flyTo(city.lng, city.lat));
      cityBar.appendChild(btn);
    });

    document.body.appendChild(cityBar);

    // 添加标记按钮
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

    // 清除标记按钮
    const clearBtn = document.createElement('button');
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
    try {
      const url = `/api/amap-search?keywords=${encodeURIComponent(keyword)}`;
      const resp = await fetch(url);
      const data = await resp.json();
      
      if (data.status === '1' && data.pois && data.pois.length > 0) {
        showSearchResults(data.pois.slice(0, 8));
      }
    } catch (e) {
      console.error('[Search] 搜索失败:', e);
    }
  }

  // 显示搜索结果
  function showSearchResults(pois) {
    const resultsDiv = document.getElementById('search-results');
    if (!resultsDiv) return;

    resultsDiv.innerHTML = '';
    resultsDiv.style.display = 'block';

    pois.forEach((poi, index) => {
      const item = document.createElement('div');
      item.style.cssText = `
        padding: 10px 15px;
        cursor: pointer;
        border-bottom: 1px solid #333;
        color: #fff;
        font-size: 13px;
      `;
      item.innerHTML = `<div style="color:#00ff88; font-weight:bold;">${poi.name}</div>
                        <div style="color:#888; font-size:11px; margin-top:3px;">${poi.address || poi.pname}</div>`;
      
      item.addEventListener('mouseenter', () => {
        item.style.background = '#00ff8822';
      });
      item.addEventListener('mouseleave', () => {
        item.style.background = 'transparent';
      });

      item.addEventListener('click', () => {
        selectResult(poi);
        resultsDiv.style.display = 'none';
        document.getElementById('search-box').querySelector('input').value = poi.name;
      });

      resultsDiv.appendChild(item);
    });
  }

  // 选择搜索结果
  function selectResult(poi) {
    if (!window.viewer) return;

    const location = poi.location.split(',');
    const lng = parseFloat(location[0]);
    const lat = parseFloat(location[1]);

    // GCJ02 转 WGS84
    const wgs = gcj02ToWgs84(lng, lat);

    // 移除之前的高亮
    if (highlightEntity) {
      window.viewer.entities.remove(highlightEntity);
    }

    // 添加发光标记
    highlightEntity = window.viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(wgs.lng, wgs.lat, 0),
      ellipse: {
        semiMinorAxis: 200,
        semiMajorAxis: 200,
        material: Cesium.Color.CYAN.withAlpha(0.3),
        outline: true,
        outlineColor: Cesium.Color.CYAN,
        outlineWidth: 3,
        height: 0,
      },
      label: {
        text: poi.name,
        font: '16px sans-serif',
        fillColor: Cesium.Color.CYAN,
        backgroundColor: new Cesium.Color(0, 0.2, 0.3, 0.8),
        showBackground: true,
        pixelOffset: new Cesium.Cartesian2(0, -50),
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      },
    });

    // 飞过去
    flyTo(wgs.lng, wgs.lat);
  }

  // 飞到指定位置
  function flyTo(lng, lat) {
    if (!window.viewer) return;
    window.viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lng, lat, 600),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-35),
        roll: 0.0,
      },
      duration: 2.0,
    });
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
      },
    });

    markers.push(marker);
  }

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

  // 坐标转换
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
