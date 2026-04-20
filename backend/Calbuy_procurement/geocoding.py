import requests
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

def get_geocode(address, city, state, country):
    """
    Combines address parts and calls Google Maps Geocoding API.
    Returns (latitude, longitude) or raises ValueError on failure.
    """
    api_key = getattr(settings, 'GOOGLE_MAPS_API_KEY', None)
    if not api_key:
        raise ValueError("Google Maps API Key is not configured in backend settings.")

    full_address = f"{address}, {city}, {state}, {country}"
    url = f"https://maps.googleapis.com/maps/api/geocode/json?address={full_address}&key={api_key}"

    try:
        response = requests.get(url, timeout=10)
        data = response.json()

        if data['status'] == 'OK':
            location = data['results'][0]['geometry']['location']
            return location['lat'], location['lng']
        elif data['status'] == 'ZERO_RESULTS':
            raise ValueError(f"Could not find coordinates for address: {full_address}")
        else:
            error_message = data.get('error_message', data['status'])
            logger.error(f"Geocoding API error: {error_message}")
            raise ValueError(f"Geocoding failed: {error_message}")

    except requests.exceptions.RequestException as e:
        logger.error(f"Geocoding request failed: {str(e)}")
        raise ValueError(f"Geocoding service unavailable: {str(e)}")

def get_road_distance_km(lat1, lon1, lat2, lon2):
    """
    Computes road distance between two coordinates using Google Maps Distance Matrix API.
    Returns distance in kilometers.
    """
    api_key = getattr(settings, 'GOOGLE_MAPS_API_KEY', None)
    if not api_key:
        return None

    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return None

    # Origin and Destination in lat,lng format
    origins = f"{lat1},{lon1}"
    destinations = f"{lat2},{lon2}"
    url = f"https://maps.googleapis.com/maps/api/distancematrix/json?origins={origins}&destinations={destinations}&key={api_key}"

    try:
        response = requests.get(url, timeout=10)
        data = response.json()

        if data['status'] == 'OK':
            element = data['rows'][0]['elements'][0]
            if element['status'] == 'OK':
                # Google returns distance in meters, convert to km
                distance_meters = element['distance']['value']
                return round(distance_meters / 1000.0, 2)
            else:
                logger.warning(f"Distance Matrix element status not OK: {element['status']}")
        else:
            logger.error(f"Distance Matrix API status not OK: {data['status']}")
            
    except Exception as e:
        logger.error(f"Failed to fetch road distance: {str(e)}")
    
    return None

import math

def calculate_linear_distance_km(lat1, lon1, lat2, lon2):
    """
    Fallback: Calculate the great circle distance in kilometers using Haversine formula.
    """
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return None
        
    lon1, lat1, lon2, lat2 = map(math.radians, [float(lon1), float(lat1), float(lon2), float(lat2)])

    dlon = lon2 - lon1 
    dlat = lat2 - lat1 
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a)) 
    r = 6371 # Radius of earth in kilometers
    return round(c * r, 2)

def calculate_distance_km(lat1, lon1, lat2, lon2):
    """
    Primary distance calculator: Attempts road distance first, falls back to linear.
    """
    # 1. Try exact road distance (API call)
    road_dist = get_road_distance_km(lat1, lon1, lat2, lon2)
    if road_dist is not None:
        return road_dist
        
    # 2. Fallback to 100% reliable but less accurate linear distance
    logger.info("Falling back to linear distance calculation.")
    return calculate_linear_distance_km(lat1, lon1, lat2, lon2)

