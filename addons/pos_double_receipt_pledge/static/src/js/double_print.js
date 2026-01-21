/** @odoo-module **/
import { patch } from "@web/core/utils/patch";
import { ReceiptScreen } from "@point_of_sale/app/screens/receipt_screen/receipt_screen";
import { renderToString } from "@web/core/utils/render";

patch(ReceiptScreen.prototype, {
    async _printReceipt() {
        const order = this.currentOrder;
        const pledgeEnabled = !!this.pos.config.pledge_pos_categ_id?.[0];

        if (!pledgeEnabled || !order?.hasPledgeLines?.()) {
            return await super._printReceipt();
        }

        const salesData = order.exportForPrintingFiltered("sales");
        const pledgeData = order.exportForPrintingFiltered("pledge");

        if (!salesData.orderlines?.length || !pledgeData.orderlines?.length) {
            return await super._printReceipt();
        }

        const salesHtml = renderToString("pos_double_receipt_pledge.SalesReceipt", { receipt: salesData });
        const pledgeHtml = renderToString("pos_double_receipt_pledge.PledgeReceipt", { receipt: pledgeData });

        const printer = this.pos.printer || this.env.services?.printer;
        if (!printer) return await super._printReceipt();

        await printer.printReceipt(salesHtml);
        await printer.printReceipt(pledgeHtml);

        order._printed = true;
        return true;
    },
});
