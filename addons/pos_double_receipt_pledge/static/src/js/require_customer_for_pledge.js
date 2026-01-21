/** @odoo-module **/
import { patch } from "@web/core/utils/patch";
import { PaymentScreen } from "@point_of_sale/app/screens/payment_screen/payment_screen";

patch(PaymentScreen.prototype, {
    async validateOrder(isForceValidate) {
        const order = this.currentOrder;
        const pledgeEnabled = !!this.pos.config.pledge_pos_categ_id?.[0];

        if (pledgeEnabled && order?.hasPledgeLines?.()) {
            const partner = order.get_partner?.();
            if (!partner) {
                await this.env.services.popup.add("ErrorPopup", {
                    title: "Customer Required",
                    body: "This order includes a Plate Pledge. Please select a customer before validating.",
                });
                return;
            }
            const mobile = partner.mobile || partner.phone;
            if (!mobile) {
                await this.env.services.popup.add("ErrorPopup", {
                    title: "Mobile Required",
                    body: "Please add the customer's mobile number to proceed with the Plate Pledge.",
                });
                return;
            }
        }
        return await super.validateOrder(isForceValidate);
    },
});
