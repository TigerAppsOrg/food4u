from app import socket_io, db
from app.main.helpers import fetch_events
from app.models import Attendees
from app.main.casclient import CasClient


@socket_io.on("update")
def fetch_events_emit():
    events = fetch_events()
    socket_io.emit("update", events, broadcast=True)


@socket_io.on("set_anon_attendance")
def set_user_attendance_anon(wants_anon_and_event_id):
    # username = "ben"
    username = CasClient().authenticate()
    username = username.lower().strip()

    user_wants_anon = wants_anon_and_event_id["wants_anon"]
    event_id = wants_anon_and_event_id["event_id"]

    attendee = db.session.query(Attendees).filter(Attendees.net_id == username,
                                                  Attendees.event_id == int(
                                                      event_id)).first()
    if attendee is not None:
        attendee.wants_anon = user_wants_anon
        db.session.commit()
    else:
        attendee = Attendees(event_id=event_id, net_id=username,
                             wants_anon=user_wants_anon)
        db.session.add(attendee)
        db.session.commit()

    socket_io.emit("update_anon_attendance", broadcast=True)
