resource "aws_dynamodb_table" "results" {
  name         = "${var.project_name}_ScanResults"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }
}
