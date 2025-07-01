import os
import json
from datetime import datetime
from sqlalchemy import text
from app import create_app
from app.extensions import db
from app.models import Delivery, DeliveryHistory, Order, DeliveryOrder

def update_delivery_schema():
    print("Starting database schema update...")
    
    # Create app context
    app = create_app()
    with app.app_context():
        # Check if the delivery_history table exists
        inspector = db.inspect(db.engine)
        columns = {col['name']: col for col in inspector.get_columns('delivery_history')}
        
        # Add previous_data column if it doesn't exist
        if 'previous_data' not in columns:
            print("Adding previous_data column to delivery_history...")
            db.session.execute(text('ALTER TABLE delivery_history ADD COLUMN previous_data JSON'))
        
        # Add change_type column if it doesn't exist
        if 'change_type' not in columns:
            print("Adding change_type column to delivery_history...")
            db.session.execute(text("""
                ALTER TABLE delivery_history 
                ADD COLUMN change_type VARCHAR(20) NOT NULL DEFAULT 'status_change'
            """))
        
        # Add delayed column to deliveries if it doesn't exist
        delivery_columns = {col['name']: col for col in inspector.get_columns('deliveries')}
        if 'delayed' not in delivery_columns:
            print("Adding delayed column to deliveries...")
            db.session.execute(text("""
                ALTER TABLE deliveries 
                ADD COLUMN delayed BOOLEAN NOT NULL DEFAULT FALSE
            """))
        
        # Add last_updated column to deliveries if it doesn't exist
        if 'last_updated' not in delivery_columns:
            print("Adding last_updated column to deliveries...")
            db.session.execute(text("""
                ALTER TABLE deliveries 
                ADD COLUMN last_updated TIMESTAMP
            """))
        
        # Add destination column to deliveries if it doesn't exist
        if 'destination' not in delivery_columns:
            print("Adding destination column to deliveries...")
            db.session.execute(text("""
                ALTER TABLE deliveries 
                ADD COLUMN destination VARCHAR(200)
            """))
            
            # Set default destination for existing records
            db.session.execute(text("""
                UPDATE deliveries 
                SET destination = 'N/A' 
                WHERE destination IS NULL
            """))
            
            # Make the column NOT NULL after setting defaults
            db.session.execute(text("""
                ALTER TABLE deliveries 
                ALTER COLUMN destination SET NOT NULL
            """))
        
        # Create delivery_orders table if it doesn't exist
        if 'delivery_orders' not in inspector.get_table_names():
            print("Creating delivery_orders table...")
            db.session.execute(text("""
                CREATE TABLE IF NOT EXISTS delivery_orders (
                    delivery_id UUID NOT NULL,
                    order_id UUID NOT NULL,
                    PRIMARY KEY (delivery_id, order_id),
                    FOREIGN KEY(delivery_id) REFERENCES deliveries (id) ON DELETE CASCADE,
                    FOREIGN KEY(order_id) REFERENCES orders (id) ON DELETE CASCADE
                )
            """))
            
            # Migrate existing order-delivery relationships
            print("Migrating order-delivery relationships...")
            deliveries = db.session.execute("""
                SELECT id, order_id FROM deliveries WHERE order_id IS NOT NULL
            """).fetchall()
            
            for delivery in deliveries:
                db.session.execute("""
                    INSERT INTO delivery_orders (delivery_id, order_id)
                    VALUES (:delivery_id, :order_id)
                    ON CONFLICT DO NOTHING
                """, {
                    'delivery_id': delivery[0],
                    'order_id': delivery[1]
                })
        
        # Commit all schema changes
        db.session.commit()
        
        # Update existing delivery history entries with change_type
        print("Updating existing delivery history entries...")
        db.session.execute(text("""
            UPDATE delivery_history
            SET change_type = 'status_change'
            WHERE change_type IS NULL OR change_type = ''
        """))
        
        # Update delivery status for consistency
        print("Updating delivery statuses...")
        db.session.execute(text("""
            UPDATE deliveries
            SET status = 'Scheduled'
            WHERE status IS NULL OR status = ''
        """))
        
        # Update last_updated for existing deliveries
        print("Updating last_updated timestamps...")
        db.session.execute(text("""
            UPDATE deliveries
            SET last_updated = CURRENT_TIMESTAMP
            WHERE last_updated IS NULL
        """))
        
        # Commit all data updates
        db.session.commit()
        
        print("\nDatabase schema update completed successfully!")

if __name__ == "__main__":
    update_delivery_schema()
