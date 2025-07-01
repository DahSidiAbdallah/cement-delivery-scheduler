import logging
import uuid
from flask import Blueprint, request, jsonify
from app.models import db, Delivery, DeliveryHistory, DeliveryOrder, Order, Truck, User
from app.extensions import db
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from sqlalchemy import desc, func

# Status strings used for cancelled deliveries (masculine/feminine forms)
CANCELLED_STATUSES = ['annulée', 'annulé']


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

        # Get the current user ID for history tracking
        current_user_id = get_jwt_identity()
        try:
            # Ensure current_user_id is a UUID object
            if isinstance(current_user_id, str):
                current_user_id = uuid.UUID(current_user_id)
        except (ValueError, AttributeError):
            return jsonify({"error": "Invalid user ID format"}), 400
        
        # Set default status if not provided and normalize case
        status = data.get('status', 'programmé')
        if status:
            status = status.lower()
        
        # Create the delivery
        new_delivery = Delivery(
            truck_id=data['truck_id'],
            scheduled_date=data.get('scheduled_date'),
            scheduled_time=data.get('scheduled_time'),
            status=status,
            destination=data.get('destination', ''),
            notes=data.get('notes', '')
        )
        db.session.add(new_delivery)
        db.session.flush()  # Get the ID for the new delivery
        
        # Add initial status to history
        history = DeliveryHistory(
            delivery_id=new_delivery.id,
            status=status,
            changed_by=current_user_id,  # This is now a UUID object
            notes="Initial status"
        )
        db.session.add(history)
        
        # Add order associations and update order statuses only when delivery is active
        for oid in order_ids:
            db.session.add(DeliveryOrder(delivery_id=new_delivery.id, order_id=oid))

            order = Order.query.get(oid)

            if order and order.status and order.status.lower() == 'en attente' and status in ['programmé', 'en cours']:

        

                order.status = 'planifié'
                db.session.add(order)
        
        db.session.commit()
        logging.info(f"Delivery created with ID: {new_delivery.id}")
        
        # Return the created delivery with its history
        delivery_data = {
            'id': str(new_delivery.id),
            'status': new_delivery.status,
            'delayed': new_delivery.delayed,
            'history': [{
                'id': history.id,
                'status': history.status,
                'changed_at': history.changed_at.isoformat(),
                'changed_by': None,  # Will be loaded if include_history=true
                'notes': history.notes
            }]
        }
        
        return jsonify({"message": "Delivery created", "delivery": delivery_data}), 201
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
        
        # Get the include_history parameter
        include_history = request.args.get('include_history', 'false').lower() == 'true'
        
        # Base query
        query = Delivery.query
        
        # If history is requested, join with DeliveryHistory and User
        if include_history:
            from sqlalchemy.orm import joinedload
            query = query.options(
                joinedload(Delivery.history).joinedload(DeliveryHistory.user)
            )
        
        # Execute query
        deliveries = query.all()
        result = []
        
        for delivery in deliveries:
            # Get all order IDs for this delivery
            order_ids = [str(o.id) for o in delivery.orders]
            if delivery.order_id:
                order_ids.append(str(delivery.order_id))
            
            # Build delivery data
            delivery_data = {
                'id': str(delivery.id),
                'order_ids': list(set(order_ids)),  # Remove duplicates if any
                'truck_id': str(delivery.truck_id) if delivery.truck_id else None,
                'scheduled_date': delivery.scheduled_date.isoformat() if delivery.scheduled_date else None,
                'scheduled_time': str(delivery.scheduled_time) if delivery.scheduled_time else None,
                'status': delivery.status,
                'destination': delivery.destination,
                'notes': delivery.notes,
                'delayed': delivery.delayed
            }
            
            # Add history if requested
            if include_history and hasattr(delivery, 'history'):
                delivery_data['history'] = [{
                    'id': str(h.id),
                    'status': h.status,
                    'changed_at': h.changed_at.isoformat(),
                    'changed_by': h.user.username if h.user else None,
                    'notes': h.notes
                } for h in sorted(delivery.history, key=lambda x: x.changed_at, reverse=True)]
            
            result.append(delivery_data)
            
        return jsonify(result), 200
    except Exception as e:
        logging.exception("Exception occurred while getting deliveries")
        return jsonify({"error": "Server error", "details": str(e)}), 500

@bp.route('/<delivery_id>', methods=['PUT', 'OPTIONS'])
@jwt_required()
def update_delivery(delivery_id):
    if request.method == 'OPTIONS':
        return '', 200
    # 1) Parse and validate the URL param
    try:
        delivery_uuid = uuid.UUID(delivery_id)
    except ValueError:
        return jsonify({"error": "Invalid delivery ID format"}), 400

    delivery = Delivery.query.get(delivery_uuid)
    if not delivery:
        return jsonify({"error": "Delivery not found"}), 404

    # 2) Load JSON and drop any unexpected id
    data = request.get_json(force=True, silent=True) or {}
    data.pop('id', None)

    # 3) Handle status changes and log history
    current_user_id = get_jwt_identity()
    try:
        if isinstance(current_user_id, str):
            current_user_id = uuid.UUID(current_user_id)
    except (ValueError, AttributeError):
        return jsonify({"error": "Invalid user ID format"}), 400

    status_changed = False
    prev_status = delivery.status.lower() if delivery.status else ''

    new_status_raw = data.get('status')
    new_status = new_status_raw.lower() if new_status_raw else None

    if new_status is not None and new_status != prev_status:
        # Log the status change in history
        history = DeliveryHistory(
            delivery_id=delivery.id,
            status=new_status,
            changed_by=current_user_id,
            notes=f"Status changed from {delivery.status} to {new_status}"
        )
        db.session.add(history)

        # Update the status
        delivery.status = new_status
        status_changed = True

        # Check if we need to set the delayed flag
        if delivery.status in CANCELLED_STATUSES and prev_status in ['programmé', 'en cours']:
            delivery.delayed = True
    
    # Handle other simple scalar fields
    if 'destination' in data:
        delivery.destination = data['destination'] or ''
    if 'notes' in data:
        delivery.notes = data['notes'] or ''

    # 4) Convert and set truck_id if provided
    if 'truck_id' in data:
        if data['truck_id']:
            try:
                delivery.truck_id = uuid.UUID(data['truck_id'])
            except ValueError:
                return jsonify({"error": "Invalid truck_id UUID"}), 400
        else:
            delivery.truck_id = None

    # 5) Convert & set scheduled_date/time
    if 'scheduled_date' in data:
        sd = data['scheduled_date']
        if sd:
            try:
                delivery.scheduled_date = datetime.strptime(sd, '%Y-%m-%d').date()
            except ValueError:
                return jsonify({"error": "Invalid date format, should be YYYY-MM-DD"}), 400
        else:
            delivery.scheduled_date = None

    if 'scheduled_time' in data:
        st = data['scheduled_time']
        if st:
            fmt = '%H:%M:%S' if len(st) == 8 else '%H:%M'
            try:
                delivery.scheduled_time = datetime.strptime(st, fmt).time()
            except ValueError:
                return jsonify({"error": "Invalid time format, should be HH:MM"}), 400
        else:
            delivery.scheduled_time = None

    # 6) Orders many-to-many: rebuild only if user sent order_ids
    if 'order_ids' in data:
        # parse UUIDs
        conv_ids = []
        for oid in data['order_ids'] or []:
            try:
                conv_ids.append(uuid.UUID(oid))
            except (ValueError, TypeError):
                return jsonify({"error": f"Invalid order ID format: {oid}"}), 400

        # clear old links
        DeliveryOrder.query.filter_by(delivery_id=delivery.id).delete()

        # re-add
        for oid in conv_ids:
            # optional: check Order.exists here
            db.session.add(DeliveryOrder(delivery_id=delivery.id, order_id=oid))

    # 7) Business checks: future date & unique slot
    if delivery.scheduled_date:
        combined = datetime.combine(
            delivery.scheduled_date,
            delivery.scheduled_time or datetime.min.time()
        )
        now = datetime.now()
        if combined <= now:
            # If this is a status update and the delivery is being marked as delayed,
            # allow it even if the date is in the past
            if not (status_changed and delivery.status in CANCELLED_STATUSES and delivery.delayed):
                return jsonify({"error": "Delivery must be scheduled in the future"}), 400
            
            # If we're updating to a past date, set the delayed flag if not already set
            if not delivery.delayed:
                delivery.delayed = True
                # Log the delay in history
                history = DeliveryHistory(
                    delivery_id=delivery.id,
                    status=delivery.status,
                    changed_by=current_user_id,
                    notes="Delivery marked as delayed due to past scheduled date"
                )
                db.session.add(history)

    clash = Delivery.query.filter(
        Delivery.id != delivery.id,
        Delivery.truck_id == delivery.truck_id,
        Delivery.scheduled_date == delivery.scheduled_date,
        Delivery.scheduled_time == delivery.scheduled_time
    ).first()
    if clash:
        return jsonify({"error": "Truck already booked for this time"}), 400

    # Handle status changes and update associated orders
    if status_changed:
        new_status = delivery.status.lower() if delivery.status else None
        old_status = prev_status
        
        # Get all orders associated with this delivery
        order_links = DeliveryOrder.query.filter_by(delivery_id=delivery.id).all()
        order_ids = [link.order_id for link in order_links]
        
        # Handle different status transitions
        if new_status == 'livrée':
            # When delivery is marked as delivered, update all associated orders to 'livrée'
            for order_id in order_ids:
                order = Order.query.get(order_id)
                if order:
                    order.status = 'livrée'
                    db.session.add(order)
        
        elif new_status in CANCELLED_STATUSES:
            # When delivery is cancelled, check each order to see if it should be reverted to 'en attente'
            for order_id in order_ids:
                order = Order.query.get(order_id)
                if order:
                    # Check if this order has other active deliveries
                    other_deliveries = db.session.query(Delivery).join(
                        DeliveryOrder, Delivery.id == DeliveryOrder.delivery_id
                    ).filter(
                        DeliveryOrder.order_id == order_id,
                        Delivery.id != delivery.id,
                        ~func.lower(Delivery.status).in_(CANCELLED_STATUSES + ['livrée'])
                    ).count()
                    
                    # If no other active deliveries, revert to 'en attente'
                    if other_deliveries == 0:
                        order.status = 'en attente'
                        db.session.add(order)

        elif new_status == 'en cours' and old_status not in CANCELLED_STATUSES:
            # When delivery is in progress, mark orders as 'en cours'
            for order_id in order_ids:
                order = Order.query.get(order_id)

                if order and order.status and order.status.lower() in ['planifié', 'en attente']:

               

                    order.status = 'en cours'
                    db.session.add(order)

        elif new_status in ['programmé', 'en cours'] and old_status in CANCELLED_STATUSES:
            # When reactivating a cancelled delivery, update orders to 'planifié'
            for order_id in order_ids:
                order = Order.query.get(order_id)
                if order and order.status and order.status.lower() == 'en attente':
                    order.status = 'planifié'
                    db.session.add(order)
        
        # Also handle the legacy single order_id if it exists
        if delivery.order_id and delivery.order_id not in order_ids:
            order_ids.append(delivery.order_id)
            
            if new_status == 'livrée':
                legacy_order = Order.query.get(delivery.order_id)
                if legacy_order:
                    legacy_order.status = 'livrée'
                    db.session.add(legacy_order)
            elif new_status in CANCELLED_STATUSES:
                # For legacy orders, just revert to 'en attente' when delivery is cancelled
                legacy_order = Order.query.get(delivery.order_id)
                if legacy_order:
                    legacy_order.status = 'en attente'
                    db.session.add(legacy_order)

    # 8) Commit
    try:
        db.session.commit()
        
        # Return the updated delivery with its history
        delivery_data = {
            'id': delivery.id,
            'status': delivery.status,
            'delayed': delivery.delayed,
            'history': [{
                'id': h.id,
                'status': h.status,
                'changed_at': h.changed_at.isoformat(),
                'changed_by': h.user.username if h.user else None,
                'notes': h.notes
            } for h in delivery.history]
        }
        
        return jsonify({"message": "Delivery updated", "delivery": delivery_data}), 200
    except Exception as e:
        db.session.rollback()
        logging.exception("Failed to update delivery")
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
            
        # Get the delivery with its orders
        delivery = Delivery.query.options(
            db.joinedload(Delivery.orders)
        ).get(delivery_uuid)
        
        if not delivery:
            return jsonify({"message": "Delivery not found"}), 404
        
        # Get all order IDs associated with this delivery
        order_links = DeliveryOrder.query.filter_by(delivery_id=delivery.id).all()
        order_ids = [link.order_id for link in order_links]
        
        # Delete the delivery-order associations
        DeliveryOrder.query.filter_by(delivery_id=delivery.id).delete()
        
        # For each order, check if it should be reverted to 'en attente'
        for order_id in order_ids:
            order = Order.query.get(order_id)
            if order:
                # Check if this order has other active deliveries
                other_deliveries = db.session.query(Delivery).join(
                    DeliveryOrder, Delivery.id == DeliveryOrder.delivery_id
                ).filter(
                    DeliveryOrder.order_id == order_id,
                    Delivery.id != delivery.id,
                    ~func.lower(Delivery.status).in_(CANCELLED_STATUSES + ['livrée'])
                ).count()
                
                # If no other active deliveries, revert to 'en attente'
                if other_deliveries == 0 and (order.status or '').lower() != 'livrée':
                    order.status = 'en attente'
                    db.session.add(order)
        
        # Handle the legacy single order_id if it exists
        if delivery.order_id and delivery.order_id not in order_ids:
            legacy_order = Order.query.get(delivery.order_id)
            if legacy_order and (legacy_order.status or '').lower() != 'livrée':
                legacy_order.status = 'en attente'
                db.session.add(legacy_order)
        
        # Finally, delete the delivery
        db.session.delete(delivery)
        db.session.commit()
        logging.info(f"Delivery deleted with ID: {delivery.id}")
        return jsonify({"message": "Delivery deleted"}), 200
    except Exception as e:
        logging.exception("Exception occurred while deleting delivery")
        return jsonify({"error": "Server error", "details": str(e)}), 500
