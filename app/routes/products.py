from flask import Blueprint, request, jsonify
from app.models import Product
from app.extensions import db
from flask_jwt_extended import jwt_required, get_jwt_identity
import logging
import uuid

bp = Blueprint('products', __name__, url_prefix='/products')
bp.strict_slashes = False

@bp.route('', methods=['POST', 'OPTIONS'])
@jwt_required()
def create_product():
    if request.method == 'OPTIONS':
        return '', 200
    try:
        logging.debug(f"Request headers: {dict(request.headers)}")
        identity = get_jwt_identity()
        logging.debug(f"JWT identity: {identity}")
        data = request.get_json(force=True, silent=True)
        logging.debug(f"Received data: {data}")
        new_product = Product(
            name=data['name'],
            type=data.get('type')
        )
        db.session.add(new_product)
        db.session.commit()
        logging.info(f"Product created with ID: {new_product.id}")
        return jsonify({"message": "Product created", "product_id": str(new_product.id)}), 201
    except Exception as e:
        logging.exception("Exception occurred while creating product")
        return jsonify({"error": "Server error", "details": str(e)}), 500

@bp.route('', methods=['GET', 'OPTIONS'])
@jwt_required()
def get_products():
    if request.method == 'OPTIONS':
        return '', 200
    try:
        logging.debug(f"Request headers: {dict(request.headers)}")
        identity = get_jwt_identity()
        logging.debug(f"JWT identity: {identity}")
        products = Product.query.all()
        result = []
        for product in products:
            result.append({
                "id": str(product.id),
                "name": product.name,
                "type": product.type
            })
        return jsonify(result), 200
    except Exception as e:
        logging.exception("Exception occurred while getting products")
        return jsonify({"error": "Server error", "details": str(e)}), 500

@bp.route('/<product_id>', methods=['PUT', 'OPTIONS'])
@jwt_required()
def update_product(product_id):
    if request.method == 'OPTIONS':
        return '', 200
    try:
        logging.debug(f"Request headers: {dict(request.headers)}")
        identity = get_jwt_identity()
        logging.debug(f"JWT identity: {identity}")
        try:
            product_uuid = uuid.UUID(product_id)
        except Exception:
            return jsonify({"message": "Invalid product ID format"}), 400
        product = Product.query.get(product_uuid)
        if not product:
            return jsonify({"message": "Product not found"}), 404
        data = request.get_json(force=True, silent=True)
        product.name = data.get('name', product.name)
        product.type = data.get('type', product.type)
        db.session.commit()
        logging.info(f"Product updated with ID: {product.id}")
        return jsonify({"message": "Product updated"}), 200
    except Exception as e:
        logging.exception("Exception occurred while updating product")
        return jsonify({"error": "Server error", "details": str(e)}), 500

@bp.route('/<product_id>', methods=['DELETE', 'OPTIONS'])
@jwt_required()
def delete_product(product_id):
    if request.method == 'OPTIONS':
        return '', 200
    try:
        logging.debug(f"Request headers: {dict(request.headers)}")
        identity = get_jwt_identity()
        logging.debug(f"JWT identity: {identity}")
        try:
            product_uuid = uuid.UUID(product_id)
        except Exception:
            return jsonify({"message": "Invalid product ID format"}), 400
        product = Product.query.get(product_uuid)
        if not product:
            return jsonify({"message": "Product not found"}), 404
        db.session.delete(product)
        db.session.commit()
        logging.info(f"Product deleted with ID: {product.id}")
        return jsonify({"message": "Product deleted"}), 200
    except Exception as e:
        logging.exception("Exception occurred while deleting product")
        return jsonify({"error": "Server error", "details": str(e)}), 500
