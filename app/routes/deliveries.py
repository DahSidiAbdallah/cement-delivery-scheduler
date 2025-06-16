import logging
import uuid
from flask import Blueprint, request, jsonify
from app.models import Delivery
from app.extensions import db
from flask_jwt_extended import jwt_required, get_jwt_identity

bp = Blueprint('deliveries', __name__, url_prefix='/deliveries')

@bp.route('/', methods=['POST', 'OPTIONS'])
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
        new_delivery = Delivery(
            order_id=data['order_id'],
            truck_id=data['truck_id'],
            scheduled_date=data.get('scheduled_date'),
            scheduled_time=data.get('scheduled_time'),
            status=data.get('status', 'Scheduled')
        )
        db.session.add(new_delivery)
        db.session.commit()
        logging.info(f"Delivery created with ID: {new_delivery.id}")
        return jsonify({"message": "Delivery created", "delivery_id": str(new_delivery.id)}), 201
    except Exception as e:
        logging.exception("Exception occurred while creating delivery")
        return jsonify({"error": "Server error", "details": str(e)}), 500

@bp.route('/', methods=['GET', 'OPTIONS'])
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

@bp.route('/<delivery_id>', methods=['PUT', 'OPTIONS'])
@jwt_required()
def update_delivery(delivery_id):
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
        data = request.get_json(force=True, silent=True)
        delivery.scheduled_date = data.get('scheduled_date', delivery.scheduled_date)
        delivery.scheduled_time = data.get('scheduled_time', delivery.scheduled_time)
        delivery.status = data.get('status', delivery.status)
        db.session.commit()
        logging.info(f"Delivery updated with ID: {delivery.id}")
        return jsonify({"message": "Delivery updated"}), 200
    except Exception as e:
        logging.exception("Exception occurred while updating delivery")
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
