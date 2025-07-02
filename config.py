import os
from urllib.parse import urlparse
import psycopg2
from psycopg2.extras import DictCursor

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-key-change-in-production')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # PostgreSQL configuration
    DATABASE_URL = os.environ.get('DATABASE_URL')
    
    if DATABASE_URL:
        # Parse the DATABASE_URL
        result = urlparse(DATABASE_URL)
        username = result.username
        password = result.password
        database = result.path[1:]  # Remove leading '/'
        hostname = result.hostname
        port = result.port or 5432
        
        SQLALCHEMY_DATABASE_URI = f"postgresql://{username}:{password}@{hostname}:{port}/{database}"
    else:
        # Fallback to SQLite for development
        basedir = os.path.abspath(os.path.dirname(__file__))
        SQLALCHEMY_DATABASE_URI = f"sqlite:///{os.path.join(basedir, 'app.db')}"
    
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
