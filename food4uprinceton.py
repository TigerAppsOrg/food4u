from app import app, db
from app.models import Event, Picture, FirstTime, NotificationSubscribers


@app.shell_context_processor
def make_shell_context():
    return {'db': db, 'Event': Event, 'Picture': Picture, 'FirstTime': FirstTime,
            'NotificationSubscribers': NotificationSubscribers}
