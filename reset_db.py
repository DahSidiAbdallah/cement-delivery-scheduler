import os
from app import create_app
from app.extensions import db

def reset_database():
    app = create_app()
    with app.app_context():
        # Drop all tables
        db.drop_all()
        # Recreate all tables
        db.create_all()
        print("Database has been reset successfully!")

if __name__ == "__main__":
    reset_database()
