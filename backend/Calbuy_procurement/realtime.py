from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

def broadcast_company_event(company_id, action_type, payload, sender_id=None):
    """
    Broadcasts an event to all connected users in a company organization.
    Safe-wrapped to ensure failed broadcast doesn't block primary DB actions.
    """
    try:
        channel_layer = get_channel_layer()
        if not channel_layer: return
        
        async_to_sync(channel_layer.group_send)(
            f"company_{company_id}",
            {
                "type": "broadcast_update",
                "action_type": action_type,
                "payload": payload,
                "sender_id": sender_id
            }
        )
    except Exception as e:
        print(f"⚠️ Real-time broadcast failed: {e}")
