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

class Delivery(db.Model):
    __tablename__ = 'deliveries'
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # Single order_id kept for backward compatibility but optional
    order_id = db.Column(UUID(as_uuid=True), db.ForeignKey('orders.id'), nullable=True)
    truck_id = db.Column(UUID(as_uuid=True), db.ForeignKey('trucks.id'))
    scheduled_date = db.Column(db.Date)
    scheduled_time = db.Column(db.Time)
    status = db.Column(db.String(20), default="Scheduled")

    orders = db.relationship('Order', secondary='delivery_orders', backref='deliveries')
    order_links = db.relationship('DeliveryOrder', backref='delivery', cascade='all, delete-orphan')


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
