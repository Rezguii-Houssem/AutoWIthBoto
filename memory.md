# Project Memory

> This file grows with your project. The AI reads it at the start of each session and appends to it when learning something permanent.

## Session History

### 2026-04-03
- Initial setup completed
- AGENTS.md created with 3-layer architecture
- memory.md initialized
- Directive and execution templates created
- Fixed Cognito Google Login redirect issue (CloudFront URL whitelist)
- Fixed API Gateway CORS "Network Error" (HTTP API cors_configuration)
- Made Google Login optional in Terraform for robust local deployment

## Recurring Issues & Fixes

| Issue | Fix | Date |
|-------|-----|------|
| Cognito login "This site can't be reached" | Add CloudFront distribution URL to `callback_urls` and `logout_urls`. | 2026-04-03 |
| API Gateway "Network Error" (CORS) | Add `cors_configuration` to the `aws_apigatewayv2_api` resource. | 2026-04-03 |
| Terraform apply failure (Google IDP) | Added `count` and `concat` logic to make Google Identity Provider optional if credentials are missing. | 2026-04-03 |

## User Preferences

- Use cloud services (Google Sheets/Slides) for deliverables, not local files
- Never commit `.env`, `.tmp/`, `credentials.json`, or `token.json`
- Always check `execution/` before writing a new script
- Python scripts should be deterministic and well-commented
- Temporary files (logs, debug outputs) MUST be deleted immediately after use.
- GitHub Workflows MUST reside in the root `.github/workflows/` directory.
- Avoid committing `temp*` files or redundant configuration folders.
- **Workflow**: All development and next pushes must happen on the `feature` branch. `main` is the corrected source of truth.

## Successful Patterns

- **Pattern**: 3-Layer Architecture (Directives, Orchestration, Execution)
- **When to use**: Architecture for reliable AI-driven development.
- **Why it worked**: Separates natural language intent from deterministic execution logic.

## API Constraints Discovered

| API | Constraint | Workaround | Date Discovered |
|-----|------------|------------|-----------------|
| Cognito | Callbacks must be HTTPS unless localhost. | Use CloudFront with HTTPS for all non-local environments. | 2026-04-03 |

## Lessons Learned

- Always whitelist the CloudFront domain in Cognito *before* the first deployment attempt.
- HTTP APIs in AWS require manual CORS configuration even if the backend handles it.
- Terraform modules should handle optional providers gracefully.
- **Hygiene**: Always clean up temporary troubleshooting logs (`temp-log.txt`) or scratch files before concluding a task.
- **GitHub Actions**: Workflows in subdirectories are ignored; keep the primary deployment logic in the root `.github/workflows/` folder.
