// 高德实时交通浮窗 + 跟随地图视角自动查询

// GCJ-02 (火星坐标系) 转 WGS84
function gcj02ToWgs84(lng, lat) {
  const a = 6378245.0;
  const ee = 0.00669342162296594323;

  function transformLat(lng, lat) {
    let ret = -100.0 + 2.0 * lng + 3.0 * lat + 0.2 * lat * lat + 0.1 * lng * lat + 0.2 * Math.sqrt(Math.abs(lng));
    ret += (20.0 * Math.sin(6.0 * lng * Math.PI) + 20.0 * Math.sin(2.0 * lng * Math.PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(lat * Math.PI) + 40.0 * Math.sin(lat / 3.0 * Math.PI)) * 2.0 / 3.0;
    ret += (160.0 * Math.sin(lat / 12.0 * Math.PI) + 320 * Math.sin(lat * Math.PI / 30.0)) * 2.0 / 3.0;
    return ret;
  }

  function transformLng(lng, lat) {
    let ret = 300.0 + lng + 2.0 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng));
    ret += (20.0 * Math.sin(6.0 * lng * Math.PI) + 20.0 * Math.sin(2.0 * lng * Math.PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(lng * Math.PI) + 40.0 * Math.sin(lng / 3.0 * Math.PI)) * 2.0 / 3.0;
    ret += (150.0 * Math.sin(lng / 12.0 * Math.PI) + 300.0 * Math.sin(lng / 30.0 * Math.PI)) * 2.0 / 3.0;
    return ret;
  }

  let dLat = transformLat(lng - 105.0, lat - 35.0);
  let dLng = transformLng(lng - 105.0, lat - 35.0);
  const radLat = lat / 180.0 * Math.PI;
  let magic = Math.sin(radLat);
  magic = 1 - ee * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / ((a * (1 - ee)) / (magic * sqrtMagic) * Math.PI);
  dLng = (dLng * 180.0) / (a / sqrtMagic * Math.cos(radLat) * Math.PI);
  const mgLat = lat + dLat;
  const mgLng = lng + dLng;
  return [lng * 2 - mgLng, lat * 2 - mgLat];
}

// 根据拥堵状态返回颜色
function getStatusColor(status) {
  const C = window.Cesium;
  switch (String(status)) {
    case '1': return C.Color.LIME.withAlpha(0.9);    // 畅通 - 绿
    case '2': return C.Color.YELLOW.withAlpha(0.95);  // 缓行 - 黄
    case '3': return C.Color.RED.withAlpha(1.0);      // 拥堵 - 红
    case '4': return C.Color.DARKRED.withAlpha(1.0); // 严重拥堵 - 深红
    default: return C.Color.GRAY.withAlpha(0.6);
  }
}

// 画路段到地图上
function drawTrafficRoads(roads) {
  if (!window.viewer || !window.Cesium) return;

  // 清除之前的实体
  const existing = window.viewer.entities.values.filter(e => e._amapTraffic);
  existing.forEach(e => window.viewer.entities.remove(e));

  const C = window.Cesium;

  roads.forEach(road => {
    if (!road.polyline) return;

    // 解析坐标点串
    const points = road.polyline.split(';').map(pt => {
      const [lng, lat] = pt.split(',').map(Number);
      const [wgsLng, wgsLat] = gcj02ToWgs84(lng, lat);
      return C.Cartesian3.fromDegrees(wgsLng, wgsLat, 0);
    });

    if (points.length < 2) return;

    // 创建 Polyline 实体
    const entity = window.viewer.entities.add({
      polyline: {
        positions: points,
        width: 8,
        material: getStatusColor(road.status),
        clampToGround: true,
      },
    });
    entity._amapTraffic = true;
  });
}

// 查询交通路况
function queryTraffic(lng, lat) {
  // 方圆约 3 公里（经纬度差约 0.025 度，对角线约 5 公里，不超 10 公里限制）
  const delta = 0.022;
  const minLng = (lng - delta).toFixed(6);
  const minLat = (lat - delta).toFixed(6);
  const maxLng = (lng + delta).toFixed(6);
  const maxLat = (lat + delta).toFixed(6);
  const rect = `${minLng},${minLat};${maxLng},${maxLat}`;

  const content = document.getElementById('amap-traffic-content');
  if (content) content.innerHTML = '⏳ 加载中...';

  const xhr = new XMLHttpRequest();
  xhr.open('GET', `/api/amap/traffic?rect=${rect}`, true);
  xhr.onload = function() {
    try {
      const data = JSON.parse(xhr.responseText);
      if (data.status === '1' && data.trafficinfo) {
        const eval_ = data.trafficinfo.evaluation;
        let html = '';
        if (eval_) {
          html += `<div style="margin-bottom:8px; padding:6px; background:#222; border-radius:4px;">`;
          html += `<div>📍 ${lat.toFixed(4)}, ${lng.toFixed(4)}</div>`;
          html += `<div>📝 ${eval_.description || '暂无描述'}</div>`;
          html += `</div>`;
          html += `<div style="display:flex; gap:8px; margin-bottom:8px;">`;
          html += `<span style="color:#00ff88;">畅通: ${eval_.expedite || 0}</span>`;
          html += `<span style="color:#ffaa00;">缓行: ${eval_.congested || 0}</span>`;
          html += `<span style="color:#ff4444;">拥堵: ${eval_.blocked || 0}</span>`;
          html += `</div>`;
        }
        if (data.trafficinfo.roads && data.trafficinfo.roads.length > 0) {
          html += `<div style="margin-top:8px; color:#888;">道路详情:</div>`;
          const statusMap = {'1':'🟢 畅通','2':'🟡 缓行','3':'🔴 拥堵','4':'⚫ 严重拥堵'};
          for (let i = 0; i < Math.min(10, data.trafficinfo.roads.length); i++) {
            const road = data.trafficinfo.roads[i];
            const status = statusMap[road.status] || road.status;
            html += `<div style="padding:2px 0; border-bottom:1px solid #333;">${status} ${road.name}</div>`;
          }
          // 画到地图上
          drawTrafficRoads(data.trafficinfo.roads);
        }
        if (content) content.innerHTML = html;
      } else {
        if (content) content.innerHTML = `❌ 查询失败: ${data.info || '未知错误'}`;
      }
    } catch (e) {
      if (content) content.innerHTML = `❌ 解析错误: ${e.message}`;
    }
  };
  xhr.onerror = function() {
    if (content) content.innerHTML = '❌ 网络错误';
  };
  xhr.send();
}

// 获取地图中心的地面坐标
function getCameraCenter() {
  if (!window.viewer || !window.Cesium) return null;
  // 用屏幕中心射线和地球的交点
  const viewer = window.viewer;
  const centerX = viewer.canvas.clientWidth / 2;
  const centerY = viewer.canvas.clientHeight / 2;
  const ray = viewer.camera.getPickRay(new window.Cesium.Cartesian2(centerX, centerY));
  const cartesian = viewer.scene.globe.pick(ray, viewer.scene);
  if (!cartesian) return null;
  const carto = window.Cesium.Cartographic.fromCartesian(cartesian);
  const lng = window.Cesium.Math.toDegrees(carto.longitude);
  const lat = window.Cesium.Math.toDegrees(carto.latitude);
  return { lng, lat };
}

// 监听相机移动（节流：移动停止 1 秒后才查询）
let moveEndTimer = null;
function onCameraMoveEnd() {
  if (moveEndTimer) clearTimeout(moveEndTimer);
  moveEndTimer = setTimeout(() => {
    const pos = getCameraCenter();
    if (pos) {
      console.log('[AMap] Camera moved to', pos.lng, pos.lat);
      queryTraffic(pos.lng, pos.lat);
    }
  }, 1000);
}

// 等待 viewer 准备好
function waitForViewer() {
  if (window.viewer && window.Cesium) {
    // 监听相机移动结束
    window.viewer.camera.moveEnd.addEventListener(onCameraMoveEnd);
    // 监听相机移动过程（更可靠）
    window.viewer.camera.changed.addEventListener(onCameraMoveEnd);
    // 首次加载
    setTimeout(() => {
      const pos = getCameraCenter();
      if (pos) queryTraffic(pos.lng, pos.lat);
    }, 1000);
  } else {
    setTimeout(waitForViewer, 500);
  }
}

// 页面加载完启动
window.addEventListener('load', function() {
  setTimeout(waitForViewer, 2000);
});
