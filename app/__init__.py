from flask_socketio import SocketIO
from flask_sqlalchemy import SQLAlchemy
from flask_mail import Mail

# Globally accessible libraries
db = SQLAlchemy()
socket_io = SocketIO()
mail = Mail()


def create_app():
    from flask import Flask
    app = Flask(__name__)
    from config import Config
    app.config.from_object(Config)

    from flask_cors import CORS
    CORS(app)

    db.init_app(app)
    socket_io.init_app(app)
    mail.init_app(app)

    from flask_migrate import Migrate
    migrate = Migrate()
    migrate.init_app(app, db)
    register_scheduler(app)

    with app.app_context():
        from .main import main as main_blueprint
        app.register_blueprint(main_blueprint, url_prefix="")

        return app


def register_scheduler(app):
    from flask_apscheduler import APScheduler
    scheduler = APScheduler()

    import datetime
    from app import db
    from app.models import Event

    def update():
        pass
        with app.app_context():
            from .main.helpers import delete_data, send_notifications
            current_time = datetime.datetime.utcnow()
            events = Event.query.all()
            db.session.commit()
            for event in events:
                # delete attendee, pic data associated with old events
                if event.end_time is None or current_time > (event.end_time + datetime.timedelta(hours=1)):
                    delete_data(event)
                    continue
                # send notifications for events scheduled for later
                if current_time > event.start_time and (not event.sent_emails or event.sent_emails is None):
                    send_notifications(event)
                    event.sent_emails = True
                    db.session.commit()

    # scheduler.add_job("job_update", update, trigger="interval", seconds=20)
    scheduler.init_app(app)
    scheduler.start()
