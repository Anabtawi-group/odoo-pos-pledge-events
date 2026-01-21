/** @odoo-module **/
import { patch } from "@web/core/utils/patch";
import { ReceiptScreen } from "@point_of_sale/app/screens/receipt_screen/receipt_screen";
import { renderToString } from "@web/core/utils/render";

patch(ReceiptScreen.prototype, {
    async _printReceipt() {
        const order = this.currentOrder;
        const advProdId = this.pos.config.advance_product_id?.[0];

        if (advProdId && order) {
            const lines = order.get_orderlines?.() || [];
            const isAdvanceOnly = lines.length === 1 && lines[0].product?.id === advProdId;
            if (isAdvanceOnly) {
                const data = order.export_for_printing();
                const partner = order.get_partner?.();
                data._customer_name = partner?.name || "";
                data._customer_mobile = partner?.mobile || partner?.phone || "";

                const html = renderToString("pos_events_advance_service.AdvanceReceipt", { receipt: data });
                const printer = this.pos.printer || this.env.services?.printer;
                if (printer) {
                    await printer.printReceipt(html);
                    order._printed = true;
                    return true;
                }
            }
        }
        return await super._printReceipt();
    },
});
