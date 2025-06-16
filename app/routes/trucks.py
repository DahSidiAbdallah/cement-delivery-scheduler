import logging
from flask import Blueprint, request, jsonify
from app.models import Truck
from app.extensions import db
from flask_jwt_extended import jwt_required, get_jwt_identity

bp = Blueprint('trucks', __name__, url_prefix='/trucks')

@bp.route('/', methods=['POST'])
@jwt_required()
def create_truck():
    try:
        logging.debug(f"Request headers: {dict(request.headers)}")
        identity = get_jwt_identity()
        logging.debug(f"JWT identity: {identity}")
        data = request.get_json(force=True, silent=True)
        logging.debug(f"Received data: {data}")
        new_truck = Truck(
            plate_number=data['plate_number'],
            capacity=data.get('capacity'),
            driver_name=data.get('driver_name')
        )
        db.session.add(new_truck)
        db.session.commit()
        logging.info(f"Truck created with ID: {new_truck.id}")
        return jsonify({"message": "Truck created", "truck_id": str(new_truck.id)}), 201
    except Exception as e:
        logging.exception("Exception occurred while creating truck")
        return jsonify({"error": "Server error", "details": str(e)}), 500

@bp.route('/', methods=['GET'])
@jwt_required()
def get_trucks():
    try:
        logging.debug(f"Request headers: {dict(request.headers)}")
        identity = get_jwt_identity()
        logging.debug(f"JWT identity: {identity}")
        trucks = Truck.query.all()
        result = []
        for truck in trucks:
            result.append({
                "id": str(truck.id),
                "plate_number": truck.plate_number,
                "capacity": truck.capacity,
                "driver_name": truck.driver_name
            })
        return jsonify(result), 200
    except Exception as e:
        logging.exception("Exception occurred while getting trucks")
        return jsonify({"error": "Server error", "details": str(e)}), 500

@bp.route('/<truck_id>', methods=['PUT'])
@jwt_required()
def update_truck(truck_id):
    try:
        logging.debug(f"Request headers: {dict(request.headers)}")
        identity = get_jwt_identity()
        logging.debug(f"JWT identity: {identity}")
        truck = Truck.query.get(truck_id)
        if not truck:
            return jsonify({"message": "Truck not found"}), 404
        data = request.get_json(force=True, silent=True)
        truck.plate_number = data.get('plate_number', truck.plate_number)
        truck.capacity = data.get('capacity', truck.capacity)
        truck.driver_name = data.get('driver_name', truck.driver_name)
        db.session.commit()
        logging.info(f"Truck updated with ID: {truck.id}")
        return jsonify({"message": "Truck updated"}), 200
    except Exception as e:
        logging.exception("Exception occurred while updating truck")
        return jsonify({"error": "Server error", "details": str(e)}), 500

@bp.route('/<truck_id>', methods=['DELETE'])
@jwt_required()
def delete_truck(truck_id):
    try:
        logging.debug(f"Request headers: {dict(request.headers)}")
        identity = get_jwt_identity()
        logging.debug(f"JWT identity: {identity}")
        truck = Truck.query.get(truck_id)
        if not truck:
            return jsonify({"message": "Truck not found"}), 404
        db.session.delete(truck)
        db.session.commit()
        logging.info(f"Truck deleted with ID: {truck.id}")
        return jsonify({"message": "Truck deleted"}), 200
    except Exception as e:
        logging.exception("Exception occurred while deleting truck")
        return jsonify({"error": "Server error", "details": str(e)}), 500
