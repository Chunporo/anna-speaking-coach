"""
Quick test script to create practice sessions for testing the calendar
Run this to populate some test data
"""
import requests
import json
from datetime import date, timedelta

# Update these with your credentials
BASE_URL = "http://localhost:8000"
USERNAME = "testuser"
PASSWORD = "testpass"

# Login
login_response = requests.post(
    f"{BASE_URL}/api/auth/login",
    data={"username": USERNAME, "password": PASSWORD},
    headers={"Content-Type": "application/x-www-form-urlencoded"}
)

if login_response.status_code != 200:
    print("Login failed. Please register first or check credentials.")
    print(login_response.text)
    exit(1)

token = login_response.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# Create practice sessions for the last 7 days
today = date.today()
for i in range(7):
    practice_date = today - timedelta(days=i)
    print(f"Creating practice session for {practice_date}...")
    
    response = requests.post(
        f"{BASE_URL}/api/practice/",
        json={
            "part": 1,
            "question_id": 1,  # Use any question ID
        },
        headers=headers
    )
    
    if response.status_code == 200:
        print(f"✓ Created practice session for {practice_date}")
    else:
        print(f"✗ Failed: {response.text}")

print("\nDone! Check your streak calendar now.")

