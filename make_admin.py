from app import create_app
from app.extensions import db
from app.models import User

app = create_app()

with app.app_context():
    username = input("Enter the username to promote to admin: ")
    user = User.query.filter_by(username=username).first()
    if user:
        user.role = "admin"
        db.session.commit()
        print(f"User '{username}' is now an admin.")
    else:
        print(f"User '{username}' not found.")
