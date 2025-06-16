from flask import Blueprint, jsonify, current_app
from flask_jwt_extended import jwt_required
from app.models import Order, Truck
from app.utils.scheduler import optimize_schedule

bp = Blueprint('schedule', __name__, url_prefix='/schedule')

@bp.route('/deliveries', methods=['GET'])
@jwt_required()
def get_schedule():
    # Fetch all pending orders
    orders = Order.query.filter_by(status='Pending').all()
    # Fetch all trucks
    trucks = Truck.query.all()

    # Prepare simple data lists
    orders_data = [
        {'id': str(o.id), 'quantity': o.quantity}
        for o in orders
    ]
    trucks_data = [
        {'id': str(t.id), 'capacity': t.capacity}
        for t in trucks
    ]

    # Use a daily limit from config (fallback to 1000)
    daily_limit = current_app.config.get('DAILY_PRODUCTION_LIMIT', 1000)

    # Call your scheduler (stub logic for now)
    result = optimize_schedule(orders_data, trucks_data, daily_limit)

    # Return it
    return jsonify({ 'schedule': result }), 200
