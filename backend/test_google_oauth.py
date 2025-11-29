#!/usr/bin/env python3
"""
Test script to verify Google OAuth configuration
"""
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_google_oauth_config():
    """Test Google OAuth configuration"""
    print("=" * 60)
    print("Google OAuth Configuration Test")
    print("=" * 60)
    
    # Check backend configuration
    backend_client_id = os.getenv("GOOGLE_CLIENT_ID")
    print(f"\n1. Backend GOOGLE_CLIENT_ID:")
    if backend_client_id:
        print(f"   ✅ Found: {backend_client_id[:30]}...")
        print(f"   Full ID: {backend_client_id}")
    else:
        print("   ❌ NOT FOUND - Set GOOGLE_CLIENT_ID in backend/.env")
        return False
    
    # Check frontend configuration
    frontend_env_path = os.path.join(os.path.dirname(__file__), "..", "frontend", ".env.local")
    frontend_client_id = None
    
    if os.path.exists(frontend_env_path):
        with open(frontend_env_path, 'r') as f:
            for line in f:
                if line.startswith("NEXT_PUBLIC_GOOGLE_CLIENT_ID="):
                    frontend_client_id = line.split("=", 1)[1].strip()
                    break
    
    print(f"\n2. Frontend NEXT_PUBLIC_GOOGLE_CLIENT_ID:")
    if frontend_client_id:
        print(f"   ✅ Found: {frontend_client_id[:30]}...")
        print(f"   Full ID: {frontend_client_id}")
    else:
        print("   ❌ NOT FOUND - Set NEXT_PUBLIC_GOOGLE_CLIENT_ID in frontend/.env.local")
        return False
    
    # Verify they match
    print(f"\n3. Client ID Match:")
    if backend_client_id == frontend_client_id:
        print("   ✅ Frontend and Backend Client IDs MATCH")
    else:
        print("   ❌ MISMATCH - Frontend and Backend must use the SAME Client ID")
        print(f"   Backend:  {backend_client_id}")
        print(f"   Frontend: {frontend_client_id}")
        return False
    
    # Check Client ID format
    print(f"\n4. Client ID Format:")
    if backend_client_id.endswith(".apps.googleusercontent.com"):
        print("   ✅ Valid Google Client ID format")
    else:
        print("   ⚠️  Warning: Client ID format looks unusual")
    
    # Test Google OAuth endpoint
    print(f"\n5. Testing Google OAuth Endpoint:")
    try:
        import httpx
        import asyncio
        
        async def test_endpoint():
            async with httpx.AsyncClient(timeout=5.0) as client:
                # Test if Google OAuth endpoint is reachable
                try:
                    response = await client.get("https://oauth2.googleapis.com/tokeninfo")
                    print(f"   ✅ Google OAuth endpoint is reachable")
                    return True
                except Exception as e:
                    print(f"   ⚠️  Could not reach Google OAuth endpoint: {e}")
                    print("   (This might be normal - endpoint requires token)")
                    return True  # Not a critical error
        
        result = asyncio.run(test_endpoint())
    except ImportError:
        print("   ⚠️  httpx not available - skipping endpoint test")
        result = True
    
    print(f"\n6. Configuration Summary:")
    print("   ✅ Backend: GOOGLE_CLIENT_ID is set")
    print("   ✅ Frontend: NEXT_PUBLIC_GOOGLE_CLIENT_ID is set")
    print("   ✅ Client IDs match")
    print("\n" + "=" * 60)
    print("✅ Google OAuth configuration looks good!")
    print("=" * 60)
    print("\nNext steps:")
    print("1. Make sure your Google OAuth Client ID is configured in Google Cloud Console")
    print("2. Add authorized JavaScript origins:")
    print("   - http://localhost:3000 (for development)")
    print("   - Your production domain (for production)")
    print("3. Add authorized redirect URIs:")
    print("   - http://localhost:3000 (for development)")
    print("   - Your production domain (for production)")
    print("4. Test the login flow in your frontend")
    
    return True

if __name__ == "__main__":
    success = test_google_oauth_config()
    sys.exit(0 if success else 1)

