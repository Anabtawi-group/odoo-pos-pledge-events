from odoo import fields, models

class PosConfig(models.Model):
    _inherit = "pos.config"

    pledge_pos_categ_id = fields.Many2one(
        "pos.category",
        string="Pledge POS Category",
        help="If an order contains products in this POS Category, POS prints a second pledge-only receipt and enforces customer mobile."
    )
