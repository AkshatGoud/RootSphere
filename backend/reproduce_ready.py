from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "postgresql://user:password@localhost:5432/smartsoil"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

try:
    # Reproduce the bug: sending string instead of text()
    print("Attempting db.execute('SELECT 1')...")
    db.execute("SELECT 1")
    print("Success!")
except Exception as e:
    print(f"Failed as expected: {e}")

try:
    print("Attempting db.execute(text('SELECT 1'))...")
    db.execute(text("SELECT 1"))
    print("Success with text()!")
except Exception as e:
    print(f"Failed with text(): {e}")
