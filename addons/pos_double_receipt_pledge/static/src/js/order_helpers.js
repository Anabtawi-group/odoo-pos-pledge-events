/** @odoo-module **/
import { patch } from "@web/core/utils/patch";
import { Order } from "@point_of_sale/app/store/models";

patch(Order.prototype, {
    _pledgeCatId() {
        return this.pos.config.pledge_pos_categ_id?.[0] || null;
    },
    hasPledgeLines() {
        const pledgeCatId = this._pledgeCatId();
        if (!pledgeCatId) return false;
        return this.get_orderlines().some((line) => (line.product?.pos_categ_id?.[0] === pledgeCatId));
    },
    exportForPrintingFiltered(mode) {
        const data = this.export_for_printing();
        const partner = this.get_partner?.();
        data._customer_name = partner?.name || "";
        data._customer_mobile = partner?.mobile || partner?.phone || "";
        data._receipt_mode = mode;

        const pledgeCatId = this._pledgeCatId();
        if (!pledgeCatId) return data;

        const isPledgeLine = (line) => (line.product?.pos_categ_id?.[0] === pledgeCatId);
        const filteredLines = this.get_orderlines().filter((l) =>
            mode === "pledge" ? isPledgeLine(l) : !isPledgeLine(l)
        );
        data.orderlines = filteredLines.map((l) => l.export_for_printing());
        return data;
    },
});
