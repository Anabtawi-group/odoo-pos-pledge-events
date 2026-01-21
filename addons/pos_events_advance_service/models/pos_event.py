from odoo import api, fields, models, _
from odoo.exceptions import UserError


class PosEventOrder(models.Model):
    _name = "pos.event.order"
    _description = "POS Event Order"
    _order = "id desc"

    name = fields.Char(default=lambda self: _("New"), required=True)
    state = fields.Selection([
        ("open", "Open"),
        ("advanced", "Advanced"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
    ], default="open", index=True)

    pos_config_id = fields.Many2one("pos.config", required=True, index=True)
    partner_id = fields.Many2one("res.partner", required=True, index=True)

    due_datetime = fields.Datetime(required=True)
    delivery_mode = fields.Selection([("pickup", "Pickup"), ("delivery", "Delivery")], default="pickup", required=True)

    service_persons_count = fields.Integer(default=0)
    service_leader_employee_id = fields.Many2one("hr.employee")
    plates_qty = fields.Integer(default=0)
    plates_value = fields.Monetary(default=0.0)
    currency_id = fields.Many2one("res.currency", default=lambda self: self.env.company.currency_id)

    advance_amount = fields.Monetary(default=0.0)

    employee_liability_move_id = fields.Many2one("account.move", readonly=True)
    employee_liability_cleared = fields.Boolean(default=False)

    advance_pos_order_id = fields.Many2one("pos.order", readonly=True)
    complete_pos_order_id = fields.Many2one("pos.order", readonly=True)

    def _next_name(self):
        return self.env["ir.sequence"].next_by_code("pos.event.order") or _("EVT")

    @api.model
    def create(self, vals):
        if vals.get("name", _("New")) == _("New"):
            vals["name"] = self._next_name()
        return super().create(vals)

    # ---------- POS RPC ----------

    @api.model
    def pos_event_create(self, vals):
        config = self.env["pos.config"].browse(int(vals.get("pos_config_id"))).exists()
        partner = self.env["res.partner"].browse(int(vals.get("partner_id"))).exists()

        if not config or not partner:
            raise UserError(_("Invalid POS config or customer."))

        if not (partner.mobile or partner.phone):
            raise UserError(_("Customer mobile is required for Event orders."))

        due_dt = vals.get("due_datetime")
        if not due_dt:
            raise UserError(_("Due date/time is required."))

        service_count = int(vals.get("service_persons_count") or 0)
        leader_emp_id = int(vals.get("service_leader_employee_id") or 0) or False
        if service_count > 0 and not leader_emp_id:
            raise UserError(_("Service leader is required when service persons > 0."))

        event = self.create({
            "pos_config_id": config.id,
            "partner_id": partner.id,
            "due_datetime": due_dt,
            "delivery_mode": vals.get("delivery_mode") or "pickup",
            "service_persons_count": service_count,
            "service_leader_employee_id": leader_emp_id,
            "plates_qty": int(vals.get("plates_qty") or 0),
            "plates_value": float(vals.get("plates_value") or 0.0),
            "state": "open",
        })
        return {"event_id": event.id, "event_name": event.name, "state": event.state}

    @api.model
    def pos_event_search(self, mobile):
        mobile = (mobile or "").strip()
        if not mobile:
            return []
        domain = [
            ("state", "in", ["open", "advanced"]),
            "|",
            ("partner_id.mobile", "ilike", mobile),
            ("partner_id.phone", "ilike", mobile),
        ]
        events = self.search(domain, limit=30)
        return [{
            "id": e.id,
            "name": e.name,
            "partner_name": e.partner_id.name,
            "partner_mobile": e.partner_id.mobile or e.partner_id.phone or "",
            "due_datetime": fields.Datetime.to_string(e.due_datetime),
            "delivery_mode": e.delivery_mode,
            "advance_amount": float(e.advance_amount),
            "state": e.state,
        } for e in events]

    def _create_employee_plate_move(self):
        self.ensure_one()
        if self.service_persons_count <= 0 or self.plates_value <= 0:
            return False

        config = self.pos_config_id
        receivable = config.employee_plate_receivable_account_id
        clearing = config.plates_clearing_account_id
        if not receivable or not clearing:
            raise UserError(_("Set Employee Plates accounts in POS Configuration."))

        move = self.env["account.move"].create({
            "move_type": "entry",
            "date": fields.Date.context_today(self),
            "ref": f"Employee plates (leader) - {self.name}",
            "line_ids": [
                (0, 0, {
                    "name": "Due from employee (plates)",
                    "account_id": receivable.id,
                    "debit": self.plates_value,
                    "credit": 0.0,
                }),
                (0, 0, {
                    "name": "Plates clearing",
                    "account_id": clearing.id,
                    "debit": 0.0,
                    "credit": self.plates_value,
                }),
            ],
        })
        move.action_post()
        self.employee_liability_move_id = move.id
        return move

    @api.model
    def pos_event_register_advance_by_ref(self, event_id, pos_reference, amount):
        event = self.browse(int(event_id)).exists()
        if not event:
            raise UserError(_("Event not found."))

        amount = float(amount or 0.0)
        if amount <= 0:
            raise UserError(_("Advance amount must be > 0."))

        order = self.env["pos.order"].search([("pos_reference", "=", pos_reference)], limit=1)
        if not order:
            raise UserError(_("POS Order not found for receipt: %s") % pos_reference)

        event.advance_amount += amount
        event.advance_pos_order_id = order.id
        if event.state == "open":
            event.state = "advanced"

        return {"ok": True, "advance_amount": float(event.advance_amount), "state": event.state}

    @api.model
    def pos_event_mark_completed_by_ref(self, event_id, pos_reference):
        event = self.browse(int(event_id)).exists()
        if not event:
            raise UserError(_("Event not found."))

        order = self.env["pos.order"].search([("pos_reference", "=", pos_reference)], limit=1)
        if not order:
            raise UserError(_("POS Order not found for receipt: %s") % pos_reference)

        event.complete_pos_order_id = order.id
        event.state = "completed"

        if event.service_persons_count > 0 and not event.employee_liability_move_id:
            event._create_employee_plate_move()

        return {"ok": True, "state": event.state}

    def action_clear_employee_liability(self):
        for rec in self:
            if rec.employee_liability_cleared:
                continue
            if not rec.employee_liability_move_id:
                raise UserError(_("Employee liability move not found."))
            rec.employee_liability_move_id._reverse_moves(default_values_list=[{
                "ref": f"Clear employee plates - {rec.name}",
            }], cancel=False)
            rec.employee_liability_cleared = True


class PosOrder(models.Model):
    _inherit = "pos.order"

    @api.model
    def pos_event_clear_employee_plates(self, event_id):
        event = self.env["pos.event.order"].browse(int(event_id)).exists()
        if not event:
            raise UserError(_("Event not found."))
        event.action_clear_employee_liability()
        return {"ok": True, "cleared": True}
