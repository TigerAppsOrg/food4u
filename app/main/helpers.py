import datetime
import math
import os
import pytz
import re

import cloudinary
import cloudinary.uploader
from better_profanity import profanity as pf
from flask_mail import Message
from itsdangerous import URLSafeSerializer

from app import mail, db, socket_io
from app.models import Event, Picture, NotificationSubscribers, Attendees, Comments
from . import main


def unsubscribe_token(email):
    s = URLSafeSerializer(os.environ.get('SECRET_KEY'), salt='unsubscribe')
    token = s.dumps(email)
    return token


def send_feedback_email(netid, feedback):
    email_html_suffix = "<div id=bodyContent>"
    email_html_suffix += "<p><strong>Submitted by: <strong>" + str(netid) + "</strong></p>"
    email_html_suffix += "<p>" + str(feedback) + "</p>"
    email_html_suffix += "<p><strong>Thank you, food 4 u team!<strong><p></div>"

    email_html = '<p style="color:#f58025;"><strong>food 4 u has new feedback!<strong></p>'
    email_html += email_html_suffix
    msg = Message(
        html=email_html,
        subject=("food 4 u: feedback"),
        sender="food4uprinceton@gmail.com",
        recipients=["ambuck@princeton.edu", "shannon.heh@princeton.edu", "ntyp@princeton.edu", "bychan@princeton.edu"]
    )
    mail.send(msg)


def send_flag_email(flagger_netid, op_netid, event):
    email_html_suffix = "<div id=bodyContent>"
    email_html_suffix += "<p><strong>Flagged by: <strong>" + str(flagger_netid) + "</strong></p>"
    email_html_suffix += '</div>'

    email_html = '<p style="color:#f58025;"><strong>' \
                 'Your free food event has been flagged to have 10 minutes remaining!' \
                 '<strong></p>'
    email_html += '<p style="color:#f58025;"><strong> ' \
                  f"<a href='https://food4u.tigerapps.org/index/{event.id}'" \
                  f"target='_blank' rel='noopener noreferrer'>Click here" \
                  '</a> to see this your live event\'s details and to extend it if it\'s still ' \
                  'ongoing! <strong></p>'
    email_html += email_html_suffix
    msg = Message(
        html=email_html,
        subject=("food 4 u: Your Event Was Flagged by Another User"),
        sender="food4uprinceton@gmail.com",
        recipients=[op_netid + "@princeton.edu"]
    )
    mail.send(msg)


def send_comment_email(event, comment, commenter):
    email_html_suffix = "<div id=bodyContent>"
    email_html_suffix += "<p><strong>Commented by: <strong>" + str(commenter) + "</strong></p>"
    email_html_suffix += '</div>'

    email_html = '<p style="color:#f58025;"><strong>' \
                 'Your free food event has been received a comment:</p>' \
                 '<br><br>' \
                 + comment + \
                 '<br>' + \
                 '<strong>'
    email_html += '<p style="color:#f58025;"><strong> ' \
                  f"<a href='https://food4u.tigerapps.org/index/{event.id}'" \
                  f"target='_blank' rel='noopener noreferrer'>Click here" \
                  '</a> to see this your live event\'s comments.' \
                  '<strong></p>'
    email_html += email_html_suffix
    msg = Message(
        html=email_html,
        subject=("food 4 u: Your Event Has Received a Comment"),
        sender="food4uprinceton@gmail.com",
        recipients=[event.net_id + "@princeton.edu"]
    )
    mail.send(msg)


def send_notifications(event):
    email_html_suffix = '<p style="color:#f58025;"><strong>We have food 4 u! ' \
                        f"<a href='https://food4u.tigerapps.org/index/{event.id}'" \
                        f"target='_blank' rel='noopener noreferrer'>Click here" \
                        '</a> to see this live event\'s details! <strong></p>'
    email_html_suffix += "<h1><strong>" + str(event.title) + "<strong></h1>"
    email_html_suffix += "<div id=bodyContent>"
    email_html_suffix += "<p><strong>Posted by: <strong>" + str(event.net_id) + "</strong></p>"
    email_html_suffix += "<p><strong>Set for " + str(get_event_remaining_minutes(event)) + " minutes<strong></p>"
    email_html_suffix += "<p><strong>at Building: " + str(event.building) + "<strong><p>" + "<p><strong>in Room: " \
                         + str(event.room) \
                         + "<strong></p>"
    email_html_suffix += ("<p><strong>Description: " + str(event.description) + "<strong></p>") if (
            str(event.description) != "N/A") else ""
    pictures = event.pictures.all()
    for picture in pictures:
        email_html_suffix += '<img src="' + str(picture.event_picture).replace('http://',
                                                                               'https://') + '" style="width:100%;' \
                                                                                             'max-width:300px" ><br>'
    email_html_suffix += "<p><strong>Thank you for being awesome!<strong></p>"
    email_html_suffix += "<p>Sincerely,</p>"
    email_html_suffix += '<p style="color:#f58025;"><strong>The food 4 u Team<strong><br>'
    email_html_suffix += '<a href="https://food4u.tigerapps.org/" style="color:#f58025;"' \
                         'target="_blank" rel="noopener noreferrer">https://food4u.tigerapps.org/</a></p>'

    notification_subscription_list = NotificationSubscribers.query.all()
    if notification_subscription_list is not None:
        for notification_subscription in notification_subscription_list:
            if notification_subscription.wants_email and legal_email(notification_subscription.email_address):
                email_html = f"Hi {notification_subscription.name}," + email_html_suffix
                secret_token = unsubscribe_token(notification_subscription.email_address)
                url_secret_token = 'https://food4u.tigerapps.org/unsubscribe/' + secret_token
                email_html += '<br><a href={0} target="_blank" rel="noopener noreferrer">Unsubscribe</a>'.format(
                    url_secret_token)
                msg = Message(
                    html=email_html,
                    subject=("food 4 u: " + event.title),
                    sender="food4uprinceton@gmail.com",
                    recipients=[notification_subscription.email_address]
                )
                mail.send(msg)


def delete_specific_pics(event, pics_to_delete):
    event_pictures = event.pictures.all()
    if event_pictures and pics_to_delete:
        for pic_to_be_deleted in pics_to_delete:
            public_id = pic_to_be_deleted.split('/')[-1].split('.')[0]
            picture_query = db.session.query(Picture).filter(Picture.public_id == public_id)
            picture = picture_query.first()
            if picture is not None:
                db.session.delete(picture)
                db.session.commit()
                cloudinary.config(
                    cloud_name=os.getenv('CLOUD_NAME'),
                    api_key=os.getenv('API_KEY'),
                    api_secret=os.getenv('API_SECRET'))
                result = cloudinary.uploader.destroy(picture.public_id, invalidate=False)


def delete_all_pics(event):
    event_expired_pictures = event.pictures.all()
    if event_expired_pictures:
        for pic_to_be_deleted in event_expired_pictures:
            db.session.delete(pic_to_be_deleted)
            db.session.commit()
            cloudinary.config(
                cloud_name=os.getenv('CLOUD_NAME'),
                api_key=os.getenv('API_KEY'),
                api_secret=os.getenv('API_SECRET'))
            result = cloudinary.uploader.destroy(pic_to_be_deleted.public_id, invalidate=True)


def delete_all_going(event):
    event_id = event.id
    people_going = Attendees.query.filter_by(
        event_id=event_id).all()
    if people_going:
        for people in people_going:
            db.session.delete(people)
    db.session.commit()


def delete_all_comments(event):
    event_id = event.id
    event_comments = Comments.query.filter_by(
        event_id=event_id).all()
    if event_comments:
        for comment in event_comments:
            db.session.delete(comment)
    db.session.commit()


def legal_title(title):
    if len(title) > 100:
        return "", "", 2
    for word in title.split():
        if len(word) > 20:
            return "", "", 1
    urlTitle = re.findall(
        'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\(\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+',
        title)
    return title, urlTitle, 0


def legal_location(location):
    if len(location) > 50:
        return "", "", 2
    for word in location.split():
        if len(word) > 20:
            return "", "", 1
    urlLocation = re.findall(
        'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\(\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+',
        location)
    return location, urlLocation, 0


def legal_duration(duration):
    try:
        duration = int(duration)
    except ValueError:
        return "", 2
    if duration < 5 or duration > 180:
        return duration, 1
    return duration, 0


def legal_description(desc, urlTitle="", urlBuilding="", urlRoom="", title="", building="", room=""):
    if len(desc) > 500:
        return "", "", 2
    urlDescription = re.findall(
        'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\(\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+',
        desc)
    if urlTitle or urlBuilding or urlRoom or urlDescription:
        return desc, 1
    if pf.contains_profanity(title) or pf.contains_profanity(building) or pf.contains_profanity(room) \
            or pf.contains_profanity(desc):
        return desc, 2
    for word in desc.split():
        if len(word) > 20:
            return desc, 3
    if clean_html(title) or clean_html(building) or clean_html(room) \
            or clean_html(desc):
        return desc, 4
    return desc, 0


def legal_comment(comment):
    if comment == "":
        message = "Your comment submission is empty. Please submit a comment with one " \
                  "or more characters."
        return message, 400
    if len(comment) > 500:
        message = "Length of comment is greater than 500 characters. Please shorten it."
        return message, 400
    if pf.contains_profanity(comment):
        message = "Your comment contains profanity. Please change it before submitting."
        return message, 400
    if clean_html(comment):
        message = "Your comment contains html tags. Please change it before submitting."
        return message, 400
    return "You have successfully submitted your comment!", 200


def legal_lat_lng(latitude, longitude):
    # Coordinates error handling
    try:
        float(latitude)
        float(longitude)
    except ValueError:
        return 1
    if latitude == '' or longitude == '':
        return 2
    if float(latitude) < 40.33 or float(latitude) > 40.357:
        return 3
    if float(longitude) < -74.67855 or float(longitude) > -74.628:
        return 4
    return 0


# Picture error handling
def handle_and_edit_pics(pics, event, created_event, pics_to_delete=None):
    if created_event:
        event_id = Event.query.order_by(
            Event.post_time.desc()).first().id
        if len(pics) + Picture.query.filter_by(
                event_id=event_id).count() > 5:
            return 1
    else:
        event_id = event.first().id
        if len(pics) + Picture.query.filter_by(
                event_id=event_id).count() > 5:
            return 1

    ALLOWED_EXTENSIONS_LOWER = {'png', 'jpg', 'jpeg', 'heic'}

    def allowed_file_lower(filename):
        return '.' in filename and filename.rsplit(
            '.', 1)[1].lower() in ALLOWED_EXTENSIONS_LOWER

    if (not pics or not any(f for f in pics)) and not pics_to_delete:
        pass
    else:
        cloudinary.config(
            cloud_name=os.getenv('CLOUD_NAME'),
            api_key=os.getenv('API_KEY'),
            api_secret=os.getenv('API_SECRET'))
        for pic in pics:
            if pic and allowed_file_lower(pic.filename):
                upload_result = cloudinary.uploader.upload(pic)
                url_split = upload_result['url'].split(".")
                public_id = upload_result['public_id']
                url_split[-1] = "jpg"
                url = ".".join(url_split)
                name = pic.filename
                if created_event:
                    p = Picture(
                        event_id=event_id,
                        event_picture=url, public_id=public_id, event=event, name=name)
                else:
                    p = Picture(
                        event_id=event_id,
                        event_picture=url, public_id=public_id, event=event.first(), name=name)
                db.session.add(p)
            else:
                return 2
        if not created_event:
            delete_specific_pics(event.first(), pics_to_delete)
    return 0


def set_color_get_time(event):
    if not event:
        return False, "", 0
    # set default color to green
    marker_color = "green"
    # swap color to yellow, query event host
    time = datetime.datetime.utcnow()
    remaining_minutes = math.ceil(
        (event.end_time - time).total_seconds() / 60)
    remaining_minutes = max(remaining_minutes, 0)
    if is_start_time_more_than_utc_now(event.start_time):
        return True, "orange", remaining_minutes
    if (event.end_time - datetime.timedelta(minutes=10)) < time:
        marker_color = "yellow"
        # swap color to red, prep for removal
    if event.end_time < time:
        marker_color = "red"
    # remove if past event expiration date by considerable time
    if (event.end_time + datetime.timedelta(hours=1)) < time:
        return False, "", 0
    return True, marker_color, remaining_minutes


def legal_email(email_address):
    email_regex = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    return re.fullmatch(email_regex, email_address)


def legal_fields(title, building, room):
    if title == '' or building == '' or room == '':
        return True


def clean_html(raw_html):
    html_tags = re.findall('<.*?>', raw_html)
    return html_tags


def get_attendance(event):
    number_of_people_going = event.planning_to_go
    try:
        going_percentage = round(number_of_people_going / (number_of_people_going + event.not_planning_to_go) * 100)
    except ZeroDivisionError:
        going_percentage = 0
    is_host_there = event.host_staying
    if is_host_there is None:
        host_message = "No response"
    elif is_host_there:
        host_message = "Yes"
    else:
        host_message = "No"
    return number_of_people_going, going_percentage, host_message


def get_number_of_comments(event):
    comments_for_event = db.session.query(Comments).filter(Comments.event_id == event.id).all()
    return len(comments_for_event)


def fetch_events():
    events_dict_list = []
    events = db.session.query(Event).order_by(
        Event.start_time.desc())
    db.session.commit()
    for event in events:

        ongoing, marker_color, remaining_minutes = set_color_get_time(
            event)

        if not ongoing:
            continue

        pictures = event.pictures.all()
        db.session.commit()
        pictureList = [[picture.event_picture, picture.name] for picture in pictures]
        number_of_people_going, going_percentage, host_message = get_attendance(event)
        number_of_comments = get_number_of_comments(event)

        events_dict_list.append(
            {'title': event.title, 'building': event.building,
             'room': event.room,
             'latitude': event.latitude,
             'longitude': event.longitude,
             'description': event.description,
             'pictures': pictureList,
             'icon': marker_color,
             'remaining': remaining_minutes,
             'id': event.id,
             'net_id': event.net_id.lower().strip(),
             'post_time': event.post_time.isoformat(),
             'start_time': event.start_time.isoformat(),
             'start_time_est_string': get_est_time_string_from_utc_dt(event.start_time),
             'end_time': event.end_time.isoformat(),
             'people_going': number_of_people_going,
             'going_percentage': going_percentage,
             'host_message': host_message,
             'number_of_comments': number_of_comments,
             })
    return events_dict_list


def delete_data(event):
    delete_all_pics(event)
    delete_all_going(event)
    delete_all_comments(event)
    db.session.delete(event)
    db.session.commit()
    active_event_count = fetch_active_events_count()
    socket_io.emit('active_event_count', active_event_count, broadcast=True)


def fetch_active_events_count():
    active_events_count = Event.query.count()
    return active_events_count


def fetch_attendees(event):
    attendees_desc_time_query = db.session.query(Attendees).filter(Attendees.event_id == event.id,
                                                                   Attendees.going).order_by(
        Attendees.response_time.asc())
    return attendees_desc_time_query.all()


def fetch_comments(event):
    comments_desc_time_query = db.session.query(Comments).filter(Comments.event_id == event.id
                                                                 ).order_by(
        Comments.response_time.asc())
    return comments_desc_time_query.all()


def is_dst(zonename):
    tz = pytz.timezone(zonename)
    now = pytz.utc.localize(datetime.datetime.utcnow())
    return now.astimezone(tz).dst() != datetime.timedelta(0)


def get_utc_start_time_from_est_time_string(later_date_string):
    local = pytz.timezone("America/New_York")
    naive = datetime.datetime.strptime(later_date_string, '%m/%d/%Y %H:%M %p')
    local_dt = local.localize(naive, is_dst=is_dst("America/New_York"))
    start_time = local_dt.astimezone(pytz.utc)
    return start_time


@main.app_template_global()
def get_est_time_string_from_utc_dt(utc_dt):
    local_dt = utc_dt.replace(tzinfo=pytz.utc).astimezone(tz=pytz.timezone("America/New_York"))
    local_dt_string = local_dt.strftime('%b %d, %Y, %I:%M %p')
    return local_dt_string


def is_start_time_more_than_utc_now(start_time_utc_dt):
    datetime_now = datetime.datetime.utcnow()
    return start_time_utc_dt > datetime_now


def get_event_remaining_minutes(event):
    return math.ceil((event.end_time - event.start_time).total_seconds() / 60)
