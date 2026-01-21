/** @odoo-module **/
import { patch } from "@web/core/utils/patch";
import { rpc } from "@web/core/network/rpc";
import { ControlButtons } from "@point_of_sale/app/screens/product_screen/control_buttons/control_buttons";

async function callKW(model, method, args = []) {
    return await rpc("/web/dataset/call_kw", { model, method, args, kwargs: {} });
}

patch(ControlButtons.prototype, {
    async onClickFindEvent() {
        const res = await this.env.services.popup.add("TextInputPopup", {
            title: "Find Event",
            body: "Enter customer mobile number",
            startingValue: "",
        });
        if (!res?.confirmed || !res.payload) return;

        const mobile = String(res.payload).trim();
        const events = await callKW("pos.event.order", "pos_event_search", [mobile]);

        if (!events.length) {
            await this.env.services.popup.add("ErrorPopup", {
                title: "No Events Found",
                body: "No open/advanced events found for this mobile number.",
            });
            return;
        }

        const pick = await this.env.services.popup.add("SelectionPopup", {
            title: "Select Event",
            list: events.map((e) => ({
                id: e.id,
                label: `${e.name} | ${e.partner_name} | ${e.due_datetime} | Adv: ${e.advance_amount}`,
                item: e,
            })),
        });
        if (!pick?.confirmed) return;

        const event = pick.payload?.item || pick.payload;
        const order = this.env.pos.get_order();
        order.event_id = event.id;

        await this.env.services.popup.add("ConfirmPopup", {
            title: "Event Loaded",
            body: `Event ${event.name} loaded.`,
        });
    },
});
