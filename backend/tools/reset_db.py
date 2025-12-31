#!/usr/bin/env python3
"""
Reset Database Script.
DANGER: This will delete ALL data in the database.
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from api.db import engine, Base
from api import models # Import models so Base metadata is populated

import argparse

def reset_db():
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="Skip confirmation prompt")
    args = parser.parse_args()

    if not args.force:
        print("⚠️  WARNING: You are about to DELETE ALL DATA from the database.")
        print("   This includes Users, Fields, Sensors, History, EVERYTHING.")
        confirm = input("Type 'DELETE' to confirm: ")
        if confirm != "DELETE":
            print("❌ Operation cancelled.")
            return

    print("🗑️  Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    
    print("✨ Creating fresh tables...")
    Base.metadata.create_all(bind=engine)
    
    print("✅ Database reset complete! It is now empty.")

if __name__ == "__main__":
    reset_db()
