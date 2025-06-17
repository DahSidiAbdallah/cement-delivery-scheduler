import logging
import uuid
from flask import Blueprint, request, jsonify
from app.models import Delivery
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
        
        # Convert order_id and truck_id from string to UUID
        if 'order_id' in data and isinstance(data['order_id'], str):
            try:
                data['order_id'] = uuid.UUID(data['order_id'])
            except Exception:
                return jsonify({"error": "Invalid order_id UUID"}), 400
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
        
        new_delivery = Delivery(
            order_id=data['order_id'],
            truck_id=data['truck_id'],
            scheduled_date=data.get('scheduled_date'),
            scheduled_time=data.get('scheduled_time'),
            status=data.get('status', 'Programmé')
        )
        db.session.add(new_delivery)
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
            result.append({
                "id": str(delivery.id),
                "order_id": str(delivery.order_id),
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
        # ... rest of your parsing logic unchanged ...
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

        if 'order_id' in data and data['order_id']:
            delivery.order_id = uuid.UUID(data['order_id'])
        if 'truck_id' in data and data['truck_id']:
            delivery.truck_id = uuid.UUID(data['truck_id'])
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
        db.session.delete(delivery)
        db.session.commit()
        logging.info(f"Delivery deleted with ID: {delivery.id}")
        return jsonify({"message": "Delivery deleted"}), 200
    except Exception as e:
        logging.exception("Exception occurred while deleting delivery")
        return jsonify({"error": "Server error", "details": str(e)}), 500
