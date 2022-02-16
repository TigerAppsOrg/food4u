from app.helpers import delete_data, fetch_events, fetch_active_events_count
import datetime
from app import db
from app.models import Event
from app.routes import socket_io
from extensions import scheduler_trash_markers


def get_update():
    time = datetime.datetime.utcnow()
    events = Event.query.all()
    db.session.commit()
    for event in events:
        if event.end_time is None or time > (event.end_time + datetime.timedelta(hours=1)):
            delete_data(event)


scheduler_trash_markers.add_job("job_update", get_update, trigger="interval", seconds=20)
