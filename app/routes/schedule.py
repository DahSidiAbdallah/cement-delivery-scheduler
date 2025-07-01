from flask import Blueprint, jsonify, current_app, send_file
from flask_jwt_extended import jwt_required
from app.models import Order, Truck, Delivery
from app.utils.scheduler import optimize_schedule
import io, pandas as pd

bp = Blueprint('schedule', __name__, url_prefix='/schedule')
bp.strict_slashes = False

@bp.route('/deliveries', methods=['GET'])
@jwt_required()
def get_schedule():
    """Return the current delivery schedule.

    Instead of computing a new schedule from pending orders, this endpoint now
    aggregates existing deliveries that are already planned (``programmé`` or
    ``en cours``). It also reports how many orders are still ``en attente`` so
    the frontend can notify the user.
    """

    active_statuses = ['programmé', 'en cours', 'Programmé', 'En cours']

    # All trucks (to keep empty ones in the result)
    trucks = Truck.query.all()

    # Deliveries that are currently planned
    deliveries = Delivery.query.filter(Delivery.status.in_(active_statuses)).all()

    # Map truck_id -> schedule item
    # Each order entry will include the quantity scheduled for that delivery
    schedule_map = {
        t.id: {'truck': str(t.id), 'orders': [], 'load': 0}
        for t in trucks
    }

    scheduled_order_ids = set()
    scheduled_quantity = 0.0

    for d in deliveries:
        entry = schedule_map.get(d.truck_id)
        if not entry:
            # Skip deliveries without a valid truck
            continue

        # Collect orders associated with this delivery with quantities
        links = d.order_links
        legacy_handled = False
        for link in links:
            entry['orders'].append({
                'id': str(link.order_id),
                'quantity': link.quantity
            })
            scheduled_order_ids.add(link.order_id)
            scheduled_quantity += link.quantity
            if d.order_id and link.order_id == d.order_id:
                legacy_handled = True

        # Handle legacy single order_id if not already represented in order_links
        if d.order_id and not legacy_handled:
            order = Order.query.get(d.order_id)
            qty = order.quantity if order else 0
            entry['orders'].append({'id': str(d.order_id), 'quantity': qty})
            scheduled_order_ids.add(d.order_id)
            scheduled_quantity += qty

    # Convert schedule map to list (keep truck order from DB)
    schedule = list(schedule_map.values())

    # Orders that are not yet planned
    pending_orders = Order.query.filter_by(status='en attente').all()
    pending_quantity = sum(o.quantity for o in pending_orders)

    daily_limit = current_app.config.get('DAILY_PRODUCTION_LIMIT', 800)
    total_capacity = sum(t.capacity for t in trucks)

    stats = {
        'total_pending_orders': len(scheduled_order_ids) + len(pending_orders),
        'total_pending_quantity': scheduled_quantity + pending_quantity,
        'total_trucks': len(trucks),
        'total_capacity': total_capacity,
        'daily_limit': daily_limit,
        'scheduled_orders': len(scheduled_order_ids),
        'scheduled_quantity': scheduled_quantity,
        'trucks_utilized': len([s for s in schedule if s['orders']])
    }

    return jsonify({'schedule': schedule, 'stats': stats}), 200


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
