import sqlite3
import os
from tabulate import tabulate

def get_db_schema(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Get all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [row[0] for row in cursor.fetchall() if not row[0].startswith('sqlite_')]
    
    # Get columns for each table
    schema = {}
    for table in tables:
        cursor.execute(f"PRAGMA table_info({table});")
        columns = [row[1] for row in cursor.fetchall()]
        schema[table] = columns
    
    conn.close()
    return schema

def main():
    db_path = 'instance/app.db'
    if not os.path.exists(db_path):
        print(f"Error: Database file not found at {db_path}")
        return
    
    print(f"\nChecking schema for database: {db_path}\n")
    
    # Get actual database schema
    db_schema = get_db_schema(db_path)
    
    # Expected tables and columns based on models
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
    missing_tables = set(expected_schema.keys()) - set(db_schema.keys())
    extra_tables = set(db_schema.keys()) - set(expected_schema.keys())
    
    if missing_tables:
        print("❌ Missing tables in database:")
        for table in sorted(missing_tables):
            print(f"  - {table}")
    
    if extra_tables:
        print("\nℹ️  Extra tables in database (not in models):")
        for table in sorted(extra_tables):
            print(f"  - {table}")
    
    # Check columns for each table
    print("\n🔍 Checking table columns...")
    mismatches = []
    for table, expected_columns in expected_schema.items():
        if table not in db_schema:
            continue
            
        db_columns = db_schema[table]
        missing_columns = set(expected_columns) - set(db_columns)
        extra_columns = set(db_columns) - set(expected_columns)
        
        if missing_columns or extra_columns:
            mismatches.append({
                'table': table,
                'missing_columns': sorted(list(missing_columns)) if missing_columns else None,
                'extra_columns': sorted(list(extra_columns)) if extra_columns else None
            })
    
    # Report column mismatches
    if mismatches:
        print("\n❌ Column mismatches found:")
        for mismatch in mismatches:
            print(f"\nTable: {mismatch['table']}")
            if mismatch['missing_columns']:
                print(f"  Missing columns: {', '.join(mismatch['missing_columns'])}")
            if mismatch['extra_columns']:
                print(f"  Extra columns: {', '.join(mismatch['extra_columns'])}")
    else:
        print("\n✅ All tables and columns match the expected schema!")
    
    # Print schema summary
    print("\n=== Database Schema Summary ===\n")
    table_data = []
    for table in sorted(db_schema.keys()):
        table_data.append([table, len(db_schema[table]), ", ".join(db_schema[table])])
    
    print(tabulate(table_data, headers=["Table", "Columns", "Column Names"], tablefmt="grid"))

if __name__ == "__main__":
    main()
