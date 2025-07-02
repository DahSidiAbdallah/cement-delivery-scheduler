from app import create_app
from app.extensions import db, migrate
from flask_migrate import upgrade as _upgrade

app = create_app()

with app.app_context():
    # This will apply all pending migrations
    _upgrade()
    print("Migrations applied successfully!")
