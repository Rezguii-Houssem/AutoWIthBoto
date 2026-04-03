# Deploy FinSecOps Dashboard

## Purpose
Deploys the complete AWS infrastructure (IAM, Cognito, API Gateway, Lambda, S3, CloudFront) and the React frontend. This directive ensures the CORS and OAuth redirect fixes are applied consistently.

## Inputs
- Required:
    - AWS Credentials (`ACCESS_KEY`, `SECRET_KEY`)
    - Google OAuth Credentials (for `main` branch deployments)
- Optional:
    - `project_name` (default: "autowithboto")
    - `region` (default: "eu-west-3")

## Execution
Script: `finsecops-dashboard/scripts/deploy.py`
Command: `python finsecops-dashboard/scripts/deploy.py`

## Expected Outputs
- Terraform Backend State updated in S3.
- React build artifacts synced to S3 bucket.
- CloudFront distribution updated with the latest build.

## Known Edge Cases
- **Missing Google Credentials** → Terraform skips creating the Google IDP but still deploys Cognito correctly (Implicitly handles local development without full secrets).
- **Network Error (CORS)** → Fixed via `cors_configuration` in `api_gateway`.
- **Invalid Redirect URI** → Fixed by ensuring `callback_urls` includes the CloudFront distribution domain.

## Learning History
- **2026-04-03**: Initial SOP created. Resolved CORS and RedirectURI mismatches. Added conditional Google Login for robustness.
