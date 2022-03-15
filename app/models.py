import datetime
from app import db


class Event(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    net_id = db.Column(db.String(20), index=True)
    post_time = db.Column(db.DateTime, index=True, default=datetime.datetime.utcnow())
    start_time = db.Column(db.DateTime, index=True, default=datetime.datetime.utcnow())
    end_time = db.Column(db.DateTime, index=True, default=(datetime.datetime.utcnow() + datetime.timedelta(minutes=60)))
    duration = db.Column(db.Integer, index=True, default=60)
    title = db.Column(db.String(100))
    building = db.Column(db.String(50))
    room = db.Column(db.String(50))
    latitude = db.Column(db.Float(5))
    longitude = db.Column(db.Float(5))
    description = db.Column(db.String(500))
    planning_to_go = db.Column(db.Integer, default=0)
    not_planning_to_go = db.Column(db.Integer, default=0)
    host_staying = db.Column(db.Boolean, default=None)
    sent_emails = db.Column(db.Boolean, default=False)

    def __repr__(self):
        return '<Event ID: {}>'.format(self.id)


class Picture(db.Model):
    event_id = db.Column(db.Integer, db.ForeignKey('event.id'))
    name = db.Column(db.String(1000))
    event_picture = db.Column(db.String(1000))
    public_id = db.Column(db.String(1000), primary_key=True)
    event = db.relationship('Event', backref=db.backref('pictures', cascade="all,delete", lazy='dynamic'))

    def __repr__(self):
        return '<Event ID: {}; Picture URL: {}>'.format(self.event_id, self.event_picture)

    __mapper_args__ = {
        'confirm_deleted_rows': False
    }


class Users(db.Model):
    net_id = db.Column(db.String(20), primary_key=True)
    posts_made = db.Column(db.Integer, default=0)
    events_going = db.Column(db.Integer, default=0)
    events_responded = db.Column(db.Integer, default=0)

    def __repr__(self):
        return '<User: {}>'.format(self.net_id)


class Attendees(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey('event.id'), primary_key=False)
    net_id = db.Column(db.String(20), primary_key=False)
    going = db.Column(db.Boolean, default=None)
    response_time = db.Column(db.DateTime, index=True, default=datetime.datetime.utcnow())
    wants_anon = db.Column(db.Boolean, default=False)

    def __repr__(self):
        return '<Attendee: {}>'.format(self.net_id)


class Comments(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey('event.id'), primary_key=False)
    net_id = db.Column(db.String(20), primary_key=False)
    comment = db.Column(db.String(500), primary_key=False)
    response_time = db.Column(db.DateTime, index=True, default=datetime.datetime.utcnow())
    wants_anon_but_op = db.Column(db.Boolean, default=False)
    wants_anon_to_all = db.Column(db.Boolean, default=False)

    def __repr__(self):
        return '<Comments: {}>'.format(self.comment)


class NotificationSubscribers(db.Model):
    net_id = db.Column(db.String(20), primary_key=True)
    name = db.Column(db.String(30))
    email_address = db.Column(db.String(30), default="")
    phone_number = db.Column(db.String(20), default="")
    wants_email = db.Column(db.Boolean, default=False)
    wants_text = db.Column(db.Boolean, default=False)

    def __repr__(self):
        return '<Notification Subscriber: {}>'.format(self.net_id)
