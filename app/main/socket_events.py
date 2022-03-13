from .. import socket_io
from app.main.helpers import fetch_events


@socket_io.on("update")
def fetch_events_emit():
    events = fetch_events()
    socket_io.emit("update", events, broadcast=True)
