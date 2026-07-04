output "resource_group_name" {
  description = "Resource group name"
  value       = azurerm_resource_group.this.name
}

output "function_app_name" {
  description = "Function app name"
  value       = azurerm_linux_function_app.this.name
}

output "default_hostname" {
  description = "Function app hostname"
  value       = azurerm_linux_function_app.this.default_hostname
}

output "webhook_url" {
  description = "Telegram webhook URL"
  value       = "https://${azurerm_linux_function_app.this.default_hostname}/api/convertik-bot"
}

output "storage_account_name" {
  description = "Storage account name"
  value       = azurerm_storage_account.this.name
}
