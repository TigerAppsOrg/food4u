from .. import socket_io
from flask_socketio import emit
from app.main.helpers import fetch_events


@socket_io.on("update")
def fetch_events_emit():
    events = fetch_events()
    emit("update", events, broadcast=True)
