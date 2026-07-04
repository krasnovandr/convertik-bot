# Terraform Infra

This folder provisions Azure infrastructure for the bot using Terraform.

## What gets created

- Resource Group
- Storage Account
- Linux Consumption Plan (Y1)
- Azure Function App (Node runtime)
- Function App settings for BOT_TOKEN, USER_ID_1, USER_ID_2 (optional)

## Prerequisites

- Terraform >= 1.6
- Azure CLI (for authentication only)
- Logged-in Azure session: az login

## 1) Initialize Terraform

From repository root:

PowerShell:
cd ./infra/terraform
terraform init

## 2) Configure variables

Copy the example file:

PowerShell:
Copy-Item terraform.tfvars.example terraform.tfvars

Edit terraform.tfvars with your values:
- resource_group_name
- location
- function_app_name
- node_version (default 20)
- bot_token, user_id_1, user_id_2

Do not commit terraform.tfvars if it contains secrets.

## 3) Plan and apply

PowerShell:
terraform plan -out tfplan
terraform apply tfplan

## 4) Get webhook URL

PowerShell:
terraform output webhook_url

Use the output in Telegram setWebhook call.

## 5) Optional cleanup

PowerShell:
terraform destroy
