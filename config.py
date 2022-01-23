import os
import cloudinary
import psycopg2


class Config(object):
    SQLALCHEMY_DATABASE_URI = os.environ.get('SQLALCHEMY_DATABASE_URI')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.environ.get('SECRET_KEY')
    SEND_FILE_MAX_AGE_DEFAULT = 0
    SCHEDULER_TIMEZONE = "America/New_York"
    SCHEDULER_EXECUTORS = {"default": {"type": "threadpool", "max_workers": 20}}
    SCHEDULER_JOB_DEFAULTS = {"coalesce": True, "max_instances": 1}
