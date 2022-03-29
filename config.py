import os
import cloudinary
import psycopg2


class Config(object):
    SQLALCHEMY_DATABASE_URI = os.environ.get('SQLALCHEMY_DATABASE_URI')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    # Closes connections after 3 seconds of inactivity
    SQLALCHEMY_POOL_RECYCLE = 3
    # Wait 10 seconds for a new connection
    SQLALCHEMY_POOL_TIMEOUT = 10
    # PostgreSQL backend has 20 max connections
    SQLALCHEMY_POOL_SIZE = 15
    SQLALCHEMY_MAX_OVERFLOW = 5
    SECRET_KEY = os.environ.get('SECRET_KEY')
    SEND_FILE_MAX_AGE_DEFAULT = 0
    SCHEDULER_TIMEZONE = "America/New_York"
    SCHEDULER_EXECUTORS = {"default": {"type": "threadpool", "max_workers": 1}}
    SCHEDULER_JOB_DEFAULTS = {"coalesce": True, "max_instances": 1}
    # mail settings
    MAIL_SERVER = 'smtp.sendgrid.net'
    MAIL_PORT = 465
    MAIL_USERNAME = 'apikey'
    MAIL_PASSWORD = os.environ.get('SENDGRID_PASSWORD')
    MAIL_USE_TLS = False
    MAIL_USE_SSL = True
