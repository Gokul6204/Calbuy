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

    # Listen for messages from the company group
    async def broadcast_update(self, event):
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            "type": event["action_type"], # e.g., 'vendor_updated'
            "data": event["payload"],
            "sender": event.get("sender_id")
        }))

    @database_sync_to_async
    def get_user_company_id(self, user):
        # This logic should match your authentication/organization structure.
        # Fallback to a default if not found or if the schema hasn't been updated yet.
        # Once migration is done, this will return the actual user.company_id
        try:
            # Check if user has a profile with company_id, or direct field
            return getattr(user, 'company_id', 1) # Defaulting to 1 for demonstration
        except:
            return 1
