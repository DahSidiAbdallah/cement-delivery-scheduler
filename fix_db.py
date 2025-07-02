import sqlite3
import os

def fix_database():
    db_path = 'instance/app.db'
    
    # Make a backup just in case
    backup_path = f"{db_path}.backup2"
    if os.path.exists(db_path):
        with open(db_path, 'rb') as src, open(backup_path, 'wb') as dst:
            dst.write(src.read())
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if delivery_history table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='delivery_history'")
        if not cursor.fetchone():
            print("Creating delivery_history table...")
            cursor.execute("""
                CREATE TABLE delivery_history (
                    id CHAR(32) PRIMARY KEY,
                    delivery_id CHAR(32),
                    status VARCHAR(20) NOT NULL,
                    changed_by CHAR(32),
                    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    notes TEXT,
                    FOREIGN KEY(delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE,
                    FOREIGN KEY(changed_by) REFERENCES users(id) ON DELETE SET NULL
                )
            """)
            print("Created delivery_history table")
        
        # Check if delayed column exists in deliveries
        cursor.execute("PRAGMA table_info(deliveries)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'delayed' not in columns:
            print("Adding delayed column to deliveries...")
            cursor.execute("ALTER TABLE deliveries ADD COLUMN delayed BOOLEAN DEFAULT 0")
            print("Added delayed column")
        
        conn.commit()
        print("Database updated successfully!")
        
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    fix_database()
