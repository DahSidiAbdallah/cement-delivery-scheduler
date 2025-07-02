import sqlite3
from app import create_app
from app.extensions import db

def add_missing_columns():
    app = create_app()
    with app.app_context():
        # Connect to the database
        conn = db.engine.connect()
        
        try:
            # Check if delivery_history table exists
            result = conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='delivery_history'"
            ).fetchone()
            
            if not result:
                print("Creating delivery_history table...")
                # Create the delivery_history table
                conn.execute("""
                    CREATE TABLE delivery_history (
                        id CHAR(32) NOT NULL, 
                        delivery_id CHAR(32), 
                        status VARCHAR(20) NOT NULL, 
                        changed_by CHAR(32), 
                        changed_at DATETIME DEFAULT (CURRENT_TIMESTAMP), 
                        notes TEXT, 
                        PRIMARY KEY (id), 
                        FOREIGN KEY(delivery_id) REFERENCES deliveries (id) ON DELETE CASCADE, 
                        FOREIGN KEY(changed_by) REFERENCES users (id) ON DELETE SET NULL
                    )
                """)
                print("Created delivery_history table")
            
            # Check if delayed column exists in deliveries table
            result = conn.execute(
                "PRAGMA table_info(deliveries)"
            ).fetchall()
            
            has_delayed = any(col[1] == 'delayed' for col in result)
            
            if not has_delayed:
                print("Adding delayed column to deliveries table...")
                conn.execute("ALTER TABLE deliveries ADD COLUMN delayed BOOLEAN DEFAULT 0")
                print("Added delayed column to deliveries table")
            
            # Commit changes
            conn.execute("COMMIT")
            print("Database schema updated successfully!")
            
        except Exception as e:
            print(f"Error updating database schema: {e}")
            conn.execute("ROLLBACK")
            raise
        finally:
            conn.close()

if __name__ == "__main__":
    add_missing_columns()
