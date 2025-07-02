import sqlite3
import os
from datetime import datetime

def migrate_data():
    # Paths
    backup_db = 'instance/app.db.backup'
    new_db = 'instance/app.db'
    
    # Remove the new database if it exists
    if os.path.exists(new_db):
        os.remove(new_db)
    
    # Create a new database with the updated schema
    from app import create_app
    from app.extensions import db
    
    app = create_app()
    with app.app_context():
        db.create_all()
    
    # Connect to both databases
    conn_backup = sqlite3.connect(backup_db)
    conn_new = sqlite3.connect(new_db)
    
    # Get list of tables from backup
    cursor = conn_backup.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    tables = [row[0] for row in cursor.fetchall()]
    
    # Copy data from backup to new database
    for table in tables:
        if table == 'delivery_history':
            # Skip delivery_history as it might not exist in the backup
            continue
            
        print(f"Copying data from {table}...")
        
        # Get column names from the backup table
        cursor.execute(f"PRAGMA table_info({table})")
        columns = [col[1] for col in cursor.fetchall()]
        
        # Skip if no columns found (shouldn't happen)
        if not columns:
            print(f"  No columns found for {table}, skipping")
            continue
        
        # Get data from backup
        cursor.execute(f"SELECT * FROM {table}")
        rows = cursor.fetchall()
        
        if not rows:
            print(f"  No data in {table}, skipping")
            continue
        
        # Prepare and execute insert statements for the new database
        placeholders = ', '.join(['?'] * len(columns))
        columns_str = ', '.join(columns)
        insert_sql = f"INSERT INTO {table} ({columns_str}) VALUES ({placeholders})"
        
        new_cursor = conn_new.cursor()
        try:
            new_cursor.executemany(insert_sql, rows)
            conn_new.commit()
            print(f"  Copied {len(rows)} rows to {table}")
        except sqlite3.Error as e:
            print(f"  Error copying {table}: {e}")
            conn_new.rollback()
    
    # Close connections
    conn_backup.close()
    conn_new.close()
    
    print("\nData migration completed!")

if __name__ == "__main__":
    migrate_data()
