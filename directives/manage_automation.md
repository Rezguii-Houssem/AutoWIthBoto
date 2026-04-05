# Manage Automation SOP

## Purpose
This directive defines the process for adding, modifying, or disabling automated FinSecOps tasks. It ensures that EventBridge rules are correctly synchronized with the underlying remediation Lambda functions.

## Inputs
- **Required**:
    - `lambda_name`: The identifier of the scan/remediation function (e.g., `getIdleEC2`).
    - `action`: `'enable'` to create/update or `'disable'` to deactivate.
    - `frequency`: `'daily'` or `'hourly'`.
    - `time` (if daily): Local time in HH:MM (will be converted to UTC).
    - `minute` (if hourly): 0-59.
- **Optional**:
    - `region`: Target AWS region (default: `eu-west-3`).
    - `params`: JSON object with function-specific arguments (e.g., `{"action": "stop"}`).

## Execution
**Layer 3 Integration**: Use `execution/verify_automation_params.py` to validate payload before sending to API.

**API Endpoint**: `POST /automation/schedules`
**Auth**: Bearer Token required.

## Expected Outputs
- New or updated CloudWatch Event Rule (EventBridge).
- Permission granted for EventBridge to invoke the target Lambda.
- Target Lambda triggered according to the `cron` schedule.

## Known Edge Cases
- **Overlapping Rules**: Enabling a rule that already exists will overwrite the previous schedule but preserve the target Lambda configuration.
- **Region Mismatch**: Ensure the `region` in `params` matches the target resources; the `manage_schedules` Lambda itself can orchestrate cross-region if IAM permits.

## Learning History
- **2026-04-05**: Initial SOP created. Support added for UTC-aware daily scheduling.
