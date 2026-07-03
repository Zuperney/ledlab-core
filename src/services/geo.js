// services/geo.js — captura de localização (GPS) para o check-in das Diárias.
// OPCIONAL e tolerante a falha: sem permissão/hardware/tempo, resolve null e o
// check-in acontece mesmo assim (ver docs/diarias-spec.md §6 e §10).

export function getPosition({ timeout = 12000, maxAge = 60000 } = {}) {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({
        lat: +p.coords.latitude.toFixed(6),
        lng: +p.coords.longitude.toFixed(6),
        acc: Math.round(p.coords.accuracy || 0),
      }),
      () => resolve(null), // permissão negada / indisponível / timeout → segue sem local
      { enableHighAccuracy: true, timeout, maximumAge: maxAge }
    );
  });
}

// link pro mapa a partir de {lat,lng} (null se não houver coordenada)
export const mapsUrl = (loc) =>
  loc && loc.lat != null ? `https://www.google.com/maps?q=${loc.lat},${loc.lng}` : null;
