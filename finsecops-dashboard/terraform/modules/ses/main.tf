resource "aws_ses_email_identity" "notifier" {
  email = "rezguii.houssem@gmail.com"
}

output "ses_arn" {
  value = aws_ses_email_identity.notifier.arn
}
