import sqlite3
from tabulate import tabulate
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker
from app import create_app
from app.models import db

# Initialize Flask app and SQLAlchemy
app = create_app()
app.app_context().push()

# Get database URI from config
DB_URI = app.config['SQLALCHEMY_DATABASE_URI']
engine = create_engine(DB_URI)
Session = sessionmaker(bind=engine)
session = Session()

# Get expected tables and columns from models
model_tables = {}
for model in db.Model.__subclasses__():
    if hasattr(model, '__tablename__'):
        table_name = model.__tablename__
        model_tables[table_name] = [column.name for column in model.__table__.columns]

# Get actual database schema
inspector = inspect(engine)
actual_tables = {}
for table_name in inspector.get_table_names():
    columns = [column['name'] for column in inspector.get_columns(table_name)]
    actual_tables[table_name] = columns

# Compare schemas
missing_tables = set(model_tables.keys()) - set(actual_tables.keys())
extra_tables = set(actual_tables.keys()) - set(model_tables.keys())

print("\n=== Schema Validation Report ===\n")

# Report missing tables
if missing_tables:
    print("❌ Missing tables in database:")
    for table in missing_tables:
        print(f"  - {table}")
    print()

# Report extra tables
if extra_tables:
    print("ℹ️  Extra tables in database (not in models):")
    for table in extra_tables:
        print(f"  - {table}")
    print()

# Compare columns for each table
mismatches = []
for table_name in model_tables:
    if table_name in actual_tables:
        model_columns = set(model_tables[table_name])
        db_columns = set(actual_tables[table_name])
        
        missing_columns = model_columns - db_columns
        extra_columns = db_columns - model_columns
        
        if missing_columns or extra_columns:
            mismatches.append({
                'table': table_name,
                'missing_columns': sorted(list(missing_columns)) if missing_columns else None,
                'extra_columns': sorted(list(extra_columns)) if extra_columns else None
            })

# Report column mismatches
if mismatches:
    print("🔍 Column mismatches:")
    for mismatch in mismatches:
        print(f"\nTable: {mismatch['table']}")
        if mismatch['missing_columns']:
            print(f"  Missing columns: {', '.join(mismatch['missing_columns'])}")
        if mismatch['extra_columns']:
            print(f"  Extra columns: {', '.join(mismatch['extra_columns'])}")
else:
    print("✅ All tables and columns match the models!")

# Print table summary
print("\n=== Database Schema Summary ===\n")
table_data = []
for table_name in sorted(actual_tables.keys()):
    table_data.append([table_name, len(actual_tables[table_name]), ", ".join(actual_tables[table_name])])

print(tabulate(table_data, headers=["Table", "Columns", "Column Names"], tablefmt="grid"))

session.close()
