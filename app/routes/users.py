from flask import Blueprint, request, jsonify
from app.models import User
from app.extensions import db
from flask_jwt_extended import jwt_required, get_jwt_identity
import logging
import uuid

bp = Blueprint('users', __name__, url_prefix='/users')
bp.strict_slashes = False

@bp.route('/', methods=['POST', 'OPTIONS'])
@jwt_required()
def create_user():
    if request.method == 'OPTIONS':
        return '', 200
    try:
        logging.debug(f"Request headers: {dict(request.headers)}")
        identity = get_jwt_identity()
        logging.debug(f"JWT identity: {identity}")
        data = request.get_json(force=True, silent=True)
        logging.debug(f"Received data: {data}")
        new_user = User(
            username=data['username'],
            password_hash=data['password_hash'],  # We'll handle proper hashed passwords in Phase 4
            role=data.get('role', 'commercial_manager')
        )
        db.session.add(new_user)
        db.session.commit()
        logging.info(f"User created with ID: {new_user.id}")
        return jsonify({"message": "User created", "user_id": str(new_user.id)}), 201
    except Exception as e:
        logging.exception("Exception occurred while creating user")
        return jsonify({"error": "Server error", "details": str(e)}), 500

@bp.route('/', methods=['GET', 'OPTIONS'])
@jwt_required()
def get_users():
    if request.method == 'OPTIONS':
        return '', 200
    try:
        logging.debug(f"Request headers: {dict(request.headers)}")
        identity = get_jwt_identity()
        logging.debug(f"JWT identity: {identity}")
        users = User.query.all()
        result = []
        for user in users:
            result.append({
                "id": str(user.id),
                "username": user.username,
                "role": user.role
            })
        return jsonify(result), 200
    except Exception as e:
        logging.exception("Exception occurred while getting users")
        return jsonify({"error": "Server error", "details": str(e)}), 500

@bp.route('/<user_id>', methods=['PUT', 'OPTIONS'])
@jwt_required()
def update_user(user_id):
    if request.method == 'OPTIONS':
        return '', 200
    try:
        logging.debug(f"Request headers: {dict(request.headers)}")
        identity = get_jwt_identity()
        logging.debug(f"JWT identity: {identity}")
        try:
            user_uuid = uuid.UUID(user_id)
        except Exception:
            return jsonify({"message": "Invalid user ID format"}), 400
        user = User.query.get(user_uuid)
        if not user:
            return jsonify({"message": "User not found"}), 404
        data = request.get_json(force=True, silent=True)
        user.username = data.get('username', user.username)
        user.role = data.get('role', user.role)
        db.session.commit()
        logging.info(f"User updated with ID: {user.id}")
        return jsonify({"message": "User updated"}), 200
    except Exception as e:
        logging.exception("Exception occurred while updating user")
        return jsonify({"error": "Server error", "details": str(e)}), 500

@bp.route('/<user_id>', methods=['DELETE', 'OPTIONS'])
@jwt_required()
def delete_user(user_id):
    if request.method == 'OPTIONS':
        return '', 200
    try:
        logging.debug(f"Request headers: {dict(request.headers)}")
        identity = get_jwt_identity()
        logging.debug(f"JWT identity: {identity}")
        try:
            user_uuid = uuid.UUID(user_id)
        except Exception:
            return jsonify({"message": "Invalid user ID format"}), 400
        user = User.query.get(user_uuid)
        if not user:
            return jsonify({"message": "User not found"}), 404
        db.session.delete(user)
        db.session.commit()
        logging.info(f"User deleted with ID: {user.id}")
        return jsonify({"message": "User deleted"}), 200
    except Exception as e:
        logging.exception("Exception occurred while deleting user")
        return jsonify({"error": "Server error", "details": str(e)}), 500
