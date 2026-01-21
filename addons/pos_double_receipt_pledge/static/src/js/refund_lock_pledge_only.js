/** @odoo-module **/
import { patch } from "@web/core/utils/patch";
import { PaymentScreen } from "@point_of_sale/app/screens/payment_screen/payment_screen";

patch(PaymentScreen.prototype, {
    async validateOrder(isForceValidate) {
        const order = this.currentOrder;
        const pledgeCatId = this.pos.config.pledge_pos_categ_id?.[0];

        if (pledgeCatId && order) {
            const lines = order.get_orderlines?.() || [];
            const isRefundOrder = lines.some((l) =>
                l.refunded_orderline_id || l.refunded_line_id || l.refundedOrderlineId
            );

            if (isRefundOrder) {
                const nonPledgeRefundLines = lines.filter((l) => {
                    const prodCat = l.product?.pos_categ_id?.[0];
                    const isPledge = prodCat === pledgeCatId;
                    const looksLikeRefundLine =
                        (l.get_quantity?.() < 0) ||
                        l.refunded_orderline_id || l.refunded_line_id || l.refundedOrderlineId;
                    return looksLikeRefundLine && !isPledge;
                });

                if (nonPledgeRefundLines.length) {
                    await this.env.services.popup.add("ErrorPopup", {
                        title: "Refund Restricted",
                        body: "Refunds are restricted to Plate Pledge lines only. Remove non-pledge items from the refund.",
                    });
                    return;
                }
            }
        }
        return await super.validateOrder(isForceValidate);
    },
});
