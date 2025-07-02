import sqlite3
import os

def check_and_add_columns():
    db_path = 'instance/app.db'
    if not os.path.exists(db_path):
        print(f"Error: Database file not found at {db_path}")
        return False
    
    print("Checking database schema...")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if columns exist
        cursor.execute("PRAGMA table_info(deliveries);")
        columns = [col[1] for col in cursor.fetchall()]
        
        changes_made = False
        
        # Add external_truck_label if it doesn't exist
        if 'external_truck_label' not in columns:
            print("Adding 'external_truck_label' column...")
            cursor.execute("ALTER TABLE deliveries ADD COLUMN external_truck_label TEXT;")
            changes_made = True
        
        # Add is_external if it doesn't exist
        if 'is_external' not in columns:
            print("Adding 'is_external' column...")
            cursor.execute("ALTER TABLE deliveries ADD COLUMN is_external BOOLEAN DEFAULT 0;")
            changes_made = True
        
        if changes_made:
            conn.commit()
            print("✅ Database schema updated successfully!")
        else:
            print("✅ All required columns already exist.")
            
        # Verify the changes
        cursor.execute("PRAGMA table_info(deliveries);")
        columns = [col[1] for col in cursor.fetchall()]
        
        print("\nCurrent columns in 'deliveries' table:")
        for col in columns:
            print(f"- {col}")
        
        return True
        
    except sqlite3.Error as e:
        print(f"❌ Database error: {e}")
        return False
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    print("=== Database Schema Updater ===\n")
    if check_and_add_columns():
        print("\n✅ Database check completed successfully!")
    else:
        print("\n❌ There were issues updating the database schema.")
        print("Please make sure the database is not in use by another process.")
