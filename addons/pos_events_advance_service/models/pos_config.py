from odoo import fields, models

class PosConfig(models.Model):
    _inherit = "pos.config"

    advance_product_id = fields.Many2one("product.product", string="Event Advance Product")
    service_fee_product_id = fields.Many2one("product.product", string="Service Persons Fee Product")

    employee_plate_receivable_account_id = fields.Many2one("account.account", string="Employee Plates Receivable")
    plates_clearing_account_id = fields.Many2one("account.account", string="Plates Clearing Account")
