from app import app, db
from app.models import Event, Picture, Users, NotificationSubscribers


@app.shell_context_processor
def make_shell_context():
    return {'db': db, 'Event': Event, 'Picture': Picture, 'Users': Users,
            'NotificationSubscribers': NotificationSubscribers}
