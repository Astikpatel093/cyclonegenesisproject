"""North Indian Ocean normalization. No wind-averaging conversion is implied."""
from datetime import datetime, timezone, timedelta
import math

IST = timezone(timedelta(hours=5, minutes=30))

def sub_region(latitude, longitude):
    try:
        lat, lon = float(latitude), float(longitude)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(lat) or not math.isfinite(lon) or not (5 <= lat <= 26 and 50 <= lon <= 99):
        return None
    return 'Arabian Sea' if lon < 77 else 'Bay of Bengal'

def wind_knots(value, unit='kt'):
    if value is None:
        return None
    value = float(value)
    if not math.isfinite(value) or value < 0:
        return None
    factors = {'kt':1, 'knots':1, 'mph':1/1.150779448, 'km/h':1/1.852, 'm/s':1.943844492}
    if unit not in factors:
        raise ValueError('Unsupported wind unit')
    return value * factors[unit]

def imd_classification(wind):
    if wind is None or not math.isfinite(wind) or wind < 0:
        return 'Unavailable'
    return next(label for limit,label in [(120,'Super Cyclonic Storm'),(90,'Extremely Severe Cyclonic Storm'),(64,'Very Severe Cyclonic Storm'),(48,'Severe Cyclonic Storm'),(34,'Cyclonic Storm'),(28,'Deep Depression'),(17,'Depression'),(0,'Low Pressure Area')] if wind >= limit)

def normalized_storm(storm, satellite_img_url=None):
    p=storm['currentPosition']
    region=sub_region(p['lat'],p['lon'])
    if region is None:
        return None
    wind=wind_knots(p.get('windSpeed'))
    observed=datetime.fromisoformat(p['timestamp'].replace('Z','+00:00'))
    if observed.tzinfo is None:
        raise ValueError('Observation timestamp requires timezone')
    return {'storm_name':storm['name'],'sub_region':region,'imd_classification':imd_classification(wind),
            'wind_knots':wind,'pressure_hpa':p.get('pressure'),'latitude':p['lat'],'longitude':p['lon'],
            'satellite_img_url':satellite_img_url,'last_observed_ist':observed.astimezone(IST).isoformat()}
