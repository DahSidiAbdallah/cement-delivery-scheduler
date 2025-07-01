from .extensions import db
import uuid
from datetime import datetime
from sqlalchemy.dialects.postgresql import UUID
from werkzeug.security import generate_password_hash, check_password_hash

class Client(db.Model):
    __tablename__ = 'clients'
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = db.Column(db.String(100), nullable=False)
    priority_level = db.Column(db.Integer, nullable=False, default=1)
    contact_info = db.Column(db.String(150))
    address = db.Column(db.String(200))

class Product(db.Model):
    __tablename__ = 'products'
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = db.Column(db.String(50), nullable=False)
    type = db.Column(db.String(50))

class Truck(db.Model):
    __tablename__ = 'trucks'
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plate_number = db.Column(db.String(20), nullable=False)
    capacity = db.Column(db.Float)
    driver_name = db.Column(db.String(100))

class Order(db.Model):
    __tablename__ = 'orders'
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = db.Column(UUID(as_uuid=True), db.ForeignKey('clients.id'), nullable=False)
    product_id = db.Column(UUID(as_uuid=True), db.ForeignKey('products.id'), nullable=False)
    quantity = db.Column(db.Float, nullable=False)
    requested_date = db.Column(db.Date, nullable=False)
    requested_time = db.Column(db.Time)
    status = db.Column(db.String(20), nullable=False, default="Pending")
    client = db.relationship('Client', backref='orders')  # <--- add this line!

class DeliveryHistory(db.Model):
    __tablename__ = 'delivery_history'
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    delivery_id = db.Column(UUID(as_uuid=True), db.ForeignKey('deliveries.id', ondelete='CASCADE'), nullable=False)
    status = db.Column(db.String(20), nullable=False)
    changed_by = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    changed_at = db.Column(db.DateTime, nullable=False, server_default=db.func.now())
    notes = db.Column(db.Text, nullable=True)
    previous_data = db.Column(db.JSON, nullable=True)  # Store previous delivery data as JSON
    change_type = db.Column(db.String(20), nullable=False, default='status_change')  # status_change, reschedule, etc.
    
    # Relationships
    user = db.relationship('User')
    
    @classmethod
    def log_change(cls, delivery, changed_by_id, status, notes=None, previous_data=None, change_type='status_change'):
        """Helper method to log delivery changes"""
        history = cls(
            delivery_id=delivery.id,
            status=status,
            changed_by=changed_by_id,
            notes=notes,
            previous_data=previous_data,
            change_type=change_type
        )
        db.session.add(history)
        return history

class Delivery(db.Model):
    __tablename__ = 'deliveries'
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # Single order_id kept for backward compatibility but optional
    order_id = db.Column(UUID(as_uuid=True), db.ForeignKey('orders.id'), nullable=True)
    truck_id = db.Column(UUID(as_uuid=True), db.ForeignKey('trucks.id'))
    scheduled_date = db.Column(db.Date)
    scheduled_time = db.Column(db.Time)
    status = db.Column(db.String(20), default="Scheduled")
    destination = db.Column(db.String(200), nullable=False)
    notes = db.Column(db.Text, nullable=True)
    delayed = db.Column(db.Boolean, default=False, nullable=False)
    last_updated = db.Column(db.DateTime, onupdate=db.func.now())
    
    # Relationships
    orders = db.relationship('Order', secondary='delivery_orders', backref='deliveries')
    order_links = db.relationship('DeliveryOrder', backref='delivery', cascade='all, delete-orphan')
    history = db.relationship('DeliveryHistory', backref='delivery', cascade='all, delete-orphan', 
                             order_by='desc(DeliveryHistory.changed_at)')
    truck = db.relationship('Truck')
    
    def log_status_change(self, user_id, new_status, notes=None, previous_data=None):
        """Log a status change in the delivery history"""
        change_type = 'status_change'
        if previous_data and any(field in previous_data for field in ['scheduled_date', 'scheduled_time', 'truck_id']):
            change_type = 'reschedule'
            
        return DeliveryHistory.log_change(
            delivery=self,
            changed_by_id=user_id,
            status=new_status,
            notes=notes,
            previous_data=previous_data,
            change_type=change_type
        )
    
    def update_status(self, new_status, user_id, notes=None):
        """Update delivery status and log the change"""
        if self.status == new_status:
            return False
            
        previous_status = self.status
        self.status = new_status
        
        # Log the status change
        self.log_status_change(user_id, new_status, notes, {'status': previous_status})
        
        # Update related orders status if needed
        self._update_related_orders_status()
        
        return True
    
    def reschedule(self, new_date=None, new_time=None, truck_id=None, user_id=None, notes=None):
        """Reschedule a delivery and log the changes"""
        changes = {}
        
        if new_date and new_date != self.scheduled_date:
            changes['scheduled_date'] = str(self.scheduled_date) if self.scheduled_date else None
            self.scheduled_date = new_date
            
        if new_time and new_time != self.scheduled_time:
            changes['scheduled_time'] = str(self.scheduled_time) if self.scheduled_time else None
            self.scheduled_time = new_time
            
        if truck_id and truck_id != self.truck_id:
            changes['truck_id'] = str(self.truck_id) if self.truck_id else None
            self.truck_id = truck_id
            
        if not changes:
            return False  # No changes made
            
        # Log the reschedule
        change_notes = notes or "Delivery rescheduled"
        self.log_status_change(
            user_id=user_id,
            new_status=self.status,
            notes=change_notes,
            previous_data=changes
        )
        
        return True
    
    def _update_related_orders_status(self):
        """Update status of related orders based on delivery status"""
        if not self.orders:
            return
            
        for order in self.orders:
            if self.status.lower() == 'annulée':
                order.status = 'annulée'
            elif self.status.lower() == 'en cours':
                if order.status.lower() in ['planifié', 'en attente']:
                    order.status = 'en cours'
            elif self.status.lower() == 'livrée':
                order.status = 'livrée'
            db.session.add(order)


class DeliveryOrder(db.Model):
    __tablename__ = 'delivery_orders'
    delivery_id = db.Column(UUID(as_uuid=True), db.ForeignKey('deliveries.id'), primary_key=True)
    order_id = db.Column(UUID(as_uuid=True), db.ForeignKey('orders.id'), primary_key=True)

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(20), nullable=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
