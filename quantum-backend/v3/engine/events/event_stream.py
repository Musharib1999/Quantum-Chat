"""
Quantum Guru V4 - EventStream Pub/Sub Backbone
Asynchronous event stream for action dispatching, observation streaming, and memory subscriber integration.
"""
import asyncio
from typing import List, Callable, Dict, Any, Optional
from .event_models import Event

SubscriberCallable = Callable[[Event], Any]

class EventStream:
    """
    Central event stream bus for Quantum Guru V4.
    Decouples Agent actions from Runtime execution and Memory persistence.
    """
    def __init__(self):
        self._history: List[Event] = []
        self._subscribers: List[SubscriberCallable] = []

    def subscribe(self, callback: SubscriberCallable) -> None:
        """Register a subscriber callback (sync or async)."""
        if callback not in self._subscribers:
            self._subscribers.append(callback)

    def unsubscribe(self, callback: SubscriberCallable) -> None:
        """Remove a subscriber."""
        if callback in self._subscribers:
            self._subscribers.remove(callback)

    async def publish(self, event: Event) -> Event:
        """
        Append event to immutable history and broadcast to all active subscribers.
        """
        self._history.append(event)
        
        for sub in self._subscribers:
            try:
                if asyncio.iscoroutinefunction(sub):
                    await sub(event)
                else:
                    sub(event)
            except Exception as e:
                print(f"[EventStream Warning] Error in subscriber {sub}: {e}")
                
        return event

    def get_history(self, project_id: Optional[str] = None, limit: Optional[int] = None) -> List[Event]:
        """Retrieve chronological event history, optionally filtered by project_id."""
        events = self._history
        if project_id:
            events = [e for e in events if e.project_id == project_id]
        if limit:
            events = events[-limit:]
        return events

    def clear(self, project_id: Optional[str] = None) -> None:
        """Clear all events or events for a specific project."""
        if project_id:
            self._history = [e for e in self._history if e.project_id != project_id]
        else:
            self._history.clear()

# Global EventStream singleton
global_event_stream = EventStream()
