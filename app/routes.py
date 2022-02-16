from flask import render_template, request, make_response, jsonify
import json
import datetime
from app.casclient import CasClient
from app.helpers import legal_title, set_color_get_time, delete_all_pics, delete_all_going
from app.helpers import legal_location, legal_duration, send_notifications
from app.helpers import legal_description, legal_lat_lng, handle_and_edit_pics
from app.helpers import legal_email, legal_fields, send_feedback_email, send_flag_email, \
    get_attendance, fetch_events, fetch_active_events_count
from flask import redirect, flash, url_for
from flask_socketio import SocketIO
from app import app, db
from app.models import Event, Picture, Users, NotificationSubscribers, Attendees
from itsdangerous import URLSafeSerializer, BadData
from sqlalchemy.sql import functions

socket_io = SocketIO(app)


@app.route('/feedbackSubmissionForm', methods=['POST'])
def send_feedback():
    # username = "ben"
    # username = username.lower().strip()
    username = CasClient().authenticate()
    username = username.lower().strip()

    is_illegal = 0
    feedback, is_illegal = legal_description(request.form['feedback'])

    if is_illegal == 1:
        flash("Feedback contains URLs. Please fix errors and submit again.", "error")
        return redirect(url_for('index'))
    if is_illegal == 2:
        flash(
            "Feedback contains profanity. Please fix errors and submit again.", "error")
        return redirect(url_for('index'))
    if is_illegal == 3:
        flash(
            "Feedback has word longer than 20 characters. Please fix errors and submit again.", "error")
        return redirect(url_for('index'))

    send_feedback_email(username, feedback)
    flash("Feedback has been successfully submitted. food 4 u appreciates your input!")
    return redirect(url_for('index'))


@app.route('/manageNotificationSubscriptions', methods=['POST'])
def manage_notification_subscriptions():
    # username = "ben"
    # username = username.lower().strip()
    username = CasClient().authenticate()
    username = username.lower().strip()

    name = request.form['name'].strip()
    name, is_illegal = legal_description(name)

    if is_illegal == 1:
        message = "Name contains URLs. Please fix errors and submit again."
        return jsonify(message=message), 400
    if is_illegal == 2:
        message = "Name contains profanity. Please fix errors and submit again."
        return jsonify(message=message), 400
    if is_illegal == 3:
        message = "Name has word longer than 20 characters. Please fix errors and submit again."
        return jsonify(message=message), 400
    wants_text = False
    wants_email = False

    email_address = request.form['emailAddress'].strip()
    if request.form.getlist('emailSwitch'):
        wants_email = True

    # dev work for text functionality, if budget provided, can integrate quickly with SMS
    """ phone_number = request.form['phoneNumber'].replace("-","").replace(".","").replace("(","").replace(")","")
    text_subscription = request.form.getlist('textSwitch')
    regex_number = r'\b[0-9+]+\b'
    if text_subscription and not re.fullmatch(regex_number, phone_number):
        flash(
            "Please enter a valid phone number. We want to make sure we can share the free food!")
        return redirect(url_for('index'))

    if text_subscription:
        wants_text = True """
    phone_number = ""  # because text is not yet implemented

    subscriber_search = NotificationSubscribers.query.filter_by(net_id=username).first()
    if subscriber_search is None:
        if wants_email:
            if not legal_email(email_address):
                message = "Please enter a valid email address. We want to make sure we can share the free food!"
                return jsonify(message=message), 400
        subscriber = NotificationSubscribers(
            net_id=username,
            name=name,
            email_address=email_address,
            wants_email=wants_email,
            phone_number=phone_number,
            wants_text=wants_text)
        db.session.add(subscriber)
        db.session.commit()
        if wants_email:
            message = "You have subscribed to email notifications from food 4 u!"
            socket_io.emit('subscribe', 1, broadcast=True)
            return jsonify(message=message), 200
        else:
            message = "Please move the switch to the right to subscribe to email notifications from food 4 u!"
            return jsonify(message=message), 400
    else:
        subscriber_search = db.session.query(NotificationSubscribers).filter(NotificationSubscribers.net_id
                                                                             == username)
        subscriber_search.update(
            {"name": name,
             "email_address": email_address,
             "wants_email": wants_email,
             "phone_number": phone_number,
             "wants_text": wants_text},
            synchronize_session=False)
        db.session.commit()
        if wants_email:
            message = "You have subscribed to email notifications from food 4 u!"
            socket_io.emit('subscribe', 1, broadcast=True)
            return jsonify(message=message), 200
        else:
            message = "You have unsubscribed from email notifications from food 4 u!"
            socket_io.emit('subscribe', -1, broadcast=True)
            return jsonify(message=message), 200


@app.route('/unsubscribe/<token>', methods=['GET'])
def unsubscribe_token(token):
    CasClient().authenticate()

    s = URLSafeSerializer(app.secret_key, salt='unsubscribe')

    try:
        email = s.loads(token)
    except BadData:
        flash("Error: bad data encountered!", "error")
        return redirect(url_for('index'))

    subscriber = NotificationSubscribers.query.filter_by(email_address=email).first()
    if not subscriber.wants_email:
        flash("You have successfully unsubscribed from email notifications from food 4 u!", "success")
        socket_io.emit('subscribe', -1, broadcast=True)
        return redirect(url_for('index'))
    else:
        subscriber_search = db.session.query(NotificationSubscribers).filter(NotificationSubscribers.email_address
                                                                             == email)
        subscriber_search.update(
            {"email_address": email,
             "wants_email": False,
             "wants_text": False},
            synchronize_session=False)
        db.session.commit()

    flash("You have successfully unsubscribed from email notifications from food 4 u!", "success")
    socket_io.emit('subscribe', -1, broadcast=True)
    return redirect(url_for('index'))


@app.route('/', methods=['GET'])
@app.route('/index', methods=['GET'])
@app.route('/index/<event_id>', methods=['GET'])
def index(event_id=None):
    # username = "ben"
    # username = username.lower().strip()
    username = CasClient().authenticate()
    username = username.lower().strip()
    check_first_time = False

    if Users.query.filter_by(net_id=username).first() is None:
        check_first_time = True
        first_time_user = Users(net_id=username)
        db.session.add(first_time_user)
        db.session.commit()
        socket_io.emit('uniqueVisitor', 1, broadcast=True)
    events_dict_list = []
    events = Event.query.all()
    db.session.commit()
    for event in events:
        ongoing, marker_color, remaining_minutes = set_color_get_time(
            event)
        if not ongoing:
            continue
        pictures = event.pictures.all()
        db.session.commit()
        pictureList = [[picture.event_picture, picture.name] for picture in pictures]
        events_dict_list.append(
            {'title': event.title, 'building': event.building,
             'room': event.room,
             'latitude': event.latitude, 'longitude': event.longitude,
             'description': event.description,
             'pictures': pictureList,
             'icon': marker_color,
             'remaining': remaining_minutes,
             'id': event.id,
             'net_id': event.net_id.lower().strip(),
             'end_time': event.end_time.isoformat(),
             'username': username})
    subscribers_count = NotificationSubscribers.query.filter_by(
        wants_email=True).count()
    active_events_count = fetch_active_events_count()
    unique_visitors_count = db.session.query(Users.net_id).count()
    posts_all_time_count = db.session.query(functions.sum(Users.posts_made)).scalar()
    if not event_id:
        html = render_template(
            "index.html", events=json.dumps(events_dict_list),
            username=username, check_first_time=check_first_time,
            deeplinkEventID=None, subscribers_count=subscribers_count, unique_visitors_count=unique_visitors_count,
            posts_all_time_count=posts_all_time_count, active_events_count=active_events_count)
    elif Event.query.filter_by(id=event_id).first() is None:
        flash("The free food event has already ended.", "error")
        html = render_template(
            "index.html", events=json.dumps(events_dict_list),
            username=username, check_first_time=check_first_time,
            deeplinkEventID=None, subscribers_count=subscribers_count, unique_visitors_count=unique_visitors_count,
            posts_all_time_count=posts_all_time_count, active_events_count=active_events_count)
    else:
        html = render_template(
            "index.html", events=json.dumps(events_dict_list),
            username=username, check_first_time=check_first_time,
            deeplinkEventID=event_id, subscribers_count=subscribers_count, unique_visitors_count=unique_visitors_count,
            posts_all_time_count=posts_all_time_count, active_events_count=active_events_count)
    response = make_response(html)
    return response


@app.route('/fetchNotificationPreferences', methods=['GET'])
def fetch_notification_preferences():
    # username = "ben"
    # username = username.lower().strip()
    username = CasClient().authenticate()
    username = username.lower().strip()

    notifications_dict = {}
    notification_preferences = NotificationSubscribers.query.filter_by(net_id=username).first()
    if request.content_type:
        if request.content_type.startswith('application/json'):
            if notification_preferences is not None:
                notifications_dict = {'name': notification_preferences.name,
                                      'wantsEmail': notification_preferences.wants_email,
                                      'emailAddress': notification_preferences.email_address,
                                      'wantsText': notification_preferences.wants_text,
                                      'phoneNumber': notification_preferences.phone_number}
                return jsonify(notifications_dict)
            return jsonify(notifications_dict)


@app.route('/handleGoing', methods=['POST'])
def going_to_event():
    # username = "ben"
    # username = username.lower().strip()
    username = CasClient().authenticate()
    username = username.lower().strip()

    switch_on = request.form.getlist('goingSwitch')
    going_event_id = request.form['idForGoing']

    going_event_search = Event.query.filter_by(id=going_event_id)
    user_search = db.session.query(Users).filter(Users.net_id == username)

    is_event = going_event_search.first()
    # is_user = user_search.first()

    if is_event is None:
        message = "Your event has not been found. It may have been already deleted."
        return jsonify(message=message), 400

    # if not the op
    if username != is_event.net_id:
        attendee_search = Attendees.query.filter(Attendees.event_id == going_event_id).filter(
            Attendees.net_id == username)
        is_attendee = attendee_search.first()
        # if not on attendees list
        if is_attendee is None:
            # is going
            if switch_on:
                attendee = Attendees(event_id=going_event_id, net_id=username, going=True)
                db.session.add(attendee)
                user_search.update(
                    {"events_going": Users.events_going + 1,
                     "events_responded": Users.events_responded + 1},
                    synchronize_session=False)
                going_event_search.update({"planning_to_go": Event.planning_to_go + 1}, synchronize_session=False)
                db.session.commit()
                message = "You successfully responded that you are going to this event!"
                events_dict = fetch_events()
                socket_io.emit('update', events_dict, broadcast=True)
                return jsonify(message=message), 200
            else:
                # is not
                attendee = Attendees(event_id=going_event_id, net_id=username, going=False)
                db.session.add(attendee)
                user_search.update(
                    {"events_responded": Users.events_responded + 1},
                    synchronize_session=False)
                going_event_search.update({"not_planning_to_go": Event.not_planning_to_go + 1},
                                          synchronize_session=False)
                db.session.commit()
                message = "You successfully responded that you are not going to this event!"
                events_dict = fetch_events()
                socket_io.emit('update', events_dict, broadcast=True)
                return jsonify(message=message), 200
        else:
            # If already on attendees list
            if switch_on and is_attendee.going:
                message = "You already responded that you were going to this event!"
                return jsonify(message=message), 400
            elif switch_on and not is_attendee.going:
                attendee_search.update({"going": True}, synchronize_session=False)
                user_search.update(
                    {"events_going": Users.events_going + 1},
                    synchronize_session=False)
                going_event_search.update({"not_planning_to_go": Event.not_planning_to_go - 1,
                                           "planning_to_go": Event.planning_to_go + 1},
                                          synchronize_session=False)
                db.session.commit()
                message = "You successfully responded that you are going to this event!"
                events_dict = fetch_events()
                socket_io.emit('update', events_dict, broadcast=True)
                return jsonify(message=message), 200
            elif not switch_on and not is_attendee.going:
                message = "You already responded that you were not going to this event!"
                return jsonify(message=message), 400
            else:
                # not switch and going
                attendee_search.update({"going": False}, synchronize_session=False)
                user_search.update(
                    {"events_going": Users.events_going - 1},
                    synchronize_session=False)
                going_event_search.update({"not_planning_to_go": Event.not_planning_to_go + 1,
                                           "planning_to_go": Event.planning_to_go - 1},
                                          synchronize_session=False)
                db.session.commit()
                message = "You successfully responded that you are not going to this event!"
                events_dict = fetch_events()
                socket_io.emit('update', events_dict, broadcast=True)
                return jsonify(message=message), 200

    # if original poster
    if username == is_event.net_id:
        attendee_search = Attendees.query.filter(Attendees.event_id == going_event_id).filter(
            Attendees.net_id == username)
        is_attendee = attendee_search.first()
        # if not on attendees list
        if is_attendee is None:
            # is going
            if switch_on:
                attendee = Attendees(event_id=going_event_id, net_id=username, going=True)
                db.session.add(attendee)
                going_event_search.update({"host_staying": True},
                                          synchronize_session=False)
                user_search.update(
                    {"events_going": Users.events_going + 1,
                     "events_responded": Users.events_responded + 1},
                    synchronize_session=False)
                going_event_search.update({"planning_to_go": Event.planning_to_go + 1}, synchronize_session=False)
                db.session.commit()
                message = "You successfully responded that you are staying at your event!"
                events_dict = fetch_events()
                socket_io.emit('update', events_dict, broadcast=True)
                return jsonify(message=message), 200
            else:
                # is not
                attendee = Attendees(event_id=going_event_id, net_id=username, going=False)
                db.session.add(attendee)
                going_event_search.update({"host_staying": False,
                                           "not_planning_to_go": Event.not_planning_to_go + 1},
                                          synchronize_session=False)
                user_search.update(
                    {"events_responded": Users.events_responded + 1},
                    synchronize_session=False)
                db.session.commit()
                message = "You successfully responded that you are not staying at your event!"
                events_dict = fetch_events()
                socket_io.emit('update', events_dict, broadcast=True)
                return jsonify(message=message), 200
        else:
            # If already on attendees list
            if switch_on and is_attendee.going:
                message = "You already responded that you are staying at your event!"
                return jsonify(message=message), 400
            elif switch_on and not is_attendee.going:
                attendee_search.update({"going": True}, synchronize_session=False)
                user_search.update(
                    {"events_going": Users.events_going + 1},
                    synchronize_session=False)
                going_event_search.update({"not_planning_to_go": Event.not_planning_to_go - 1,
                                           "planning_to_go": Event.planning_to_go + 1,
                                           "host_staying": True},
                                          synchronize_session=False)
                db.session.commit()
                message = "You successfully responded that you are staying at your event!"
                events_dict = fetch_events()
                socket_io.emit('update', events_dict, broadcast=True)
                return jsonify(message=message), 200
            elif not switch_on and not is_attendee.going:
                message = "You already responded that you are not staying at your event!"
                return jsonify(message=message), 400
            else:
                # not switch and going
                attendee_search.update({"going": False}, synchronize_session=False)
                user_search.update(
                    {"events_going": Users.events_going - 1},
                    synchronize_session=False)
                going_event_search.update({"not_planning_to_go": Event.not_planning_to_go + 1,
                                           "planning_to_go": Event.planning_to_go - 1,
                                           "host_staying": False},
                                          synchronize_session=False)
                db.session.commit()
                message = "You successfully responded that you are not staying at your event!"
                events_dict = fetch_events()
                socket_io.emit('update', events_dict, broadcast=True)
                return jsonify(message=message), 200


@app.route('/handleEventDelete', methods=['POST'])
def delete_event():
    # username = "ben"
    # username = username.lower().strip()
    username = CasClient().authenticate()
    username = username.lower().strip()

    deleted_event_id = request.form['idForDeletion']
    deleted_event = Event.query.filter_by(id=deleted_event_id).first()

    if deleted_event is None:
        message = "Your event has not been found. It may have been already deleted."
        return jsonify(message=message), 400

    if username != deleted_event.net_id:
        message = "Deletions must be from the original poster. Please contact them to delete the event."
        return jsonify(message=message),

    delete_data(deleted_event)
    message = "Your event has been successfully deleted."
    user_search = db.session.query(Users).filter(Users.net_id == username)
    user_search.update(
        {"posts_made": Users.posts_made - 1},
        synchronize_session=False)
    socket_io.emit('postIncrement', -1, broadcast=True)
    # socket_io.emit('fetchEvents', fetch_events(), broadcast=True)
    user_search.update(
        {"posts_made": Users.posts_made - 1},
        synchronize_session=False)
    events_dict = fetch_events()
    active_event_count = fetch_active_events_count()
    socket_io.emit('update', events_dict, broadcast=True)
    socket_io.emit('active_event_count', active_event_count, broadcast=True)
    return jsonify(message=message), 200


@app.route('/handleEventExtend', methods=['POST'])
def extend_event():
    # username = "ben"
    # username = username.lower().strip()
    username = CasClient().authenticate()
    username = username.lower().strip()

    extension_duration = int(request.form['durationOfExtension'])
    if extension_duration < 5 or extension_duration > 180:
        message = "Submission contains unsupported time duration. " \
                  "Please fix input a number of minutes between 5 and 180 and submit again."
        return jsonify(message=message), 400

    extended_event_id = request.form['idForExtension']
    extended_event = Event.query.filter_by(id=extended_event_id).first()

    if extended_event is None:
        message = "Your event has not been found. It may have been already deleted."
        return jsonify(message=message), 400

    ongoing, marker_color, remaining_minutes = set_color_get_time(extended_event)

    if remaining_minutes + extension_duration > 180:
        message = "Your event's total time cannot exceed 3 hours."
        return jsonify(message=message), 400

    if username != extended_event.net_id:
        message = "Extensions must be from the original poster. Please contact them to extend the event."
        return jsonify(message=message), 400

    # ensures that expired events extend for the extension duration specified
    if extended_event.end_time < datetime.datetime.utcnow():
        db.session.query(Event).filter(Event.id == extended_event_id).update(
            {Event.end_time: datetime.datetime.utcnow() + datetime.timedelta(minutes=extension_duration)})
    else:
        db.session.query(Event).filter(Event.id == extended_event_id).update(
            {Event.end_time: Event.end_time + datetime.timedelta(minutes=extension_duration)})

    db.session.commit()

    events_dict = fetch_events()
    socket_io.emit('update', events_dict, broadcast=True)
    message = "Your event has been successfully extended."
    return jsonify(message=message), 200


# if longer than 10 minutes are left in flagged event, reduces time left to 10 minutes in db


@app.route('/handleEventFlag', methods=['POST'])
def flag_event():
    # username = "ben"
    # username = username.lower().strip()
    username = CasClient().authenticate()
    username = username.lower().strip()

    flagged_event_id = request.form['idForFlagging']
    flagged_event = Event.query.filter_by(id=flagged_event_id).first()

    if flagged_event is None:
        message = "The event has not been found. It may have been already deleted."
        return jsonify(message=message), 400

    ongoing, marker_color, remaining_minutes = set_color_get_time(flagged_event)

    if remaining_minutes <= 10:
        message = "The event is already less than 10 minutes."
        return jsonify(message=message), 400

    if username == flagged_event.net_id:
        message = "Flags must be from not the original poster. Please use the edit form to decrease time " \
                  "to 10 minutes if you wish to do so."
        return jsonify(message=message), 400

    db.session.query(Event).filter(Event.id == flagged_event_id).update(
        {Event.end_time: datetime.datetime.utcnow() + datetime.timedelta(minutes=10)})
    db.session.commit()

    send_flag_email(username, flagged_event.net_id, flagged_event)
    message = "The event has been successfully flagged and reduced to 10 minutes."
    events_dict = fetch_events()
    socket_io.emit('update', events_dict, broadcast=True)
    return jsonify(message=message), 200


@app.route('/handleDataEdit', methods=['POST'])
def handle_data_edit():
    # username = "ben"
    # username = username.lower().strip()
    username = CasClient().authenticate()
    username = username.lower().strip()

    if legal_fields(request.form['title'], request.form['location_building'], request.form['location_room']):
        message = "Please complete the required form fields and submit again."
        return jsonify(message=message), 400

    try:
        edited_event_id = request.form['eventId']
    except Exception as e:
        message = "There is no associated event id with the edit form. Please reload the food 4 u web page" \
                  "and try again."
        return jsonify(message=message), 400

    title, urlTitle, is_illegal = legal_title(request.form['title'])
    if is_illegal == 1:
        message = "Title has word longer than 20 characters. Please fix errors and submit again."
        return jsonify(message=message), 400
    if is_illegal == 2:
        message = "Title is longer than 100 characters. Please fix errors and submit again."
        return jsonify(message=message), 400

    building, urlBuilding, is_illegal = legal_location(
        request.form['location_building'])
    if is_illegal == 1:
        message = "Building has word longer than 50 characters. Please fix errors and submit again."
        return jsonify(message=message), 400
    if is_illegal == 2:
        message = "Building is longer than 50 characters. Please fix errors and submit again."
        return jsonify(message=message), 400

    room, urlRoom, is_illegal = legal_location(
        request.form['location_room'])
    if is_illegal == 1:
        message = "Room has word longer than 50 characters. Please fix errors and submit again."
        return jsonify(message=message), 400
    if is_illegal == 2:
        message = "Room is longer than 50 characters. Please fix errors and submit again."
        return jsonify(message=message), 400

    desc, is_illegal = legal_description(request.form['description'],
                                         urlTitle, urlBuilding, urlRoom, title, building, room)
    if is_illegal == 1:
        message = "Submission contains URLs. Please fix errors and submit again."
        return jsonify(message=message), 400
    if is_illegal == 2:
        message = "Submission contains profanity. Please fix errors and submit again."
        return jsonify(message=message), 400
    if is_illegal == 3:
        message = "Description has word longer than 20 characters. Please fix errors and submit again."
        return jsonify(message=message), 400
    if is_illegal == 4:
        message = "Submission contains html tags. Please fix errors and submit again."
        return jsonify(message=message), 400
    desc = "N/A" if (desc == '') else desc

    latitude = request.form['lat']
    longitude = request.form['lng']
    is_illegal = legal_lat_lng(latitude, longitude)
    if is_illegal == 1:
        message = "Submitted coordinates are not valid. Please fix errors and submit again."
        return jsonify(message=message), 400
    if is_illegal == 2:
        message = "No coordinates were submitted. Please fix errors and submit again."
        return jsonify(message=message), 400
    if is_illegal == 3:
        message = "Coordinates were not on Princeton campus. Please fix errors and submit again."
        return jsonify(message=message), 400
    if is_illegal == 4:
        message = "Coordinates were not on Princeton campus. Please fix errors and submit again."
        return jsonify(message=message), 400

    duration, is_illegal = legal_duration(request.form['time-left'])
    if is_illegal == 2:
        message = "Submission contains wrong type of time duration. Please submit an integer for the" \
                  "time duration."
        return jsonify(message=message), 400
    if is_illegal == 1:
        message = "Submission contains unsupported time duration. " \
                  "Please fix input a number of minutes between 5 and 180 and submit again."
        return jsonify(message=message), 400

    end_time = datetime.datetime.utcnow() + datetime.timedelta(minutes=duration)

    edited_event = db.session.query(Event).filter(Event.id == edited_event_id)

    if edited_event.first() is None:
        message = "Event has not been found. It may have been already deleted."
        return jsonify(message=message), 400

    if username != edited_event.first().net_id:
        message = "Edits must be from the original poster. Please contact them to edit the event."
        return jsonify(message=message), 400
    edited_event.update(
        {"title": title,
         "building": building,
         "room": room,
         "description": desc,
         "longitude": longitude,
         "latitude": latitude,
         "end_time": end_time},
        synchronize_session=False)
    pics = request.files.to_dict().values()
    result = request.form["pic_URLs_for_deletion"]
    pics_to_delete = None if result == '' else json.loads(result)
    create = False
    is_illegal = handle_and_edit_pics(pics, edited_event, create, pics_to_delete=pics_to_delete)
    if is_illegal == 1:
        message = "More than 5 photos submitted. Please upload 5 or fewer images and submit again."
        return jsonify(message=message), 400
    if is_illegal == 2:
        message = "An unsupported file type was submitted. " \
                  "Please upload an image or images with file type 'png', 'jpg', 'jpeg', or 'heic' and submit again."
        return jsonify(message=message), 400
    db.session.commit()
    events_dict = fetch_events()
    socket_io.emit('update', events_dict, broadcast=True)
    return jsonify(success=True)


@app.route('/handleFormData', methods=['POST'])
def handle_data():
    # username = "ben"
    # username = username.lower().strip()
    username = CasClient().authenticate()
    username = username.lower().strip()

    if legal_fields(request.form['title'], request.form['location_building'], request.form['location_room']):
        message = "Please complete the required form fields and submit again."
        return jsonify(message=message), 400

    title, urlTitle, is_illegal = legal_title(request.form['title'])
    if is_illegal == 1:
        message = "Title has word longer than 20 characters. Please fix errors and submit again."
        return jsonify(message=message), 400
    if is_illegal == 2:
        message = "Title is longer than 100 characters. Please fix errors and submit again."
        return jsonify(message=message), 400
    building, urlBuilding, is_illegal = legal_location(
        request.form['location_building'])
    if is_illegal == 1:
        message = "Building has word longer than 50 characters. Please fix errors and submit again."
        return jsonify(message=message), 400
    if is_illegal == 2:
        message = "Building is longer than 50 characters. Please fix errors and submit again."
        return jsonify(message=message), 400
    room, urlRoom, is_illegal = legal_location(
        request.form['location_room'])
    if is_illegal == 1:
        message = "Room has word longer than 50 characters. Please fix errors and submit again."
        return jsonify(message=message), 400
    if is_illegal == 2:
        message = "Room is longer than 50 characters. Please fix errors and submit again."
        return jsonify(message=message), 400

    duration, is_illegal = legal_duration(request.form['time-left'])
    if is_illegal == 2:
        message = "Submission contains wrong type of time duration. Please submit an integer for the" \
                  "time duration."
        return jsonify(message=message), 400
    if is_illegal == 1:
        message = "Submission contains unsupported time duration. " \
                  "Please fix input a number of minutes between 5 and 180 and submit again."
        return jsonify(message=message), 400

    post_time = datetime.datetime.utcnow()
    end_time = post_time + datetime.timedelta(minutes=duration)
    desc, is_illegal = legal_description(request.form['description'],
                                         urlTitle, urlBuilding, urlRoom, title, building, room)
    if is_illegal == 1:
        message = "Submission contains URLs. Please fix errors and submit again."
        return jsonify(message=message), 400
    if is_illegal == 2:
        message = "Submission contains profanity. Please fix errors and submit again."
        return jsonify(message=message), 400
    if is_illegal == 3:
        message = "Description has word longer than 20 characters. Please fix errors and submit again."
        return jsonify(message=message), 400
    if is_illegal == 4:
        message = "Submission contains html tags. Please fix errors and submit again."
        return jsonify(message=message), 400
    desc = "N/A" if (desc == '') else desc

    latitude = request.form['lat']
    longitude = request.form['lng']
    is_illegal = legal_lat_lng(latitude, longitude)
    if is_illegal == 1:
        message = "Submitted coordinates are not valid. Please fix errors and submit again."
        return jsonify(message=message), 400
    if is_illegal == 2:
        message = "No coordinates were submitted. Please fix errors and submit again."
        return jsonify(message=message), 400
    if is_illegal == 3:
        message = "Coordinates were not on Princeton campus. Please fix errors and submit again."
        return jsonify(message=message), 400
    if is_illegal == 4:
        message = "Coordinates were not on Princeton campus. Please fix errors and submit again."
        return jsonify(message=message), 400

    e = Event(
        net_id=username.lower().strip(),
        post_time=post_time,
        start_time=post_time, title=title, building=building,
        room=room,
        latitude=latitude, longitude=longitude,
        description=desc,
        end_time=end_time, duration=duration)
    db.session.add(e)
    pics = request.files.to_dict().values()
    create = True
    is_illegal = handle_and_edit_pics(pics, e, create)
    if is_illegal == 1:
        message = "There are more than 5 photos submitted. Please edit to have 5 or fewer images or submit again."
        return jsonify(message=message), 400
    if is_illegal == 2:
        message = "An unsupported file type was submitted. " \
                  "Please upload an image or images with file type 'png', 'jpg', 'jpeg', or 'heic' and submit again."
        return jsonify(message=message), 400
    user_search = db.session.query(Users).filter(Users.net_id == username)
    user_search.update(
        {"posts_made": Users.posts_made + 1},
        synchronize_session=False)
    socket_io.emit('postIncrement', 1, broadcast=True)
    db.session.commit()
    send_notifications(e)
    events_dict = fetch_events()
    active_event_count = fetch_active_events_count()
    socket_io.emit('update', events_dict, broadcast=True)
    socket_io.emit('active_event_count', active_event_count, broadcast=True)
    return jsonify(success=True)


@app.route('/show_data', methods=['GET'])
def show_data():
    username = CasClient().authenticate()
    username = username.lower().strip()

    authorized_users = ["bychan", "ambuck", "daphnegb"]

    if username not in authorized_users:
        return redirect(url_for('index'))

    events = Event.query.all()
    pictures = Picture.query.all()
    notifications = NotificationSubscribers.query.all()
    return render_template(
        "show_data.html", events=events, pictures=pictures, notifications=notifications)


@app.route('/get_infowindow_poster', methods=['GET'])
def get_infowindow_poster():
    CasClient().authenticate()

    event_id = request.args.get('event_id')
    event = Event.query.filter_by(id=event_id).first()
    ongoing, marker_color, remaining_minutes = set_color_get_time(
        event)
    number_of_people_going, going_percentage, is_host_there = get_attendance(event)

    html = render_template(
        "infowindow_poster.html", event=event, event_remaining_minutes=remaining_minutes,
        number_of_people_going=number_of_people_going, going_percentage=going_percentage,
        is_host_there=is_host_there
    )
    response = make_response(html)
    return response


@app.route('/get_infowindow_consumer', methods=['GET'])
def get_infowindow_consumer():
    CasClient().authenticate()

    event_id = request.args.get('event_id')
    event = Event.query.filter_by(id=event_id).first()
    ongoing, marker_color, remaining_minutes = set_color_get_time(
        event)
    number_of_people_going, going_percentage, is_host_there = get_attendance(event)

    html = render_template(
        "infowindow_consumer.html", event=event, event_remaining_minutes=remaining_minutes,
        number_of_people_going=number_of_people_going, going_percentage=going_percentage,
        is_host_there=is_host_there)
    response = make_response(html)
    return response


@app.route('/logout', methods=['GET'])
def logout():
    cas_client = CasClient()
    cas_client.authenticate()
    cas_client.logout('index')


@socket_io.on("update")
def fetch_events_emit():
    events = fetch_events()
    socket_io.emit("update", events, broadcast=False)


# @socket_io.on("get_attendees")
# def fetch_attendees_emit(event_id):
#     attendees = fetch_attendees(event_id)
#     socket_io.emit("get_attendees", attendees, broadcast=False)


def delete_data(event):
    delete_all_pics(event)
    delete_all_going(event)
    db.session.delete(event)
    db.session.commit()
    events_dict = fetch_events()
    print('event_dict', events_dict)
    socket_io.emit('update', events_dict, broadcast=True)
    active_event_count = fetch_active_events_count()
    print('count', active_event_count)
    socket_io.emit('active_event_count', active_event_count, broadcast=True)