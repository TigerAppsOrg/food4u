from flask import Flask
from config import Config
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS

# from flask_mail import Mail

app = Flask(__name__)
CORS(app)
# mail = Mail(app)
app.config.from_object(Config)
db = SQLAlchemy(app)
db.init_app(app)
migrate = Migrate(app, db)

from app import routes, models, scheduler
from app.scheduler import scheduler_trash_markers

scheduler_trash_markers.init_app(app)
scheduler_trash_markers.start()
