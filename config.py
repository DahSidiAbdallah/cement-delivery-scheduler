import os
from urllib.parse import urlparse
import psycopg2
from psycopg2.extras import DictCursor

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-key-change-in-production')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Default to SQLite if no database URL is provided
    SQLALCHEMY_DATABASE_URI = 'sqlite:///app.db'
    
    # PostgreSQL configuration (optional)
    DATABASE_URL = os.environ.get('DATABASE_URL')
    
    if DATABASE_URL:
        try:
            # Parse the DATABASE_URL
            result = urlparse(DATABASE_URL)
            username = result.username
            password = result.password
            database = result.path[1:]  # Remove leading '/'
            hostname = result.hostname
            port = result.port or 5432  # Default PostgreSQL port
            
            # Only set PostgreSQL URI if all required components are present
            if all([username, password, database, hostname]):
                SQLALCHEMY_DATABASE_URI = f"postgresql://{username}:{password}@{hostname}:{port}/{database}"
        except Exception as e:
            print(f"Warning: Could not parse DATABASE_URL. Falling back to SQLite. Error: {e}")
    
    # JWT Configuration
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')