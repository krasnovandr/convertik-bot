output "resource_group_name" {
  description = "Resource group name"
  value       = azurerm_resource_group.this.name
}

output "function_app_name" {
  description = "Function app name"
  value       = azurerm_function_app_flex_consumption.this.name
}

output "default_hostname" {
  description = "Function app hostname"
  value       = azurerm_function_app_flex_consumption.this.default_hostname
}

output "webhook_url" {
  description = "Telegram webhook URL"
  value       = "https://${azurerm_function_app_flex_consumption.this.default_hostname}/api/convertik-bot"
}

output "storage_account_name" {
  description = "Storage account name"
  value       = azurerm_storage_account.this.name
}

output "application_insights_name" {
  description = "Application Insights instance name"
  value       = azurerm_application_insights.this.name
}

output "application_insights_connection_string" {
  description = "Application Insights connection string"
  value       = azurerm_application_insights.this.connection_string
  sensitive   = true
}

output "cosmos_account_name" {
  description = "Cosmos DB account name"
  value       = azurerm_cosmosdb_account.this.name
}

output "cosmos_endpoint" {
  description = "Cosmos DB account endpoint"
  value       = azurerm_cosmosdb_account.this.endpoint
}

output "cosmos_database_name" {
  description = "Cosmos DB database name"
  value       = "home-budget"
}
