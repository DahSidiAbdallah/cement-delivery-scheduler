from app import create_app
from app.extensions import db
from app.models import Delivery

app = create_app()
with app.app_context():
    # Get the table definition
    inspector = db.inspect(db.engine)
    columns = inspector.get_columns('deliveries')
    print("Columns in 'deliveries' table:")
    for col in columns:
        print(f"- {col['name']}: {col['type']} (nullable: {col['nullable']})")
    
    # Check if order_id is in the model but not in the database
    print("\nDelivery model columns:")
    for col in Delivery.__table__.columns:
        print(f"- {col.name}: {col.type} (nullable: {col.nullable})")
