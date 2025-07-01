from flask import Blueprint, request, jsonify
from app.models import Order, Client, Product
from app.extensions import db
from flask_jwt_extended import jwt_required, get_jwt_identity
import logging
import uuid
from datetime import datetime

bp = Blueprint('orders', __name__, url_prefix='/orders')
bp.strict_slashes = False

@bp.route('', methods=['POST', 'OPTIONS'])
@jwt_required()
def create_order():
    if request.method == 'OPTIONS':
        return '', 200
    try:
        logging.debug(f"Request headers: {dict(request.headers)}")
        identity = get_jwt_identity()
        logging.debug(f"JWT identity: {identity}")
        data = request.get_json(force=True, silent=True)
        logging.debug(f"Received data: {data}")

        # Convert IDs to UUID
        client_id = uuid.UUID(data['client_id'])
        product_id = uuid.UUID(data['product_id'])

        # Convert 'requested_date' string to date object if needed
        if 'requested_date' in data and isinstance(data['requested_date'], str):
            try:
                data['requested_date'] = datetime.strptime(data['requested_date'], '%Y-%m-%d').date()
            except Exception:
                return jsonify({"error": "Invalid date format, should be YYYY-MM-DD"}), 400

        # Convert 'requested_time' string to time object if needed
        if 'requested_time' in data and isinstance(data['requested_time'], str):
            try:
                data['requested_time'] = datetime.strptime(data['requested_time'], '%H:%M').time()
            except Exception:
                return jsonify({"error": "Invalid time format, should be HH:MM"}), 400

        # Ensure status is lowercase for consistency
        status = data.get('status', 'en attente')
        if status:
            status = status.lower()
            
        new_order = Order(
            client_id=client_id,
            product_id=product_id,
            quantity=data['quantity'],
            requested_date=data['requested_date'],
            requested_time=data.get('requested_time'),
            status=status
        )
        db.session.add(new_order)
        db.session.commit()
        logging.info(f"Order created with ID: {new_order.id}")
        return jsonify({"message": "Order created", "order_id": str(new_order.id)}), 201
    except Exception as e:
        logging.exception("Exception occurred while creating order")
        return jsonify({"error": "Server error", "details": str(e)}), 500

@bp.route('', methods=['GET', 'OPTIONS'])
@jwt_required()
def get_orders():
    if request.method == 'OPTIONS':
        return '', 200
    try:
        logging.debug(f"Request headers: {dict(request.headers)}")
        identity = get_jwt_identity()
        logging.debug(f"JWT identity: {identity}")
        orders = Order.query.all()
        result = []
        for order in orders:
            result.append({
                "id": str(order.id),
                "client_id": str(order.client_id),
                "product_id": str(order.product_id),
                "quantity": order.quantity,
                "requested_date": order.requested_date.isoformat(),
                "requested_time": str(order.requested_time) if order.requested_time else None,
                "status": order.status
            })
        return jsonify(result), 200
    except Exception as e:
        logging.exception("Exception occurred while getting orders")
        return jsonify({"error": "Server error", "details": str(e)}), 500

@bp.route('/<order_id>', methods=['PUT', 'OPTIONS'])
@jwt_required()
def update_order(order_id):
    if request.method == 'OPTIONS':
        return '', 200
    try:
        logging.debug(f"Request headers: {dict(request.headers)}")
        identity = get_jwt_identity()
        logging.debug(f"JWT identity: {identity}")
        try:
            order_uuid = uuid.UUID(order_id)
        except Exception:
            return jsonify({"message": "Invalid order ID format"}), 400
        order = Order.query.get(order_uuid)
        if not order:
            return jsonify({"message": "Order not found"}), 404
        data = request.get_json(force=True, silent=True)

        # Convert date and time if needed
        if 'requested_date' in data and isinstance(data['requested_date'], str):
            try:
                data['requested_date'] = datetime.strptime(data['requested_date'], '%Y-%m-%d').date()
            except Exception:
                return jsonify({"error": "Invalid date format, should be YYYY-MM-DD"}), 400
        if 'requested_time' in data and isinstance(data['requested_time'], str):
            try:
                data['requested_time'] = datetime.strptime(data['requested_time'], '%H:%M').time()
            except Exception:
                return jsonify({"error": "Invalid time format, should be HH:MM"}), 400

        # Get current status before update and ensure lowercase
        old_status = order.status.lower() if order.status else 'en attente'
        new_status = data.get('status', old_status)
        if new_status:
            new_status = new_status.lower()
        
        # Validate status transition
        if old_status != new_status:
            valid_transitions = {
                'en attente': ['planifié', 'annulé'],
                'planifié': ['en cours', 'livrée', 'annulé'],
                'en cours': ['livrée', 'annulé'],
                'livrée': [],  # Once delivered, no further changes allowed
                'annulé': []   # Once cancelled, no further changes allowed
            }
            
            if new_status not in valid_transitions.get(old_status, []):
                return jsonify({"error": f"Invalid status transition from {old_status} to {new_status}"}), 400
        
        # Update order fields
        order.quantity = data.get('quantity', order.quantity)
        order.requested_date = data.get('requested_date', order.requested_date)
        order.requested_time = data.get('requested_time', order.requested_time)
        order.status = new_status
        
        db.session.commit()
        logging.info(f"Order updated with ID: {order.id}")
        return jsonify({"message": "Order updated"}), 200
    except Exception as e:
        logging.exception("Exception occurred while updating order")
        return jsonify({"error": "Server error", "details": str(e)}), 500

@bp.route('/<order_id>', methods=['DELETE', 'OPTIONS'])
@jwt_required()
def delete_order(order_id):
    if request.method == 'OPTIONS':
        return '', 200
    try:
        logging.debug(f"Request headers: {dict(request.headers)}")
        identity = get_jwt_identity()
        logging.debug(f"JWT identity: {identity}")
        try:
            order_uuid = uuid.UUID(order_id)
        except Exception:
            return jsonify({"message": "Invalid order ID format"}), 400
        order = Order.query.get(order_uuid)
        if not order:
            return jsonify({"message": "Order not found"}), 404
        db.session.delete(order)
        db.session.commit()
        logging.info(f"Order deleted with ID: {order.id}")
        return jsonify({"message": "Order deleted"}), 200
    except Exception as e:
        logging.exception("Exception occurred while deleting order")
        return jsonify({"error": "Server error", "details": str(e)}), 500
