from flask import Blueprint

main = Blueprint('main', __name__, static_folder='static', template_folder='templates', static_url_path='/main')

from . import routes, helpers, socket_events
