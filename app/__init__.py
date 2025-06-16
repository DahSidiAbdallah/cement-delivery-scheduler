from flask import Flask
from flask_cors import CORS
from .extensions import db, migrate
from .routes import clients, products, trucks, orders, deliveries, users, auth, schedule

def create_app():
    app = Flask(__name__)
    app.config.from_object('config.Config')

    # ——————————————————————————————————————
    # Use Flask-CORS to handle ALL preflight + headers
    # ——————————————————————————————————————
    CORS(
        app,
        resources={r"/*": {"origins": "http://localhost:5173"}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"]  # Explicitly allow Authorization header
    )

    db.init_app(app)
    migrate.init_app(app, db)

    app.register_blueprint(clients.bp)
    app.register_blueprint(products.bp)
    app.register_blueprint(trucks.bp)
    app.register_blueprint(orders.bp)
    app.register_blueprint(deliveries.bp)
    app.register_blueprint(users.bp)
    app.register_blueprint(auth.bp)
    app.register_blueprint(schedule.bp)

    return app
