from odoo import models

class PosSession(models.Model):
    _inherit = "pos.session"

    def _loader_params_pos_config(self):
        params = super()._loader_params_pos_config()
        fields = params["search_params"].setdefault("fields", [])
        if "pledge_pos_categ_id" not in fields:
            fields.append("pledge_pos_categ_id")
        return params
