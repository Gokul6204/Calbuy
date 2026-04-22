import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

class MultiTenantUpdateConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        
        # For development flexibility, we allow anonymous connections 
        # and default to company_id 1 if the user isn't logged in yet.
        self.company_id = await self.get_user_company_id(self.user)
        
        if not self.company_id:
            self.company_id = 1
            
        self.group_name = f"company_{self.company_id}"

        # Join company group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            # Leave company group
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )

    # Listen for messages from the company Group
    async def broadcast_update(self, event):
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            "type": event["action_type"], # e.g., 'vendor_updated'
            "data": event["payload"],
            "sender": event.get("sender_id")
        }))

    @database_sync_to_async
    def get_user_company_id(self, user):
        if user and user.is_authenticated:
            try:
                org = user.profile.organization_name
                if org:
                    import re
                    return re.sub(r'[^a-zA-Z0-9_]', '_', str(org)).lower()
            except:
                pass
            return str(user.id)
        return "default"
