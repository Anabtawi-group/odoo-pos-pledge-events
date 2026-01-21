/** @odoo-module **/
import { patch } from "@web/core/utils/patch";
import { BarcodeReaderService } from "@point_of_sale/app/barcode_reader_service/barcode_reader_service";

patch(BarcodeReaderService.prototype, {
    async _processBarcode(barcode) {
        const code = (barcode?.code || "").trim();
        if (code.startsWith("EVT:")) {
            const eventId = parseInt(code.split(":")[1]);
            const order = this.env.pos.get_order();
            if (order && !isNaN(eventId)) {
                order.event_id = eventId;
                this.env.services?.notification?.add(`Event loaded: ${code}`, { type: "success" });
            }
            return;
        }
        return await super._processBarcode(barcode);
    },
});
