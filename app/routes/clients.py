import logging
import uuid
from flask import Blueprint, request, jsonify
from app.models import Client
from app.extensions import db

bp = Blueprint('clients', __name__, url_prefix='/clients')

def log_headers():
    logging.debug("\n=== Incoming Request Headers ===")
    for k, v in request.headers.items():
        logging.debug(f"{k}: {v}")
    logging.debug("================================\n")

@bp.route('/', methods=['POST'])
def create_client():
    try:
        # Log headers and JWT identity
        log_headers()

        data = request.get_json(force=True, silent=True)
        logging.debug(f"Received data: {data}")

        if not data or 'name' not in data or not isinstance(data['name'], str):
            logging.error("Missing or invalid 'name' field")
            return jsonify({"error": "Missing or invalid field: name"}), 400

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
def get_clients():
    log_headers()
    clients = Client.query.all()
    result = [{
        "id":               str(c.id),
        "name":             c.name,
        "priority_level":   c.priority_level,
        "contact_info":     c.contact_info,
        "address":          c.address
    } for c in clients]
    return jsonify(result), 200

@bp.route('/<client_id>', methods=['GET'])
def get_client(client_id):
    try:
        client_uuid = uuid.UUID(client_id)
    except Exception:
        return jsonify({"message": "Invalid client ID format"}), 400
    client = Client.query.get(client_uuid)
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
    log_headers()
    try:
        client_uuid = uuid.UUID(client_id)
    except Exception:
        return jsonify({"message": "Invalid client ID format"}), 400
    client = Client.query.get(client_uuid)
    if not client:
        return jsonify({"message": "Client not found"}), 404
    data = request.get_json()
    client.name            = data.get('name', client.name)
    client.priority_level  = data.get('priority_level', client.priority_level)
    client.contact_info    = data.get('contact_info', client.contact_info)
    client.address         = data.get('address', client.address)
    db.session.commit()
    return jsonify({"message": "Client updated"}), 200

@bp.route('/<client_id>', methods=['DELETE'])
def delete_client(client_id):
    log_headers()
    try:
        client_uuid = uuid.UUID(client_id)
    except Exception:
        return jsonify({"message": "Invalid client ID format"}), 400
    client = Client.query.get(client_uuid)
    if not client:
        return jsonify({"message": "Client not found"}), 404
    db.session.delete(client)
    db.session.commit()
    return jsonify({"message": "Client deleted"}), 200
