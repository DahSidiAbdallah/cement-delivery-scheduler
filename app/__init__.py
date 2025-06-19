from flask import Flask
from flask_cors import CORS
from .extensions import db, migrate, jwt
from .routes import clients, products, trucks, orders, deliveries, users, auth, schedule, whatsapp

def create_app():
    app = Flask(__name__)
    app.config.from_object('config.Config')

    # ——————————————————————————————————————
    # Use Flask-CORS to handle ALL preflight + headers
    # ——————————————————————————————————————
    # Allow all origins from local network (192.168.x.x, 10.x.x.x, 172.16.x.x - 172.31.x.x)
    CORS(
        app,
        resources={"*": {"origins": [
            "http://localhost:5173", 
            "http://localhost:3000", 
            "http://127.0.0.1:3000",
            # Common local network IP patterns
            "http://192.168.*",
            "http://10.*",
            "http://172.16.*",
            "http://172.17.*",
            "http://172.18.*",
            "http://172.19.*",
            "http://172.20.*",
            "http://172.21.*",
            "http://172.22.*",
            "http://172.23.*",
            "http://172.24.*",
            "http://172.25.*",
            "http://172.26.*",
            "http://172.27.*",
            "http://172.28.*",
            "http://172.29.*",
            "http://172.30.*",
            "http://172.31.*"
        ]}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    )

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    app.register_blueprint(clients.bp)
    app.register_blueprint(products.bp)
    app.register_blueprint(trucks.bp)
    app.register_blueprint(orders.bp)
    app.register_blueprint(deliveries.bp)
    app.register_blueprint(users.bp)
    app.register_blueprint(auth.bp)
    app.register_blueprint(schedule.bp)
    app.register_blueprint(whatsapp.bp)
   

    return app
