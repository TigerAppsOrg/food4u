from flask import Flask
from config import Config
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
# mail = Mail(app)
app.config.from_object(Config)
db = SQLAlchemy(app)
db.init_app(app)
migrate = Migrate(app, db)

from app import routes, models, scheduler
from app.helpers import delete_data
import datetime
from app import db
from app.models import Event
from app.routes import socket_io
from app.helpers import fetch_events
from flask_apscheduler import APScheduler as _BaseAPScheduler


class APScheduler(_BaseAPScheduler):
    def run_job(self, id, jobstore=None):
        with self.app.app_context():
            super().run_job(id=id, jobstore=jobstore)


scheduler_trash_markers = APScheduler()

scheduler_trash_markers = APScheduler()


def get_update():
    with app.app_context():
        time = datetime.datetime.utcnow()
        events = Event.query.all()
        db.session.commit()
        for event in events:
            if event.end_time is None or time > (event.end_time + datetime.timedelta(hours=1)):
                delete_data(event)
                events_dict = fetch_events()
                socket_io.emit('update', events_dict, broadcast=True)
                active_event_count = Event.query.count()
                socket_io.emit('active_event_count', active_event_count, broadcast=True)


scheduler_trash_markers.add_job("job_update", get_update, trigger="interval", seconds=20)
scheduler_trash_markers.init_app(app)
scheduler_trash_markers.start()
