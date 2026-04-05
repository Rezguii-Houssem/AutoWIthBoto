import json
import sys

def get_cron_expression(body):
    """
    Simulates the logic in the manage_schedules Lambda.
    This ensures that the frontend's high-level frequency 
    parameters are correctly mapped to AWS cron syntax.
    """
    frequency = body.get('frequency')
    if frequency == 'daily':
        time_val = body.get('time', '12:00') # HH:MM UTC (after frontend conversion)
        try:
            h, m = time_val.split(':')
            return f"cron({m} {h} * * ? *)"
        except Exception:
            return "cron(0 12 * * ? *)"
    elif frequency == 'hourly':
        minute = body.get('minute', '0')
        return f"cron({minute} * * * ? *)"
    return body.get('schedule_expression', 'rate(1 day)')

def test_cases():
    cases = [
        {"desc": "Daily 3:45 AM UTC", "payload": {"frequency": "daily", "time": "03:45"}, "expected": "cron(45 03 * * ? *)"},
        {"desc": "Hourly at minute 15", "payload": {"frequency": "hourly", "minute": "15"}, "expected": "cron(15 * * * ? *)"},
        {"desc": "Invalid Daily format", "payload": {"frequency": "daily", "time": "invalid"}, "expected": "cron(0 12 * * ? *)"},
        {"desc": "Fallback to rate", "payload": {"frequency": "weekly", "schedule_expression": "rate(7 days)"}, "expected": "rate(7 days)"}
    ]
    
    print("--- Automation Parameter Verification ---")
    all_passed = True
    for case in cases:
        result = get_cron_expression(case['payload'])
        status = "PASS" if result == case['expected'] else "FAIL"
        print(f"[{status}] {case['desc']} -> Got: {result}")
        if result != case['expected']:
            all_passed = False
            
    if not all_passed:
        sys.exit(1)

if __name__ == "__main__":
    test_cases()
