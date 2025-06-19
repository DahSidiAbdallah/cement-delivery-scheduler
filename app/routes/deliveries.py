import logging
import uuid
from flask import Blueprint, request, jsonify
from app.models import Delivery, DeliveryOrder, Order, Truck
from app.extensions import db
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime

bp = Blueprint('deliveries', __name__, url_prefix='/deliveries')
bp.strict_slashes = False

@bp.route('', methods=['POST', 'OPTIONS'])
@jwt_required()
def create_delivery():
    if request.method == 'OPTIONS':
        return '', 200
    try:
        logging.debug(f"Request headers: {dict(request.headers)}")
        identity = get_jwt_identity()
        logging.debug(f"JWT identity: {identity}")
        data = request.get_json(force=True, silent=True)
        logging.debug(f"Received data: {data}")
        
        # Accept either a single order_id or a list of order_ids
        order_ids = []
        if 'order_ids' in data:
            order_ids = data['order_ids']
        elif 'order_id' in data:
            order_ids = [data['order_id']]
        else:
            return jsonify({"error": "order_ids required"}), 400

        conv_ids = []
        for oid in order_ids:
            if isinstance(oid, str):
                try:
                    conv_ids.append(uuid.UUID(oid))
                except Exception:
                    return jsonify({"error": f"Invalid order_id {oid}"}), 400
            else:
                conv_ids.append(oid)
        order_ids = conv_ids

        if 'truck_id' in data and isinstance(data['truck_id'], str):
            try:
                data['truck_id'] = uuid.UUID(data['truck_id'])
            except Exception:
                return jsonify({"error": "Invalid truck_id UUID"}), 400

        # Convert scheduled_date to date
        if 'scheduled_date' in data and isinstance(data['scheduled_date'], str):
            try:
                data['scheduled_date'] = datetime.strptime(data['scheduled_date'], '%Y-%m-%d').date()
            except Exception:
                return jsonify({"error": "Invalid date format, should be YYYY-MM-DD"}), 400

        # Convert scheduled_time to time
        if 'scheduled_time' in data and isinstance(data['scheduled_time'], str):
            try:
                data['scheduled_time'] = datetime.strptime(data['scheduled_time'], '%H:%M').time()
            except Exception:
                return jsonify({"error": "Invalid time format, should be HH:MM"}), 400
        
        # ===== Business validations =====
        # 1. Orders must not already be scheduled
        for oid in order_ids:
            existing = DeliveryOrder.query.filter_by(order_id=oid).first()
            if existing:
                return jsonify({"error": "Order already scheduled"}), 400
            if Delivery.query.filter_by(order_id=oid).first():
                return jsonify({"error": "Order already scheduled"}), 400

        # 2. Date/time must be in the future
        if data.get('scheduled_date'):
            sched_dt = datetime.combine(
                data['scheduled_date'],
                data.get('scheduled_time') or datetime.min.time()
            )
            if sched_dt <= datetime.now():
                return jsonify({"error": "Delivery must be in the future"}), 400

        # 3. Truck/time slot must be free
        existing_deliv = Delivery.query.filter_by(
            truck_id=data['truck_id'],
            scheduled_date=data.get('scheduled_date'),
            scheduled_time=data.get('scheduled_time')
        ).first()
        if existing_deliv:
            return jsonify({"error": "Truck already booked for this time"}), 400

        # 4. Respect truck capacity
        truck = Truck.query.get(data['truck_id'])
        total_qty = 0
        for oid in order_ids:
            order = Order.query.get(oid)
            if not order:
                return jsonify({"error": f"Order {oid} not found"}), 400
            total_qty += order.quantity
        if truck and truck.capacity and total_qty > truck.capacity:
            return jsonify({"error": "Truck capacity exceeded"}), 400

        new_delivery = Delivery(
            truck_id=data['truck_id'],
            scheduled_date=data.get('scheduled_date'),
            scheduled_time=data.get('scheduled_time'),
            status=data.get('status', 'Programmé'),
            destination=data.get('destination', ''),
            notes=data.get('notes', '')
        )
        db.session.add(new_delivery)
        db.session.flush()
        for oid in order_ids:
            db.session.add(DeliveryOrder(delivery_id=new_delivery.id, order_id=oid))
        db.session.commit()
        logging.info(f"Delivery created with ID: {new_delivery.id}")
        return jsonify({"message": "Delivery created", "delivery_id": str(new_delivery.id)}), 201
    except Exception as e:
        logging.exception("Exception occurred while creating delivery")
        return jsonify({"error": "Server error", "details": str(e)}), 500

@bp.route('', methods=['GET', 'OPTIONS'])
@jwt_required()
def get_deliveries():
    if request.method == 'OPTIONS':
        return '', 200
    try:
        logging.debug(f"Request headers: {dict(request.headers)}")
        identity = get_jwt_identity()
        logging.debug(f"JWT identity: {identity}")
        deliveries = Delivery.query.all()
        result = []
        for delivery in deliveries:
            order_ids = [str(o.id) for o in delivery.orders]
            if delivery.order_id:
                order_ids.append(str(delivery.order_id))
            result.append({
                "id": str(delivery.id),
                "order_ids": order_ids,
                "truck_id": str(delivery.truck_id),
                "scheduled_date": delivery.scheduled_date.isoformat() if delivery.scheduled_date else None,
                "scheduled_time": str(delivery.scheduled_time) if delivery.scheduled_time else None,
                "status": delivery.status,
                "destination": delivery.destination,
                "notes": delivery.notes
            })
        return jsonify(result), 200
    except Exception as e:
        logging.exception("Exception occurred while getting deliveries")
        return jsonify({"error": "Server error", "details": str(e)}), 500

@bp.route('/<delivery_id>', methods=['PUT'])
@jwt_required()
def update_delivery(delivery_id):
    # 1) Parse and validate the URL param
    try:
        delivery_uuid = uuid.UUID(delivery_id)
    except ValueError:
        return jsonify({"error": "Invalid delivery ID format"}), 400

    delivery = Delivery.query.get(delivery_uuid)
    if not delivery:
        return jsonify({"error": "Delivery not found"}), 404

    # 2) Load JSON and drop any unexpected id
    data = request.get_json(force=True, silent=True) or {}
    data.pop('id', None)

    # 3) Handle simple scalar fields
    if 'destination' in data:
        delivery.destination = data['destination'] or ''
    if 'status' in data:
        delivery.status = data['status']
    if 'notes' in data:
        delivery.notes = data['notes'] or ''

    # 4) Convert and set truck_id if provided
    if 'truck_id' in data:
        if data['truck_id']:
            try:
                delivery.truck_id = uuid.UUID(data['truck_id'])
            except ValueError:
                return jsonify({"error": "Invalid truck_id UUID"}), 400
        else:
            delivery.truck_id = None

    # 5) Convert & set scheduled_date/time
    if 'scheduled_date' in data:
        sd = data['scheduled_date']
        if sd:
            try:
                delivery.scheduled_date = datetime.strptime(sd, '%Y-%m-%d').date()
            except ValueError:
                return jsonify({"error": "Invalid date format, should be YYYY-MM-DD"}), 400
        else:
            delivery.scheduled_date = None

    if 'scheduled_time' in data:
        st = data['scheduled_time']
        if st:
            fmt = '%H:%M:%S' if len(st) == 8 else '%H:%M'
            try:
                delivery.scheduled_time = datetime.strptime(st, fmt).time()
            except ValueError:
                return jsonify({"error": "Invalid time format, should be HH:MM"}), 400
        else:
            delivery.scheduled_time = None

    # 6) Orders many-to-many: rebuild only if user sent order_ids
    if 'order_ids' in data:
        # parse UUIDs
        conv_ids = []
        for oid in data['order_ids'] or []:
            try:
                conv_ids.append(uuid.UUID(oid))
            except (ValueError, TypeError):
                return jsonify({"error": f"Invalid order ID format: {oid}"}), 400

        # clear old links
        DeliveryOrder.query.filter_by(delivery_id=delivery.id).delete()

        # re-add
        for oid in conv_ids:
            # optional: check Order.exists here
            db.session.add(DeliveryOrder(delivery_id=delivery.id, order_id=oid))

    # 7) Business checks: future date & unique slot
    if delivery.scheduled_date:
        combined = datetime.combine(
            delivery.scheduled_date,
            delivery.scheduled_time or datetime.min.time()
        )
        if combined <= datetime.now():
            return jsonify({"error": "Delivery must be scheduled in the future"}), 400

    clash = Delivery.query.filter(
        Delivery.id != delivery.id,
        Delivery.truck_id == delivery.truck_id,
        Delivery.scheduled_date == delivery.scheduled_date,
        Delivery.scheduled_time == delivery.scheduled_time
    ).first()
    if clash:
        return jsonify({"error": "Truck already booked for this time"}), 400

    # 8) Commit
    try:
        db.session.commit()
        return jsonify({"message": "Delivery updated"}), 200
    except Exception as e:
        db.session.rollback()
        logging.exception("Failed to update delivery")
        return jsonify({"error": "Server error", "details": str(e)}), 500


@bp.route('/<delivery_id>', methods=['DELETE', 'OPTIONS'])
@jwt_required()
def delete_delivery(delivery_id):
    if request.method == 'OPTIONS':
        return '', 200
    try:
        logging.debug(f"Request headers: {dict(request.headers)}")
        identity = get_jwt_identity()
        logging.debug(f"JWT identity: {identity}")
        try:
            delivery_uuid = uuid.UUID(delivery_id)
        except Exception:
            return jsonify({"message": "Invalid delivery ID format"}), 400
        delivery = Delivery.query.get(delivery_uuid)
        if not delivery:
            return jsonify({"message": "Delivery not found"}), 404
        DeliveryOrder.query.filter_by(delivery_id=delivery.id).delete()
        db.session.delete(delivery)
        db.session.commit()
        logging.info(f"Delivery deleted with ID: {delivery.id}")
        return jsonify({"message": "Delivery deleted"}), 200
    except Exception as e:
        logging.exception("Exception occurred while deleting delivery")
        return jsonify({"error": "Server error", "details": str(e)}), 500
