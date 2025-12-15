"""Security utilities for URL validation and SSRF protection."""
import socket
import ipaddress
from urllib.parse import urlparse
from typing import Tuple


def is_safe_url(url: str) -> Tuple[bool, str]:
    """
    Validate URL to prevent SSRF attacks.
    
    Returns:
        Tuple of (is_safe, error_message)
    """
    try:
        parsed = urlparse(url)

        # Only allow HTTP/HTTPS
        if parsed.scheme not in ('http', 'https'):
            return False, f"Invalid protocol: {parsed.scheme}. Only HTTP/HTTPS allowed."

        # Must have a hostname
        if not parsed.hostname:
            return False, "Invalid URL: no hostname found."

        # Resolve hostname to IP
        try:
            ip = socket.gethostbyname(parsed.hostname)
        except socket.gaierror:
            return False, f"Cannot resolve hostname: {parsed.hostname}"

        # Check if IP is private/reserved
        try:
            ip_obj = ipaddress.ip_address(ip)

            # Block private networks
            if ip_obj.is_private:
                return False, f"Blocked private IP address: {ip}"

            # Block loopback
            if ip_obj.is_loopback:
                return False, f"Blocked loopback address: {ip}"

            # Block link-local
            if ip_obj.is_link_local:
                return False, f"Blocked link-local address: {ip}"

            # Block multicast
            if ip_obj.is_multicast:
                return False, f"Blocked multicast address: {ip}"

            # Block reserved
            if ip_obj.is_reserved:
                return False, f"Blocked reserved address: {ip}"

        except ValueError:
            return False, f"Invalid IP address: {ip}"

        return True, ""

    except Exception as e:
        return False, f"URL validation error: {str(e)}"
