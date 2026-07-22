/* ═══════════════════════════════════════════════════════
   GPS MODULE
   - Captura lat/lng al generar cada ticket
   - Guarda en ticket.geo (solo visible para admin)
   - Precisión reportada en metadatos
═══════════════════════════════════════════════════════ */

let lastGeoPosition = null;

function captureGPS() {
  return new Promise(resolve => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      pos => {
        lastGeoPosition = {
          lat:       parseFloat(pos.coords.latitude.toFixed(6)),
          lng:       parseFloat(pos.coords.longitude.toFixed(6)),
          accuracy:  Math.round(pos.coords.accuracy),
          capturedAt: new Date().toISOString(),
        };
        resolve(lastGeoPosition);
      },
      () => resolve(null),   // permission denied or unavailable → silent fail
      { timeout: 4000, maximumAge: 30000, enableHighAccuracy: true }
    );
  });
}

function geoMapsURL(geo) {
  if (!geo?.lat) return null;
  return `https://maps.google.com/?q=${geo.lat},${geo.lng}`;
}

