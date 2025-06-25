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
    # Get all pending orders
    pending_orders = Order.query.filter_by(status='Pending').all()
    trucks = Truck.query.all()
    from app.models import Client

    # Calculate total pending quantity
    total_pending = sum(o.quantity for o in pending_orders)
    total_capacity = sum(t.capacity for t in trucks)
    daily_limit = current_app.config.get('DAILY_PRODUCTION_LIMIT', 800)

    # Prepare data for optimization
    orders_data = []
    for o in pending_orders:
        client = Client.query.get(o.client_id)
        orders_data.append({
            'id': str(o.id),
            'quantity': o.quantity,
            'priority': client.priority_level if client else 1
        })

    trucks_data = [{
        'id': str(t.id),
        'plate_number': t.plate_number,
        'capacity': t.capacity
    } for t in trucks]

    # Run optimization
    result = optimize_schedule(orders_data, trucks_data, daily_limit)

    # Calculate some stats
    scheduled_orders = sum(len(t['orders']) for t in result)
    scheduled_quantity = sum(t['load'] for t in result)

    return jsonify({
        'schedule': result,
        'stats': {
            'total_pending_orders': len(pending_orders),
            'total_pending_quantity': total_pending,
            'total_trucks': len(trucks),
            'total_capacity': total_capacity,
            'daily_limit': daily_limit,
            'scheduled_orders': scheduled_orders,
            'scheduled_quantity': scheduled_quantity,
            'trucks_utilized': len([t for t in result if t['orders']])
        }
    }), 200


@bp.route('/export', methods=['GET'])
@jwt_required()
def export_schedule():
    from app.models import Order, Truck, Client, Product  # Import here if needed
    import pandas as pd, io

    # Fetch all needed data
    orders = {str(o.id): o for o in Order.query.all()}
    trucks = {str(t.id): t for t in Truck.query.all()}
    clients = {str(c.id): c for c in Client.query.all()}
    products = {str(p.id): p for p in Product.query.all()}

    # Regenerate the schedule (same as the planning)
    daily_limit = current_app.config.get('DAILY_PRODUCTION_LIMIT', 800)
    # Use pending orders only (or all, as needed)
    schedule_result = optimize_schedule(
        [
            {
                'id': str(o.id),
                'quantity': o.quantity,
                'priority': clients[str(o.client_id)].priority_level if str(o.client_id) in clients else 1,
            }
            for o in Order.query.filter_by(status="Pending").all()
        ],
        [
            {
                'id': str(t.id),
                'capacity': t.capacity
            }
            for t in Truck.query.all()
        ],
        daily_limit
    )

    # Build Excel rows: one per assignment
    rows = []
    for sch in schedule_result:
        truck = trucks.get(sch['truck'])
        truck_plate = truck.plate_number if truck else sch['truck']
        for idx, order_id in enumerate(sch['orders'], 1):
            order = orders.get(order_id)
            if not order: continue
            client = clients.get(str(order.client_id))
            product = products.get(str(order.product_id))
            
            rows.append({
                'Numéro': idx,
                'Camion': truck_plate,
                'Client': client.name if client else str(order.client_id),
                'Quantité (t)': order.quantity,
                'Produit': (
                    f"{product.name} ({product.type})"
                    if product and product.type else
                    (product.name if product else "")
                ),
            })

    # Make DataFrame & export to Excel
    df = pd.DataFrame(rows)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Planning')
    output.seek(0)

    return send_file(
        output,
        as_attachment=True,
        download_name='planning_livraisons.xlsx',
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
