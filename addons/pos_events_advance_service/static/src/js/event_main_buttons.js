/** @odoo-module **/
import { patch } from "@web/core/utils/patch";
import { ControlButtons } from "@point_of_sale/app/screens/product_screen/control_buttons/control_buttons";

function toISO(s) {
    return String(s || "").trim();
}

patch(ControlButtons.prototype, {
    async onClickCreateEvent() {
        const order = this.env.pos.get_order();
        if (!order) return;

        const partner = order.get_partner?.();
        if (!partner) {
            await this.env.services.popup.add("ErrorPopup", { title: "Customer Required", body: "Select customer first." });
            return;
        }
        if (!(partner.mobile || partner.phone)) {
            await this.env.services.popup.add("ErrorPopup", { title: "Mobile Required", body: "Customer mobile/phone is required." });
            return;
        }

        const due = await this.env.services.popup.add("TextInputPopup", {
            title: "Due Date/Time",
            body: "Enter: YYYY-MM-DD HH:MM (example: 2026-01-25 18:00)",
            startingValue: "",
        });
        if (!due?.confirmed || !due.payload) return;

        const dm = await this.env.services.popup.add("SelectionPopup", {
            title: "Delivery Mode",
            list: [
                { id: "pickup", label: "Pickup" },
                { id: "delivery", label: "Delivery" },
            ],
        });
        if (!dm?.confirmed) return;
        const delivery_mode = dm.payload?.id || dm.payload;

        const sp = await this.env.services.popup.add("NumberPopup", { title: "Service Persons Count", startingValue: 0 });
        if (!sp?.confirmed) return;
        const serviceCount = parseInt(sp.payload || 0);

        let leaderEmpId = false;
        let platesQty = 0;
        let platesValue = 0.0;

        if (serviceCount > 0) {
            const leader = await this.env.services.popup.add("TextInputPopup", {
                title: "Service Leader Employee ID",
                body: "Enter Employee ID (Employees app).",
                startingValue: "",
            });
            if (!leader?.confirmed || !leader.payload) return;
            leaderEmpId = parseInt(leader.payload);

            const pq = await this.env.services.popup.add("NumberPopup", { title: "Plates Qty", startingValue: 0 });
            if (!pq?.confirmed) return;
            platesQty = parseInt(pq.payload || 0);

            const pv = await this.env.services.popup.add("NumberPopup", { title: "Plates Value (JOD)", startingValue: 0 });
            if (!pv?.confirmed) return;
            platesValue = parseFloat(pv.payload || 0);
        }

        const res = await this.env.services.rpc("/web/dataset/call_kw", {
            model: "pos.event.order",
            method: "pos_event_create",
            args: [{
                pos_config_id: this.env.pos.config.id,
                partner_id: partner.id,
                due_datetime: toISO(due.payload),
                delivery_mode,
                service_persons_count: serviceCount,
                service_leader_employee_id: leaderEmpId || false,
                plates_qty: platesQty,
                plates_value: platesValue,
            }],
            kwargs: {},
        });

        order.event_id = res.event_id;

        if (serviceCount > 0) {
            const pledgeCatId = this.env.pos.config.pledge_pos_categ_id?.[0];
            if (pledgeCatId) {
                order.get_orderlines().slice().forEach((l) => {
                    const cat = l.product?.pos_categ_id?.[0];
                    if (cat === pledgeCatId) order.removeOrderline(l);
                });
            }
            const serviceProdId = this.env.pos.config.service_fee_product_id?.[0];
            const serviceProd = serviceProdId ? this.env.pos.db.product_by_id[serviceProdId] : null;
            if (serviceProd) order.add_product(serviceProd, { quantity: serviceCount });
        }

        await this.env.services.popup.add("ConfirmPopup", {
            title: "Event Created",
            body: `Event ${res.event_name} created.\nUse Take Advance or Complete Event later.`,
        });
    },

    async onClickTakeAdvance() {
        const order = this.env.pos.get_order();
        if (!order) return;

        if (!order.event_id) {
            await this.env.services.popup.add("ErrorPopup", { title: "No Event Loaded", body: "Create/Find/Scan an event first." });
            return;
        }

        const advProdId = this.env.pos.config.advance_product_id?.[0];
        const advProd = advProdId ? this.env.pos.db.product_by_id[advProdId] : null;
        if (!advProd) {
            await this.env.services.popup.add("ErrorPopup", { title: "Advance Product Missing", body: "Set Event Advance Product in POS config." });
            return;
        }

        const amt = await this.env.services.popup.add("NumberPopup", { title: "Advance Amount (JOD)", startingValue: 0 });
        if (!amt?.confirmed) return;
        const amount = parseFloat(amt.payload || 0);
        if (amount <= 0) return;

        order.get_orderlines().slice().forEach((l) => order.removeOrderline(l));
        order.add_product(advProd, { quantity: 1, price: amount });

        order._pending_event_advance = { event_id: order.event_id, amount };

        await this.env.services.popup.add("ConfirmPopup", {
            title: "Advance Ready",
            body: "Go to Payment and Validate. Advance Receipt prints with QR.",
        });
    },

    async onClickCompleteEvent() {
        const order = this.env.pos.get_order();
        if (!order) return;

        if (!order.event_id) {
            await this.env.services.popup.add("ErrorPopup", { title: "No Event Loaded", body: "Find Event or scan QR first." });
            return;
        }

        const adv = await this.env.services.popup.add("NumberPopup", { title: "Advance To Apply (JOD)", startingValue: 0 });
        if (!adv?.confirmed) return;
        const advanceToApply = parseFloat(adv.payload || 0);

        if (advanceToApply > 0) {
            const advProdId = this.env.pos.config.advance_product_id?.[0];
            const advProd = advProdId ? this.env.pos.db.product_by_id[advProdId] : null;
            if (!advProd) {
                await this.env.services.popup.add("ErrorPopup", { title: "Advance Product Missing", body: "Set Event Advance Product in POS config." });
                return;
            }
            order.add_product(advProd, { quantity: 1, price: -advanceToApply });
        }

        order._pending_event_complete = { event_id: order.event_id };

        await this.env.services.popup.add("ConfirmPopup", {
            title: "Ready to Complete",
            body: "Go to Payment and Validate to complete the sale (VAT applies to sweets only).",
        });
    },

    async onClickReturnPlates() {
        const res = await this.env.services.popup.add("TextInputPopup", {
            title: "Return Plates",
            body: "Scan event QR (EVT:123) or enter Event ID number",
            startingValue: "",
        });
        if (!res?.confirmed || !res.payload) return;

        const v = String(res.payload).trim();
        const eventId = v.startsWith("EVT:") ? parseInt(v.split(":")[1]) : parseInt(v);

        if (!eventId || isNaN(eventId)) return;

        await this.env.services.rpc("/web/dataset/call_kw", {
            model: "pos.order",
            method: "pos_event_clear_employee_plates",
            args: [eventId],
            kwargs: {},
        });

        await this.env.services.popup.add("ConfirmPopup", { title: "Returned", body: "Employee plate liability cleared." });
    },
});
