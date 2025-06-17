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
            status=data.get('status', 'Programmé')
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
            order_ids = [str(link.order_id) for link in delivery.order_assocs]
            if delivery.order_id:
                order_ids.append(str(delivery.order_id))
            result.append({
                "id": str(delivery.id),
                "order_ids": order_ids,
                "truck_id": str(delivery.truck_id),
                "scheduled_date": delivery.scheduled_date.isoformat() if delivery.scheduled_date else None,
                "scheduled_time": str(delivery.scheduled_time) if delivery.scheduled_time else None,
                "status": delivery.status
            })
        return jsonify(result), 200
    except Exception as e:
        logging.exception("Exception occurred while getting deliveries")
        return jsonify({"error": "Server error", "details": str(e)}), 500

@bp.route('/<delivery_id>', methods=['PUT'])
@jwt_required()
def update_delivery(delivery_id):
    try:
        try:
            delivery_uuid = uuid.UUID(delivery_id)
        except Exception:
            return jsonify({"error": "Invalid delivery ID format"}), 400

        delivery = Delivery.query.get(delivery_uuid)
        if not delivery:
            return jsonify({'error': 'Delivery not found'}), 404

        data = request.get_json(force=True, silent=True)

        order_ids = None
        if 'order_ids' in data:
            order_ids = data['order_ids']
        elif 'order_id' in data:
            order_ids = [data['order_id']]

        if 'scheduled_date' in data:
            if not data['scheduled_date']:
                delivery.scheduled_date = None
            elif isinstance(data['scheduled_date'], str):
                delivery.scheduled_date = datetime.strptime(data['scheduled_date'], '%Y-%m-%d').date()
            else:
                delivery.scheduled_date = data['scheduled_date']

        if 'scheduled_time' in data:
            if not data['scheduled_time']:
                delivery.scheduled_time = None
            elif isinstance(data['scheduled_time'], str):
                fmt = '%H:%M:%S' if len(data['scheduled_time']) == 8 else '%H:%M'
                delivery.scheduled_time = datetime.strptime(data['scheduled_time'], fmt).time()
            else:
                delivery.scheduled_time = data['scheduled_time']

        if order_ids is not None:
            conv = []
            for oid in order_ids:
                if isinstance(oid, str):
                    conv.append(uuid.UUID(oid))
                else:
                    conv.append(oid)

            # check duplicates
            for oid in conv:
                existing = DeliveryOrder.query.filter_by(order_id=oid).first()
                if existing and existing.delivery_id != delivery.id:
                    return jsonify({"error": "Order already scheduled"}), 400
                if Delivery.query.filter(Delivery.order_id==oid, Delivery.id!=delivery.id).first():
                    return jsonify({"error": "Order already scheduled"}), 400

            # truck capacity validation
            truck = Truck.query.get(data.get('truck_id', delivery.truck_id))
            total = 0
            for oid in conv:
                order = Order.query.get(oid)
                if not order:
                    return jsonify({"error": f"Order {oid} not found"}), 400
                total += order.quantity
            if truck and truck.capacity and total > truck.capacity:
                return jsonify({"error": "Truck capacity exceeded"}), 400

            # replace associations
            DeliveryOrder.query.filter_by(delivery_id=delivery.id).delete()
            for oid in conv:
                db.session.add(DeliveryOrder(delivery_id=delivery.id, order_id=oid))
            delivery.order_id = None
        if 'truck_id' in data and data['truck_id']:
            delivery.truck_id = uuid.UUID(data['truck_id'])

        # check future time and slot availability if truck/time updated
        check_date = delivery.scheduled_date
        check_time = delivery.scheduled_time
        if check_date and datetime.combine(check_date, check_time or datetime.min.time()) <= datetime.now():
            return jsonify({"error": "Delivery must be in the future"}), 400

        existing_same = Delivery.query.filter(
            Delivery.id != delivery.id,
            Delivery.truck_id == delivery.truck_id,
            Delivery.scheduled_date == check_date,
            Delivery.scheduled_time == check_time
        ).first()
        if existing_same:
            return jsonify({"error": "Truck already booked for this time"}), 400
        if 'status' in data:
            delivery.status = data['status']

        db.session.commit()
        return jsonify({'message': 'Delivery updated'}), 200

    except Exception as e:
        print(e)
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
