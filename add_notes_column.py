import sqlite3

def add_notes_column():
    try:
        # Connect to the SQLite database
        conn = sqlite3.connect('instance/app.db')
        cursor = conn.cursor()
        
        # Check if the notes column already exists
        cursor.execute("PRAGMA table_info(deliveries)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'notes' not in columns:
            # Add the notes column
            cursor.execute("ALTER TABLE deliveries ADD COLUMN notes TEXT")
            conn.commit()
            print("Successfully added notes column to deliveries table")
        else:
            print("Notes column already exists in deliveries table")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    add_notes_column()
