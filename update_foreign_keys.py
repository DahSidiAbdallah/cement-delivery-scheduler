"""
Script to update foreign key constraints for delivery_orders table in SQLite.
This creates a new table with the correct constraints and migrates the data.
"""
import sys
import os
from sqlalchemy import text

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db

def update_foreign_keys():
    app = create_app()
    with app.app_context():
        connection = db.engine.connect()
        trans = connection.begin()
        
        try:
            print("Starting database migration for SQLite...")
            
            # 1. Create a new table with the correct constraints
            print("Creating new delivery_orders table with proper constraints...")
            
            # First, drop the new table if it exists from a previous failed migration
            connection.execute(text("""
                DROP TABLE IF EXISTS new_delivery_orders
            """))
            
            # Create new table with proper constraints
            connection.execute(text("""
                CREATE TABLE new_delivery_orders (
                    delivery_id BLOB NOT NULL,
                    order_id BLOB NOT NULL,
                    quantity FLOAT NOT NULL DEFAULT 0,
                    quantity_deducted BOOLEAN NOT NULL DEFAULT 0,
                    PRIMARY KEY (delivery_id, order_id),
                    FOREIGN KEY (delivery_id) REFERENCES deliveries (id) ON DELETE CASCADE,
                    FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
                )
            """))
            
            # 2. Copy data from old table to new table
            print("Migrating data to new table...")
            connection.execute(text("""
                INSERT INTO new_delivery_orders (delivery_id, order_id, quantity, quantity_deducted)
                SELECT delivery_id, order_id, quantity, quantity_deducted FROM delivery_orders
            """))
            
            # 3. Drop the old table
            print("Dropping old table...")
            connection.execute(text("DROP TABLE delivery_orders"))
            
            # 4. Rename new table to original name
            print("Renaming new table...")
            connection.execute(text("ALTER TABLE new_delivery_orders RENAME TO delivery_orders"))
            
            # 5. Recreate indexes if needed
            print("Recreating indexes...")
            connection.execute(text("""
                CREATE INDEX ix_delivery_orders_delivery_id ON delivery_orders (delivery_id)
            """))
            connection.execute(text("""
                CREATE INDEX ix_delivery_orders_order_id ON delivery_orders (order_id)
            """))
            
            # Commit the transaction
            trans.commit()
            print("Successfully updated database schema with CASCADE constraints.")
            
        except Exception as e:
            print(f"Error during migration: {str(e)}")
            trans.rollback()
            print("Migration rolled back due to error.")
            raise
        finally:
            connection.close()

if __name__ == "__main__":
    print("Starting database migration...")
    update_foreign_keys()
    print("Migration completed.")
