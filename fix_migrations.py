from app import create_app
from app.extensions import db
from flask_migrate import upgrade, stamp, current
import os

def fix_migrations():
    app = create_app()
    
    with app.app_context():
        # Create migrations directory if it doesn't exist
        migrations_dir = os.path.join(os.path.dirname(__file__), 'migrations')
        if not os.path.exists(migrations_dir):
            os.makedirs(migrations_dir)
        
        # Get the current database revision
        try:
            current_rev = current()
            print(f"Current database revision: {current_rev}")
        except Exception as e:
            print(f"Error getting current revision: {e}")
            print("This might be expected if the database is not yet initialized.")
        
        # Stamp the database with the latest migration
        print("Stamping database with latest migration...")
        stamp(revision='head')
        
        # Try to apply migrations again
        print("Applying migrations...")
        upgrade()
        
        print("Migrations should now be in sync!")

if __name__ == '__main__':
    fix_migrations()
