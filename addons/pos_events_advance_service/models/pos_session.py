from odoo import models

class PosSession(models.Model):
    _inherit = "pos.session"

    def _loader_params_pos_config(self):
        params = super()._loader_params_pos_config()
        fields = params["search_params"].setdefault("fields", [])
        for f in [
            "advance_product_id",
            "service_fee_product_id",
            "employee_plate_receivable_account_id",
            "plates_clearing_account_id",
        ]:
            if f not in fields:
                fields.append(f)
        return params
