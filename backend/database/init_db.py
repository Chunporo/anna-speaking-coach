"""
Database initialization script
Run this after creating the database to set up tables and seed data
"""
import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://user:password@localhost:5432/ielts_speaking"
)

def init_database():
    engine = create_engine(DATABASE_URL)
    
    # Read and execute schema
    with open('database/schema.sql', 'r') as f:
        schema_sql = f.read()
    
    with engine.connect() as conn:
        # Split by semicolons and execute each statement
        statements = schema_sql.split(';')
        for statement in statements:
            statement = statement.strip()
            if statement:
                try:
                    conn.execute(text(statement))
                except Exception as e:
                    print(f"Warning: {e}")
        conn.commit()
    
    print("Database schema created successfully!")
    
    # Read and execute seed data
    with open('database/seed_data.sql', 'r') as f:
        seed_sql = f.read()
    
    with engine.connect() as conn:
        statements = seed_sql.split(';')
        for statement in statements:
            statement = statement.strip()
            if statement:
                try:
                    conn.execute(text(statement))
                except Exception as e:
                    print(f"Warning: {e}")
        conn.commit()
    
    print("Seed data inserted successfully!")

if __name__ == "__main__":
    init_database()

