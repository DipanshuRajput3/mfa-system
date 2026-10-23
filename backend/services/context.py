"""Login context used for risk scoring: client IP, device fingerprint and country"""
import hashlib
import ipaddress
import logging
from typing import Optional

import httpx
from fastapi import Request

logger = logging.getLogger(__name__)

def get_client_ip(request: Request) -> str:
    """Get real client IP (works behind proxies like Render)"""
    forwarded = request.headers.get('x-forwarded-for')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.client.host if request.client else 'unknown'

def get_device_fingerprint(request: Request) -> str:
    """Create device fingerprint from user agent, language and platform headers"""
    parts = [
        request.headers.get('user-agent', ''),
        request.headers.get('accept-language', ''),
        request.headers.get('sec-ch-ua-platform', ''),
    ]
    return hashlib.sha256('|'.join(parts).encode()).hexdigest()[:16]

async def get_country(ip_address: str) -> Optional[str]:
    """Look up ISO country code for a public IP; None on private IP or lookup failure"""
    try:
        if not ipaddress.ip_address(ip_address).is_global:
            return None
    except ValueError:
        return None

    try:
        async with httpx.AsyncClient(timeout=3) as http:
            response = await http.get(
                f"http://ip-api.com/json/{ip_address}",
                params={'fields': 'countryCode'}
            )
            response.raise_for_status()
            return response.json().get('countryCode') or None
    except (httpx.HTTPError, ValueError) as e:
        logger.warning(f"Geolocation lookup failed for {ip_address}: {e}")
        return None
