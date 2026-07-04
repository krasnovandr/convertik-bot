variable "resource_group_name" {
  description = "Azure resource group name"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "westeurope"
}

variable "function_app_name" {
  description = "Unique function app name"
  type        = string
}

variable "storage_account_name" {
  description = "Optional storage account name override (3-24 lowercase alphanumeric)"
  type        = string
  default     = null
}

variable "node_version" {
  description = "Node.js runtime version for Function App"
  type        = string
  default     = "24"
}

variable "functions_extension_version" {
  description = "Functions runtime version"
  type        = string
  default     = "~4"
}

variable "bot_token" {
  description = "Telegram bot token"
  type        = string
  sensitive   = true
  default     = null
}

variable "user_id_1" {
  description = "Allowed Telegram user id #1"
  type        = string
  default     = null
}

variable "user_id_2" {
  description = "Allowed Telegram user id #2"
  type        = string
  default     = null
}

variable "tags" {
  description = "Optional tags"
  type        = map(string)
  default     = {}
}
