from flask import Blueprint, request, jsonify
from app.models import User
from app.extensions import db, jwt
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
import logging

bp = Blueprint('auth', __name__, url_prefix='/auth')

# User Registration Route
@bp.route('/register', methods=['POST'])
def register():
    try:
        logging.debug(f"Request headers: {dict(request.headers)}")
        data = request.get_json(force=True, silent=True)
        logging.debug(f"Received data: {data}")
        if User.query.filter_by(username=data['username']).first():
            return jsonify({"message": "Username already exists"}), 400
        user = User(
            username=data['username'],
            role=data.get('role', 'commercial_manager')
        )
        user.set_password(data['password'])
        db.session.add(user)
        db.session.commit()
        logging.info(f"User registered with ID: {user.id}")
        return jsonify({"message": "User registered successfully"}), 201
    except Exception as e:
        logging.exception("Exception occurred during registration")
        return jsonify({"error": "Server error", "details": str(e)}), 500

# Login Route
@bp.route('/login', methods=['POST'])
def login():
    try:
        logging.debug(f"Request headers: {dict(request.headers)}")
        data = request.get_json(force=True, silent=True)
        logging.debug(f"Received data: {data}")
        user = User.query.filter_by(username=data['username']).first()
        if user and user.check_password(data['password']):
            access_token = create_access_token(identity=str(user.id))  # Use string for identity
            logging.info(f"User logged in: {user.username}")
            return jsonify(access_token=access_token), 200
        logging.warning(f"Invalid login attempt for username: {data.get('username')}")
        return jsonify({"message": "Invalid credentials"}), 401
    except Exception as e:
        logging.exception("Exception occurred during login")
        return jsonify({"error": "Server error", "details": str(e)}), 500

