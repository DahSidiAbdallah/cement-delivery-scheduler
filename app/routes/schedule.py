from flask import Blueprint, jsonify, current_app, send_file
from flask_jwt_extended import jwt_required
from app.models import Order, Truck
from app.utils.scheduler import optimize_schedule
import io, pandas as pd

bp = Blueprint('schedule', __name__, url_prefix='/schedule')
bp.strict_slashes = False

@bp.route('/deliveries', methods=['GET'])
@jwt_required()
def get_schedule():
    # 1) Fetch pending orders and all trucks
    orders = Order.query.filter_by(status='Pending').all()
    trucks = Truck.query.all()

    # 2) Build your data lists, including priority
    orders_data = [{
        'id':       str(o.id),
        'quantity': o.quantity,
        'priority': o.client.priority_level  # << here!
    } for o in orders]

    trucks_data = [{
        'id':       str(t.id),
        'capacity': t.capacity
    } for t in trucks]

    daily_limit = current_app.config.get('DAILY_PRODUCTION_LIMIT', 1000)

    # 3) Call the optimizer
    result = optimize_schedule(orders_data, trucks_data, daily_limit)

    return jsonify({'schedule': result}), 200


@bp.route('/export', methods=['GET'])
@jwt_required()
def export_schedule():
    # Same data collection as above
    orders = Order.query.filter_by(status='Pending').all()
    trucks = Truck.query.all()
    orders_data = [{
        'id':       str(o.id),
        'quantity': o.quantity,
        'priority': o.client.priority_level  # << and here!
    } for o in orders]
    trucks_data = [{
        'id':       str(t.id),
        'capacity': t.capacity
    } for t in trucks]
    daily_limit = current_app.config.get('DAILY_PRODUCTION_LIMIT', 1000)

    schedule = optimize_schedule(orders_data, trucks_data, daily_limit)

    # Flatten & export to Excel
    rows = [{'Truck ID': i['truck'], 'Order IDs': ", ".join(i['orders'])}
            for i in schedule]
    df = pd.DataFrame(rows)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Schedule')
    output.seek(0)

    return send_file(
        output,
        as_attachment=True,
        download_name='delivery_schedule.xlsx',
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
