import logging
from flask import Blueprint, request, jsonify
from app.models import Client
from app.extensions import db
from flask_jwt_extended import jwt_required, get_jwt_identity

bp = Blueprint('clients', __name__, url_prefix='/clients')

def log_headers():
    print("\n=== Incoming Request Headers ===")
    for k, v in request.headers.items():
        print(f"{k}: {v}")
    print("================================\n")

@bp.route('/', methods=['POST'])
#@jwt_required()
def create_client():
    try:
        # Debug: log headers and JWT identity
        logging.debug(f"Request headers: {dict(request.headers)}")
        identity = get_jwt_identity()
        logging.debug(f"JWT identity: {identity}")

        data = request.get_json(force=True, silent=True)
        logging.debug(f"Received data: {data}")

        if not data:
            logging.error("No JSON payload received.")
            return jsonify({"error": "No input data provided"}), 400

        required_fields = ['name']
        for field in required_fields:
            if field not in data or not isinstance(data[field], str):
                logging.error(f"Missing or invalid field: {field}")
                return jsonify({"error": f"Missing or invalid field: {field}"}), 400

        new_client = Client(
            name=data['name'],
            priority_level=data.get('priority_level', 1),
            contact_info=data.get('contact_info'),
            address=data.get('address')
        )
        db.session.add(new_client)
        db.session.commit()
        logging.info(f"Client created with ID: {new_client.id}")
        return jsonify({"message": "Client created", "client_id": str(new_client.id)}), 201

    except Exception as e:
        logging.exception("Exception occurred while creating client")
        return jsonify({"error": "Server error", "details": str(e)}), 500

@bp.route('/', methods=['GET'])
@jwt_required()
def get_clients():
    clients = Client.query.all()
    result = []
    for client in clients:
        result.append({
            "id": str(client.id),
            "name": client.name,
            "priority_level": client.priority_level,
            "contact_info": client.contact_info,
            "address": client.address
        })
    return jsonify(result), 200

@bp.route('/<client_id>', methods=['GET'])
@jwt_required()
def get_client(client_id):
    client = Client.query.get(client_id)
    if not client:
        return jsonify({"message": "Client not found"}), 404
    return jsonify({
        "id": str(client.id),
        "name": client.name,
        "priority_level": client.priority_level,
        "contact_info": client.contact_info,
        "address": client.address
    }), 200

@bp.route('/<client_id>', methods=['PUT'])
def update_client(client_id):
    client = Client.query.get(client_id)
    if not client:
        return jsonify({"message": "Client not found"}), 404

    data = request.get_json()
    client.name = data.get('name', client.name)
    client.priority_level = data.get('priority_level', client.priority_level)
    client.contact_info = data.get('contact_info', client.contact_info)
    client.address = data.get('address', client.address)

    db.session.commit()
    return jsonify({"message": "Client updated"}), 200

@bp.route('/<client_id>', methods=['DELETE'])
def delete_client(client_id):
    client = Client.query.get(client_id)
    if not client:
        return jsonify({"message": "Client not found"}), 404

    db.session.delete(client)
    db.session.commit()
    return jsonify({"message": "Client deleted"}), 200
