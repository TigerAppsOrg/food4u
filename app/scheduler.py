from extensions import scheduler_trash_markers
from app.helpers import delete_data
import datetime
from app import db
from app.models import Event
from app.routes import socket_io
from app.helpers import fetch_events


def update_data():
    time = datetime.datetime.utcnow()
    events = Event.query.all()
    db.session.commit()
    for event in events:
        if event.end_time is None or time > (event.end_time + datetime.timedelta(hours=1)):
            delete_data(event)
            events_dict = fetch_events()
            socket_io.emit('update', events_dict, broadcast=True)


scheduler_trash_markers.add_job("job_update", update_data, trigger="interval", seconds=20)
