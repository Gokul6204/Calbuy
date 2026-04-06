"""
ASGI config for Calbuy_procurement project.
"""

import os
import django
from django.core.asgi import get_asgi_application

# Set up django before importing consumers or routing
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "Calbuy_procurement.settings")
django.setup()

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator
from .routing import websocket_urlpatterns

from django.conf import settings

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            websocket_urlpatterns
        )
    ),
})
