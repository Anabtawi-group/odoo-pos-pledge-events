/** @odoo-module **/
import { patch } from "@web/core/utils/patch";
import { Order } from "@point_of_sale/app/store/models";

patch(Order.prototype, {
    export_for_printing() {
        const data = super.export_for_printing(...arguments);
        data._event_id = this.event_id || null;
        data._event_qr_value = this.event_id ? `EVT:${this.event_id}` : "";
        return data;
    },
});
