terraform {
  backend "s3" {
    bucket         = "finsecops-tf-state-eb4ae9bf"
    key            = "dev/terraform.tfstate"
    region         = "eu-west-3"
    dynamodb_table = "finsecops-tf-locks"
    encrypt        = true
  }
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

provider "aws" {
  region = var.region
}
