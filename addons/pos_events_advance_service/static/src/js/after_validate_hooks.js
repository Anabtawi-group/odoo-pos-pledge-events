/** @odoo-module **/
import { patch } from "@web/core/utils/patch";
import { rpc } from "@web/core/network/rpc";
import { PaymentScreen } from "@point_of_sale/app/screens/payment_screen/payment_screen";

async function callKW(model, method, args = []) {
    return await rpc("/web/dataset/call_kw", { model, method, args, kwargs: {} });
}

patch(PaymentScreen.prototype, {
    async validateOrder(isForceValidate) {
        const order = this.currentOrder;
        const result = await super.validateOrder(isForceValidate);
        if (!result || !order) return result;

        const posRef = order.name;

        if (order._pending_event_advance) {
            const { event_id, amount } = order._pending_event_advance;
            await callKW("pos.event.order", "pos_event_register_advance_by_ref", [event_id, posRef, amount]);
            order._pending_event_advance = null;
        }

        if (order._pending_event_complete) {
            const { event_id } = order._pending_event_complete;
            await callKW("pos.event.order", "pos_event_mark_completed_by_ref", [event_id, posRef]);
            order._pending_event_complete = null;
        }

        return result;
    },
});
