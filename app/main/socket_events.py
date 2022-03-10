from app import socket_io
from app.main.helpers import fetch_events


@socket_io.on("update")
def fetch_events_emit():
    events = fetch_events()
    socket_io.emit("update", events, broadcast=False)

# @socket_io.on("get_attendees")
# def fetch_attendees_emit(event_id):
#     attendees = fetch_attendees(event_id)
#     socket_io.emit("get_attendees", attendees, broadcast=False)
