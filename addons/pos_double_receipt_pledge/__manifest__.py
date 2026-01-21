{
    "name": "POS Double Receipt for Pledge (Non-Taxable Deposit)",
    "version": "1.0.0",
    "category": "Point of Sale",
    "summary": "Auto-prints 2 receipts when pledge exists + forces customer mobile + pledge-only refund lock.",
    "depends": ["point_of_sale"],
    "data": [
        "views/pos_config_view.xml",
    ],
    "assets": {
        "point_of_sale._assets_pos": [
            "pos_double_receipt_pledge/static/src/js/order_helpers.js",
            "pos_double_receipt_pledge/static/src/js/require_customer_for_pledge.js",
            "pos_double_receipt_pledge/static/src/js/refund_lock_pledge_only.js",
            "pos_double_receipt_pledge/static/src/js/double_print.js",
            "pos_double_receipt_pledge/static/src/xml/receipt_templates.xml",
        ],
    },
    "installable": True,
    "license": "LGPL-3",
}

