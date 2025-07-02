import sqlite3
import os

def check_database():
    db_path = 'instance/app.db'
    if not os.path.exists(db_path):
        print(f"Error: Database file not found at {db_path}")
        return
    
    print(f"\n=== Database Schema Check ===\n")
    
    # Connect to the database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Get all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_alembic_%' AND name != 'alembic_version';")
    tables = [row[0] for row in cursor.fetchall()]
    
    # Expected tables and columns
    expected_schema = {
        'clients': ['id', 'name', 'priority_level', 'contact_info', 'address'],
        'products': ['id', 'name', 'type'],
        'trucks': ['id', 'plate_number', 'capacity', 'driver_name'],
        'orders': ['id', 'client_id', 'product_id', 'quantity', 'requested_date', 'requested_time', 'status'],
        'delivery_history': ['id', 'delivery_id', 'status', 'changed_by', 'changed_at', 'notes', 'previous_data', 'change_type'],
        'deliveries': ['id', 'order_id', 'truck_id', 'external_truck_label', 'is_external', 'scheduled_date', 'scheduled_time', 'status', 'destination', 'notes', 'delayed', 'last_updated'],
        'delivery_orders': ['delivery_id', 'order_id', 'quantity', 'quantity_deducted'],
        'users': ['id', 'username', 'password_hash', 'role']
    }
    
    # Check for missing tables
    missing_tables = set(expected_schema.keys()) - set(tables)
    if missing_tables:
        print("❌ Missing tables in database:")
        for table in sorted(missing_tables):
            print(f"  - {table}")
    else:
        print("✅ All expected tables exist")
    
    # Check each table's columns
    print("\n=== Column Validation ===")
    all_ok = True
    for table, expected_columns in expected_schema.items():
        if table not in tables:
            continue
            
        cursor.execute(f"PRAGMA table_info({table});")
        db_columns = [row[1] for row in cursor.fetchall()]
        
        missing_columns = set(expected_columns) - set(db_columns)
        extra_columns = set(db_columns) - set(expected_columns)
        
        if missing_columns or extra_columns:
            all_ok = False
            print(f"\n❌ {table}:")
            if missing_columns:
                print(f"  Missing columns: {', '.join(sorted(missing_columns))}")
            if extra_columns:
                print(f"  Extra columns: {', '.join(sorted(extra_columns))}")
        else:
            print(f"\n✅ {table}: Columns match expected schema")
    
    if all_ok and not missing_tables:
        print("\n🎉 Database schema matches the models!")
    
    # Print row counts
    print("\n=== Row Counts ===")
    for table in sorted(tables):
        try:
            cursor.execute(f"SELECT COUNT(*) FROM {table};")
            count = cursor.fetchone()[0]
            print(f"{table}: {count} rows")
        except:
            print(f"{table}: Could not get row count")
    
    conn.close()

if __name__ == "__main__":
    check_database()
