from extensions import scheduler_trash_markers
from app.helpers import delete_data
import datetime
from app import db
from app.models import Event
from app.helpers import fetch_active_events_count

from app.routes import socket_io


def update_data():
    time = datetime.datetime.utcnow()
    events = Event.query.all()
    db.session.commit()
    for event in events:
        if event.end_time is None or time > (event.end_time + datetime.timedelta(hours=1)):
            delete_data(event)
            active_event_count = fetch_active_events_count()
            socket_io.emit('active_event_count', active_event_count, broadcast=True)


scheduler_trash_markers.add_job("job_update", update_data, trigger="interval", seconds=20)
