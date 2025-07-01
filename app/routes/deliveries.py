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

        order_quantities = data.get('order_quantities', {})

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
        
        # Add order associations and handle quantity deductions
        active_statuses = ['programmé', 'en cours']
        for oid in order_ids:
            order = Order.query.get(oid)
            if not order:
                continue

            qty = order_quantities.get(str(oid))
            if qty is None:
                qty = order.quantity

            try:
                qty = float(qty)
            except (ValueError, TypeError):
                return jsonify({"error": f"Invalid quantity for order {oid}"}), 400

            if qty > order.quantity:
                return jsonify({"error": f"Quantity {qty} exceeds remaining for order {oid}"}), 400

            link = DeliveryOrder(delivery_id=new_delivery.id, order_id=oid, quantity=qty)

            if status in active_statuses:
                order.quantity -= qty
                link.quantity_deducted = True
                if order.status and order.status.lower() == 'en attente':
                    order.status = 'planifié'
                db.session.add(order)

            db.session.add(link)
        
        db.session.commit()
        logging.info(f"Delivery created with ID: {new_delivery.id}")
        
        # Return the created delivery with its history
        delivery_data = {
            'id': str(new_delivery.id),
            'status': new_delivery.status,
            'delayed': new_delivery.delayed,
            'order_quantities': {str(link.order_id): link.quantity for link in new_delivery.order_links},
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
                'delayed': delivery.delayed,
                'order_quantities': {str(l.order_id): l.quantity for l in delivery.order_links}
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
    
    # Store original data for history and change detection
    original_data = {
        'scheduled_date': delivery.scheduled_date,
        'scheduled_time': delivery.scheduled_time,
        'truck_id': delivery.truck_id,
        'status': delivery.status,
        'destination': delivery.destination,
        'notes': delivery.notes
    }

    # 3) Get current user and validate
    current_user_id = get_jwt_identity()
    try:
        if isinstance(current_user_id, str):
            current_user_id = uuid.UUID(current_user_id)
    except (ValueError, AttributeError):
        return jsonify({"error": "Invalid user ID format"}), 400
        
    # Check for rescheduling (date, time, or truck changes)
    is_rescheduling = False
    reschedule_details = []
    
    # 4) Handle status changes and log history
    status_changed = False
    prev_status = delivery.status.lower() if delivery.status else ''
    new_status_raw = data.get('status')
    new_status = new_status_raw.lower() if new_status_raw else None

    if new_status is not None and new_status != prev_status:
        # Log the status change in history
        change_notes = []
        
        # Add status change note
        status_note = f"Statut modifié de {delivery.status} à {new_status}"
        change_notes.append(status_note)
        
        # Check for special status transitions
        if new_status in CANCELLED_STATUSES and prev_status in ['programmé', 'en cours']:
            delivery.delayed = True
            change_notes.append("Livraison marquée comme retardée")
            
        # Create history entry
        history = DeliveryHistory(
            delivery_id=delivery.id,
            status=new_status,
            changed_by=current_user_id,
            change_type='status_change',
            previous_data={
                'status': delivery.status,
                'changed_at': datetime.utcnow().isoformat(),
                'changed_by': str(current_user_id)
            },
            notes=' | '.join(change_notes)
        )
        db.session.add(history)

        # Update the status
        delivery.status = new_status
        status_changed = True

        # Adjust order quantities based on new status
        active_statuses = ['programmé', 'en cours']
        if new_status in active_statuses and prev_status not in active_statuses:
            for link in delivery.order_links:
                if not link.quantity_deducted:
                    order = Order.query.get(link.order_id)
                    if order and link.quantity <= order.quantity:
                        order.quantity -= link.quantity
                        link.quantity_deducted = True
                        if order.status and order.status.lower() == 'en attente':
                            order.status = 'planifié'
                        db.session.add(order)
        elif new_status in CANCELLED_STATUSES and prev_status in active_statuses:
            for link in delivery.order_links:
                if link.quantity_deducted:
                    order = Order.query.get(link.order_id)
                    if order:
                        order.quantity += link.quantity
                        link.quantity_deducted = False
                        db.session.add(order)
    
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
        conv_ids = []
        for oid in data['order_ids'] or []:
            try:
                conv_ids.append(uuid.UUID(oid))
            except (ValueError, TypeError):
                return jsonify({"error": f"Invalid order ID format: {oid}"}), 400

        order_quantities = data.get('order_quantities', {})
        active_statuses = ['programmé', 'en cours']

        # rollback quantities for existing links if deducted
        existing_links = DeliveryOrder.query.filter_by(delivery_id=delivery.id).all()
        for link in existing_links:
            if link.quantity_deducted:
                order = Order.query.get(link.order_id)
                if order:
                    order.quantity += link.quantity
                    db.session.add(order)

        DeliveryOrder.query.filter_by(delivery_id=delivery.id).delete()

        for oid in conv_ids:
            order = Order.query.get(oid)
            if not order:
                continue

            qty = order_quantities.get(str(oid))
            if qty is None:
                qty = order.quantity

            try:
                qty = float(qty)
            except (ValueError, TypeError):
                return jsonify({"error": f"Invalid quantity for order {oid}"}), 400

            if qty > order.quantity:
                return jsonify({"error": f"Quantity {qty} exceeds remaining for order {oid}"}), 400

            link = DeliveryOrder(delivery_id=delivery.id, order_id=oid, quantity=qty)
            if (new_status or prev_status) in active_statuses:
                order.quantity -= qty
                link.quantity_deducted = True
                if order.status and order.status.lower() == 'en attente':
                    order.status = 'planifié'
                db.session.add(order)

            db.session.add(link)

    # 7) Check for rescheduling (date, time, or truck changes)
    if any(field in data for field in ['scheduled_date', 'scheduled_time', 'truck_id']):
        # Check what exactly changed
        changes = []
        
        if 'scheduled_date' in data and str(original_data['scheduled_date']) != str(delivery.scheduled_date):
            changes.append(f"Date: {original_data['scheduled_date']} → {delivery.scheduled_date}")
            is_rescheduling = True
            
        if 'scheduled_time' in data and str(original_data.get('scheduled_time') or '') != str(delivery.scheduled_time or ''):
            changes.append(f"Heure: {original_data.get('scheduled_time')} → {delivery.scheduled_time}")
            is_rescheduling = True
            
        if 'truck_id' in data and str(original_data.get('truck_id') or '') != str(delivery.truck_id or ''):
            old_truck = Truck.query.get(original_data.get('truck_id'))
            new_truck = Truck.query.get(delivery.truck_id) if delivery.truck_id else None
            changes.append(f"Camion: {getattr(old_truck, 'plate_number', 'Aucun')} → {getattr(new_truck, 'plate_number', 'Aucun')}")
            is_rescheduling = True
        
        if is_rescheduling and changes:
            # Create a history entry for the reschedule
            history = DeliveryHistory(
                delivery_id=delivery.id,
                status=delivery.status,
                changed_by=current_user_id,
                change_type='reschedule',
                previous_data={
                    'scheduled_date': original_data['scheduled_date'].isoformat() if original_data['scheduled_date'] else None,
                    'scheduled_time': str(original_data['scheduled_time']) if original_data['scheduled_time'] else None,
                    'truck_id': str(original_data['truck_id']) if original_data['truck_id'] else None,
                    'changed_at': datetime.utcnow().isoformat(),
                    'changed_by': str(current_user_id)
                },
                notes="Reprogrammation de la livraison: " + ", ".join(changes)
            )
            db.session.add(history)
            
            # If rescheduling to a future date and status was delayed, clear the delay
            if delivery.delayed and delivery.scheduled_date and delivery.scheduled_date >= datetime.utcnow().date():
                delivery.delayed = False
                history.notes += " | Retard annulé (nouvelle date dans le futur)"
    
    # 8) Business checks: future date & unique slot
    if delivery.scheduled_date:
        combined = datetime.combine(
            delivery.scheduled_date,
            delivery.scheduled_time or datetime.min.time()
        )
        now = datetime.now()
        
        if combined <= now and not (status_changed and delivery.status in CANCELLED_STATUSES):
            # If we're updating to a past date, set the delayed flag if not already set
            if not delivery.delayed:
                delivery.delayed = True
                # Log the delay in history
                history = DeliveryHistory(
                    delivery_id=delivery.id,
                    status=delivery.status,
                    changed_by=current_user_id,
                    change_type='delay',
                    notes="Livraison marquée comme retardée (date/heure dans le passé)",
                    previous_data={
                        'delayed': False,
                        'changed_at': datetime.utcnow().isoformat(),
                        'changed_by': str(current_user_id)
                    }
                )
                db.session.add(history)
            
            # Only block if this is not a status update to a cancelled status
            if not (status_changed and delivery.status in CANCELLED_STATUSES):
                return jsonify({
                    "error": "La livraison doit être programmée dans le futur",
                    "code": "PAST_DELIVERY_DATE"
                }), 400

    # Check for scheduling conflicts
    if delivery.truck_id and delivery.scheduled_date:
        clash = Delivery.query.filter(
            Delivery.id != delivery.id,
            Delivery.truck_id == delivery.truck_id,
            Delivery.scheduled_date == delivery.scheduled_date,
            Delivery.scheduled_time == delivery.scheduled_time,
            ~Delivery.status.in_(CANCELLED_STATUSES + ['livrée'])
        ).first()
        
        if clash:
            return jsonify({"error": "Truck already booked for this time"}), 400
    
    # Commit all changes
    try:
        db.session.commit()
        
        # Get the latest history for the response
        latest_history = DeliveryHistory.query.filter_by(delivery_id=delivery.id)\
            .order_by(DeliveryHistory.changed_at.desc())\
            .first()
        
        # Prepare response data
        response_data = {
            'message': 'Livraison mise à jour avec succès',
            'is_reschedule': is_rescheduling,
            'delivery': {
                'id': str(delivery.id),
                'status': delivery.status,
                'scheduled_date': delivery.scheduled_date.isoformat() if delivery.scheduled_date else None,
                'scheduled_time': delivery.scheduled_time.strftime('%H:%M') if delivery.scheduled_time else None,
                'truck_id': str(delivery.truck_id) if delivery.truck_id else None,
                'destination': delivery.destination,
                'notes': delivery.notes,
                'delayed': delivery.delayed,
                'last_updated': delivery.last_updated.isoformat() if delivery.last_updated else None,
                'order_quantities': {str(l.order_id): l.quantity for l in delivery.order_links}
            }
        }
        
        # Include previous data if this was a reschedule
        if delivery.history and len(delivery.history) > 0 and delivery.history[0].change_type == 'reschedule':
            response_data['previous_data'] = delivery.history[0].previous_data
        
        return jsonify(response_data), 200
        
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error updating delivery {delivery_id}: {str(e)}")
        return jsonify({'error': 'An error occurred while updating the delivery'}), 500
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

        # Roll back quantities if needed
        for link in order_links:
            if link.quantity_deducted:
                order = Order.query.get(link.order_id)
                if order:
                    order.quantity += link.quantity
                    db.session.add(order)

        
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
