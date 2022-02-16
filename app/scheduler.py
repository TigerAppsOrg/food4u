from extensions import scheduler_trash_markers
from app.helpers import delete_data
import datetime
from app import db
from app import app
from app.models import Event
from app.routes import socket_io


def get_update():
    with app.app_context():
        time = datetime.datetime.utcnow()
        events = Event.query.all()
        db.session.commit()
        for event in events:
            if event.end_time is None or time > (event.end_time + datetime.timedelta(hours=1)):
                delete_data(event)
                socket_io.emit('client_update', broadcast=True)
                active_event_count = Event.query.count()
                socket_io.emit('active_event_count', active_event_count, broadcast=True)


scheduler_trash_markers.add_job("job_update", get_update, trigger="interval", seconds=20)
