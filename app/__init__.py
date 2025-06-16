from flask import Flask
from .extensions import db, migrate, jwt
from .routes import clients, products, trucks, orders, deliveries, users, auth, schedule

def create_app():
    app = Flask(__name__)
    app.config.from_object('config.Config')

    # ———————————————
    # DEV-ONLY “ALLOW EVERYTHING” CORS + OPTIONS handler
    # ———————————————
    @app.after_request
    def apply_cors(resp):
        resp.headers['Access-Control-Allow-Origin']      = 'http://localhost:5173'
        resp.headers['Access-Control-Allow-Credentials'] = 'true'
        resp.headers['Access-Control-Allow-Headers']     = 'Content-Type,Authorization'
        resp.headers['Access-Control-Allow-Methods']     = 'GET,POST,PUT,DELETE,OPTIONS'
        return resp

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

    return app
