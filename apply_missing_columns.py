import os
import sys
import sqlite3
from sqlalchemy import create_engine, MetaData, Table, Column, String, Boolean, text
from sqlalchemy.exc import OperationalError

def check_and_add_columns():
    # Get database path
    db_path = os.path.join('instance', 'app.db')
    if not os.path.exists(db_path):
        print(f"Error: Database file not found at {db_path}")
        return False
    
    # Create SQLAlchemy engine
    engine = create_engine(f'sqlite:///{db_path}')
    metadata = MetaData()
    
    # Reflect the deliveries table
    try:
        deliveries = Table('deliveries', metadata, autoload_with=engine)
    except Exception as e:
        print(f"Error accessing 'deliveries' table: {e}")
        return False
    
    # Check if columns already exist
    columns = [col.name for col in deliveries.columns]
    
    # SQLite requires a different approach for adding columns with defaults
    conn = sqlite3.connect('instance/app.db')
    cursor = conn.cursor()
    
    try:
        # Check if columns exist and add them if needed
        cursor.execute("PRAGMA table_info(deliveries);")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'external_truck_label' not in columns:
            print("Adding column 'external_truck_label' to 'deliveries' table...")
            cursor.execute("ALTER TABLE deliveries ADD COLUMN external_truck_label TEXT")
            
        if 'is_external' not in columns:
            print("Adding column 'is_external' to 'deliveries' table...")
            cursor.execute("ALTER TABLE deliveries ADD COLUMN is_external BOOLEAN DEFAULT 0")
        
        conn.commit()
        print("\n✅ Database schema updated successfully!")
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"\n❌ Error updating database schema: {e}")
        return False
    finally:
        conn.close()

def main():
    print("=== Database Schema Updater ===\n")
    print("Checking for missing columns in 'deliveries' table...\n")
    
    success = check_and_add_columns()
    
    if success:
        print("\nVerifying the update...")
        # Verify the changes
        engine = create_engine(f'sqlite:///instance/app.db')
        with engine.connect() as conn:
            result = conn.execute("PRAGMA table_info(deliveries);")
            columns = [row[1] for row in result]
            
            print("\nCurrent columns in 'deliveries' table:")
            for col in columns:
                print(f"- {col}")
            
            missing = []
            if 'external_truck_label' not in columns:
                missing.append('external_truck_label')
            if 'is_external' not in columns:
                missing.append('is_external')
                
            if missing:
                print(f"\n❌ Some columns are still missing: {', '.join(missing)}")
                sys.exit(1)
            else:
                print("\n✅ All required columns are present in the 'deliveries' table.")
    
    print("\nDone!")

if __name__ == "__main__":
    main()
