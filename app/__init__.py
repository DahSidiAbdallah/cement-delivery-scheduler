from flask import Flask, request
from flask_cors import CORS
from .extensions import db, migrate, jwt
from .routes import clients, products, trucks, orders, deliveries, users, auth, schedule, whatsapp

def create_app():
    app = Flask(__name__)
    app.config.from_object('config.Config')

    # ——————————————————————————————————————
    # CORS Configuration
    # ——————————————————————————————————————
    cors = CORS()
    cors.init_app(
        app,
        resources={
            r"/*": {
                "origins": [
                    "http://localhost:5173",
                    "http://localhost:3000",
                    "http://127.0.0.1:3000",
                    "http://192.168.2.28:5173",  # Your specific IP
                    "http://192.168.2.28:5000"   # Your backend IP
                ],
                "supports_credentials": True,
                "allow_headers": ["Content-Type", "Authorization"],
                "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                "expose_headers": ["Content-Disposition"]
            }
        }
    )

    # Add CORS headers to all responses
    @app.after_request
    def after_request(response):
        # Avoid duplicate CORS headers when using flask-cors
        response.headers['Access-Control-Allow-Origin'] = request.headers.get('Origin', '*')
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
        response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
        if request.method == 'OPTIONS':
            response.status_code = 200
        return response

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
