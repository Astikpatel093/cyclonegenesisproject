import { useEffect } from 'react';
import { CircleMarker, Polyline, Tooltip, useMap } from 'react-leaflet';
import type { PredictionResult } from '../../types/prediction';

function distanceKm(from: {lat: number; lon: number}, to: {lat: number; lon: number}) {
  const rad = Math.PI / 180;
  const a = Math.sin((to.lat - from.lat) * rad / 2) ** 2 + Math.cos(from.lat * rad) * Math.cos(to.lat * rad) * Math.sin((to.lon - from.lon) * rad / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, a)));
}

export function TrackComparison({ prediction, origin }: { prediction: PredictionResult; origin: [number, number] }) {
  const map = useMap();
  const actual = prediction.verification;
  const forecast = prediction.forecastPoints.find(p => p.forecastHour === 24);
  const track = prediction.actualTrack ?? [];
  const boundsKey = JSON.stringify([origin, actual && [actual.lat, actual.lon], forecast && [forecast.lat, forecast.lon], ...track.map(p => [p.lat, p.lon])]);
  useEffect(() => {
    const points = JSON.parse(boundsKey).filter(Boolean) as [number, number][];
    if (points.length > 1) map.fitBounds(points, { padding: [55, 55], maxZoom: 7, animate: false });
  }, [boundsKey, map]);
  if (!actual || !forecast) return null;
  const errorKm = distanceKm(forecast, actual);
  const travelKm = track.reduce((sum, point, index) => index ? sum + distanceKm(track[index - 1], point) : sum, 0);
  const completeWindow = track.length > 1 && Date.parse(track[0].timestamp) === Date.parse(prediction.predictionTime)
    && Date.parse(track[track.length - 1].timestamp) === Date.parse(actual.timestamp);
  const errorPercent = completeWindow && travelKm > 0.001 ? errorKm / travelKm * 100 : null;
  return <>
    {track.length > 1 && <Polyline positions={track.map(p => [p.lat, p.lon])} pathOptions={{ color: '#16a34a', weight: 4 }}>
      <Tooltip>Actual recorded track after issue time · IBTrACS</Tooltip>
    </Polyline>}
    <Polyline positions={[[forecast.lat, forecast.lon], [actual.lat, actual.lon]]} pathOptions={{ color: '#a855f7', weight: 2, dashArray: '3 5' }}>
      <Tooltip permanent>
        Position error: {errorKm.toFixed(1)} km<br />
        {errorPercent === null ? 'Percentage unavailable: incomplete or stationary track' : `${errorPercent.toFixed(1)}% of actual 24h travel (${travelKm.toFixed(1)} km)`}
      </Tooltip>
    </Polyline>
    <CircleMarker center={[actual.lat, actual.lon]} radius={7} pathOptions={{ color: '#15803d', fillColor: '#22c55e', fillOpacity: 1 }}>
      <Tooltip permanent direction="bottom">Actual +24h: {actual.wind.toFixed(1)} kt · Wind error: {Math.abs(forecast.predictedWind - actual.wind).toFixed(1)} kt</Tooltip>
    </CircleMarker>
  </>;
}
