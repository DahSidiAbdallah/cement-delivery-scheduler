from app import create_app
from app.extensions import db
from sqlalchemy import text

def add_columns():
    app = create_app()
    
    with app.app_context():
        # Check if the columns already exist
        inspector = db.inspect(db.engine)
        columns = [col['name'] for col in inspector.get_columns('deliveries')]
        
        # Add columns if they don't exist
        with db.engine.connect() as conn:
            if 'external_truck_label' not in columns:
                print("Adding external_truck_label column...")
                conn.execute(text('ALTER TABLE deliveries ADD COLUMN external_truck_label VARCHAR(100)'))
                conn.commit()
            
            if 'is_external' not in columns:
                print("Adding is_external column...")
                conn.execute(text('ALTER TABLE deliveries ADD COLUMN is_external BOOLEAN DEFAULT 0'))
                conn.commit()
            
            # Update the alembic_version table to prevent future migration conflicts
            try:
                # Get the latest revision from the migration file name
                latest_rev = '340b50a81e9b'  # From your migration file name
                conn.execute(text("UPDATE alembic_version SET version_num = :rev"), {'rev': latest_rev})
                conn.commit()
                print(f"Updated alembic_version to {latest_rev}")
            except Exception as e:
                print(f"Note: Could not update alembic_version: {e}")
                print("This is not critical, but you might see migration warnings in the future.")
        
        print("Columns added successfully!")

if __name__ == '__main__':
    add_columns()
