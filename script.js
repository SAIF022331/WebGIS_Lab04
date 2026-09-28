const map = L.map('map', { zoomControl: false }).setView([30.4, 69.35], 5);
L.control.zoom({ position: 'topright' }).addTo(map);

const streets = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri'
});

const baseMaps = { 'OpenStreetMap': streets, 'Satellite imagery': satellite };
const overlays = {};
const layerControl = L.control.layers(baseMaps, overlays, { collapsed: false, position: 'topright' }).addTo(map);

function popup(title, rows) {
    return `<h3 class="popup-title">${title}</h3><dl class="popup-grid">${rows.map(([label, value]) => `<dt>${label}</dt><dd>${value}</dd>`).join('')}</dl>`;
}

function temperatureColor(value) {
    if (value < 20) return '#2563eb';
    if (value < 25) return '#06b6d4';
    if (value < 30) return '#22c55e';
    if (value < 35) return '#f59e0b';
    return '#dc2626';
}

function rainfallRadius(value) {
    return Math.max(6, Math.sqrt(value) * 2.4);
}

function aqiStyle(value) {
    if (value <= 50) return { label: 'Good', color: '#22c55e' };
    if (value <= 100) return { label: 'Moderate', color: '#eab308' };
    if (value <= 150) return { label: 'Unhealthy for sensitive groups', color: '#f97316' };
    return { label: 'Unhealthy', color: '#dc2626' };
}

function addLegend() {
    document.querySelector('#temperature-legend').innerHTML = `
        <div class="legend-title">Temperature (°C)</div>
        <div class="legend-row"><span class="legend-swatch" style="background:#2563eb"></span>Below 20</div>
        <div class="legend-row"><span class="legend-swatch" style="background:#06b6d4"></span>20–24</div>
        <div class="legend-row"><span class="legend-swatch" style="background:#22c55e"></span>25–29</div>
        <div class="legend-row"><span class="legend-swatch" style="background:#f59e0b"></span>30–34</div>
        <div class="legend-row"><span class="legend-swatch" style="background:#dc2626"></span>35 and above</div>`;
    document.querySelector('#rainfall-legend').innerHTML = `
        <div class="legend-title">Rainfall (mm) · circle size</div>
        <div class="legend-row"><span class="rainfall-symbol" style="width:12px;height:12px"></span>Low total</div>
        <div class="legend-row"><span class="rainfall-symbol" style="width:20px;height:20px"></span>Medium total</div>
        <div class="legend-row"><span class="rainfall-symbol" style="width:30px;height:30px"></span>High total</div>`;
    document.querySelector('#aqi-legend').innerHTML = `
        <div class="legend-title">Air quality index</div>
        <div class="legend-row"><span class="legend-swatch" style="background:#22c55e"></span>Good (0–50)</div>
        <div class="legend-row"><span class="legend-swatch" style="background:#eab308"></span>Moderate (51–100)</div>
        <div class="legend-row"><span class="legend-swatch" style="background:#f97316"></span>Sensitive groups (101–150)</div>
        <div class="legend-row"><span class="legend-swatch" style="background:#dc2626"></span>Unhealthy (151+)</div>`;
}

async function loadLayer(url, name, options) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Could not load ${url}`);
        const layer = L.geoJSON(await response.json(), options).addTo(map);
        overlays[name] = layer;
        layerControl.addOverlay(layer, name);
    } catch (error) {
        console.error(error);
    }
}

addLegend();

loadLayer('data/weather_stations.geojson', 'Weather stations · temperature', {
    pointToLayer: (feature, latlng) => L.circleMarker(latlng, {
        radius: 8, color: '#102a43', weight: 1.2,
        fillColor: temperatureColor(feature.properties.temperature), fillOpacity: .9
    }),
    onEachFeature: (feature, layer) => layer.bindPopup(popup(feature.properties.station, [
        ['Temperature', `${feature.properties.temperature} °C`], ['Rainfall', `${feature.properties.rainfall} mm`]
    ]))
});

loadLayer('data/rainfall_stations.geojson', 'Rainfall stations · proportional symbols', {
    pointToLayer: (feature, latlng) => L.circleMarker(latlng, {
        radius: rainfallRadius(feature.properties.rainfall), color: '#075985', weight: 2,
        fillColor: '#0ea5e9', fillOpacity: .48
    }),
    onEachFeature: (feature, layer) => layer.bindPopup(popup(feature.properties.station, [
        ['Rainfall total', `${feature.properties.rainfall} mm`], ['Period', feature.properties.period]
    ]))
});

loadLayer('data/air_quality.geojson', 'Air-quality stations', {
    pointToLayer: (feature, latlng) => {
        const aqi = aqiStyle(feature.properties.aqi);
        return L.circleMarker(latlng, { radius: 8, color: '#102a43', weight: 1.2, fillColor: aqi.color, fillOpacity: .9 });
    },
    onEachFeature: (feature, layer) => {
        const aqi = aqiStyle(feature.properties.aqi);
        layer.bindPopup(popup(feature.properties.station, [
            ['AQI', feature.properties.aqi], ['Status', aqi.label], ['PM2.5', `${feature.properties.pm25} µg/m³`]
        ]));
    }
});
