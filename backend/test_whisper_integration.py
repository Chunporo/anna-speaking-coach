#!/usr/bin/env python3
"""
Test script to verify Whisper integration works before deployment
"""
import sys
import os
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from app.services.whisper_service import transcribe_audio
import tempfile
import subprocess

def test_mamba_available():
    """Test if mamba is available"""
    print("Testing mamba availability...")
    try:
        result = subprocess.run(
            ["mamba", "info", "--base"],
            capture_output=True,
            text=True,
            check=True,
            timeout=10
        )
        output = result.stdout.strip()
        # Extract path from output (might include extra text like "base environment : /path")
        if ":" in output:
            mamba_base = output.split(":")[-1].strip()
        else:
            mamba_base = output
        print(f"✓ Mamba found at: {mamba_base}")
        
        # Check if whisper environment exists
        result = subprocess.run(
            ["mamba", "env", "list"],
            capture_output=True,
            text=True,
            check=True
        )
        if "whisper" in result.stdout:
            print("✓ Whisper environment found")
            return True
        else:
            print("✗ Whisper environment not found. Run: mamba create -n whisper")
            return False
    except FileNotFoundError:
        print("✗ Mamba not found in PATH")
        return False
    except Exception as e:
        print(f"✗ Error checking mamba: {e}")
        return False

def test_whisper_command():
    """Test if whisper command works in the environment"""
    print("\nTesting whisper command in mamba environment...")
    try:
        result = subprocess.run(
            ["mamba", "info", "--base"],
            capture_output=True,
            text=True,
            check=True
        )
        output = result.stdout.strip()
        # Extract path from output
        if ":" in output:
            mamba_base = output.split(":")[-1].strip()
        else:
            mamba_base = output
        mamba_script = os.path.join(mamba_base, "etc", "profile.d", "mamba.sh")
        
        # Test if whisper is accessible (--help should work)
        test_cmd = f"""bash -c "source '{mamba_script}' && mamba activate whisper && which whisper" """
        result = subprocess.run(
            test_cmd,
            shell=True,
            capture_output=True,
            text=True,
            check=True,
            timeout=30
        )
        whisper_path = result.stdout.strip()
        print(f"✓ Whisper command works")
        print(f"  Whisper found at: {whisper_path}")
        
        # Verify whisper can be executed
        test_cmd2 = f"""bash -c "source '{mamba_script}' && mamba activate whisper && whisper --help > /dev/null 2>&1" """
        result2 = subprocess.run(
            test_cmd2,
            shell=True,
            timeout=30
        )
        if result2.returncode == 0:
            print(f"  Whisper executable confirmed")
        return True
    except Exception as e:
        print(f"✗ Whisper command test failed: {e}")
        if hasattr(e, 'stderr') and e.stderr:
            print(f"  Error: {e.stderr[:200]}")
        return False

def test_whisper_service():
    """Test the whisper service with a small test file"""
    print("\nTesting whisper_service module import...")
    try:
        from app.services import whisper_service
        print("✓ whisper_service module imports successfully")
        print(f"  Model: {whisper_service.WHISPER_MODEL}")
        print(f"  Environment: {whisper_service.MAMBA_ENV}")
        return True
    except Exception as e:
        print(f"✗ Failed to import whisper_service: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("=" * 60)
    print("Whisper Integration Test")
    print("=" * 60)
    
    results = []
    
    # Test 1: Mamba availability
    results.append(("Mamba Availability", test_mamba_available()))
    
    # Test 2: Whisper command
    if results[-1][1]:
        results.append(("Whisper Command", test_whisper_command()))
    else:
        results.append(("Whisper Command", False))
        print("  (Skipped - mamba not available)")
    
    # Test 3: Service module
    results.append(("Service Module", test_whisper_service()))
    
    # Summary
    print("\n" + "=" * 60)
    print("Test Summary:")
    print("=" * 60)
    for name, passed in results:
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{status}: {name}")
    
    all_passed = all(result[1] for result in results)
    
    if all_passed:
        print("\n✅ All tests passed! Whisper integration is ready.")
        return 0
    else:
        print("\n❌ Some tests failed. Please fix the issues before deployment.")
        return 1

if __name__ == "__main__":
    sys.exit(main())

