output "bucket_id" {
  value       = aws_s3_bucket.logs.id
  description = "The name of the bucket"
}
