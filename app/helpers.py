from flask import url_for
import re
from app import app, db
from app.models import Event, Picture
from app.models import NotificationSubscribers
import cloudinary.uploader
import math
import datetime
import os
import cloudinary
from better_profanity import profanity as pf
from flask_mail import Mail, Message
from itsdangerous import URLSafeSerializer

app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 465
app.config['MAIL_USERNAME'] = 'food4uprinceton@gmail.com'
app.config['MAIL_PASSWORD'] = 'gjaiiorgfrfzhqey'
app.config['MAIL_USE_TLS'] = False
app.config['MAIL_USE_SSL'] = True
mail = Mail(app)


def unsubscribe_token(email):
    s = URLSafeSerializer(app.secret_key, salt='unsubscribe')
    token = s.dumps(email)
    return token


def send_feedback_email(netid, feedback):
    email_html_suffix = "<div id=bodyContent>"
    email_html_suffix += "<p><strong>Submitted by: <strong>" + str(netid) + "</strong></p>"
    email_html_suffix += "<p>" + str(feedback) + "</p>"
    email_html_suffix += "<p><strong>Thank you food 4 u team!"

    email_html = '<p style="color:#f58025;"><strong>food 4 u has new feedback!<strong></p>'
    email_html += email_html_suffix
    msg = Message(
        html=email_html,
        subject=("food 4 u: feedback"),
        sender="food4uprinceton@gmail.com",
        recipients="food4uprinceton@gmail.com".split()
    )
    mail.send(msg)


def send_notifications(event):
    email_html_suffix = '<p style="color:#f58025;"><strong>We have food 4 u! ' \
                        f"<a href='https://food4uprinceton.herokuapp.com/index/{event.id}'" \
                        f"target='_blank' rel='noopener noreferrer'>Click here" \
                        '</a> to see this live event\'s details! <strong></p>'
    email_html_suffix += "<h1><strong>" + str(event.title) + "<strong></h1>"
    email_html_suffix += "<div id=bodyContent>"
    email_html_suffix += "<p><strong>Posted by: <strong>" + str(event.net_id) + "</strong></p>"
    email_html_suffix += "<p><strong>Set for " + str(event.duration) + " minutes<strong></p>"
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
    email_html_suffix += '<a href="https://food4uprinceton.herokuapp.com/" style="color:#f58025;"' \
                         'target="_blank" rel="noopener noreferrer">https://food4uprinceton.herokuapp.com/</a></p>'

    notification_subscription_list = NotificationSubscribers.query.all()
    if notification_subscription_list is not None:
        for notification_subscription in notification_subscription_list:
            if notification_subscription.wants_email and legal_email(notification_subscription.email_address):
                email_html = f"Hi {notification_subscription.name}," + email_html_suffix
                secret_token = unsubscribe_token(notification_subscription.email_address)
                url_secret_token = 'https://food4uprinceton.herokuapp.com/unsubscribe/' + secret_token
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


def delete_data(event):
    delete_all_pics(event)
    db.session.delete(event)
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
    if len(pics) > 5:
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
                app.logger.info('%s file_to_upload', pic)
                upload_result = cloudinary.uploader.upload(pic)
                app.logger.info(upload_result)
                url_split = upload_result['url'].split(".")
                public_id = upload_result['public_id']
                url_split[-1] = "jpg"
                url = ".".join(url_split)
                name = pic.filename
                if created_event:
                    p = Picture(
                        event_id=Event.query.order_by(
                            Event.post_time.desc()).first().id,
                        event_picture=url, public_id=public_id, event=event, name=name)
                else:
                    p = Picture(
                        event_id=event.first().id,
                        event_picture=url, public_id=public_id, event=event.first(), name=name)
                db.session.add(p)
            else:
                return 2
        if not created_event:
            delete_specific_pics(event.first(), pics_to_delete)
    return 0


def set_color_get_time(event, poster=False):
    # set default color to green
    marker_color_address = url_for(
        'static', filename='images/green_logo_mini.png')
    if poster:
        marker_color_address = url_for(
            'static', filename='images/green_logo_poster_mini.png')
    # swap color to yellow, query event host
    time = datetime.datetime.utcnow()
    remaining_minutes = math.ceil(
        (event.end_time - time).total_seconds() / 60)
    remaining_minutes = max(remaining_minutes, 0)
    if (event.end_time - datetime.timedelta(minutes=10)) < time:
        marker_color_address = url_for(
            'static', filename='images/yellow_logo_mini.png')
        if poster:
            marker_color_address = url_for(
                'static', filename='images/green_logo_poster_mini.png')
        # swap color to red, prep for removal
    if event.end_time < time:
        marker_color_address = url_for(
            'static', filename='images/red_logo_mini.png')
        if poster:
            marker_color_address = url_for(
                'static', filename='images/green_logo_poster_mini.png')
    # remove if past event expiration date by considerable time
    if (event.end_time + datetime.timedelta(hours=1)) < time:
        return False, "", 0
    return True, marker_color_address, remaining_minutes


def legal_email(email_address):
    email_regex = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    return re.fullmatch(email_regex, email_address)


def legal_fields(title, building, room):
    if title == '' or building == '' or room == '':
        return True


def clean_html(raw_html):
    html_tags = re.findall('<.*?>', raw_html)
    return html_tags
