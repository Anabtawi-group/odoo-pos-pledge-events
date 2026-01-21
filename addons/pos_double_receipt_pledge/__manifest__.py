{
    "name": "POS Double Receipt for Pledge (Non-Taxable Deposit)",
    "version": "1.0.0",
    "category": "Point of Sale",
    "summary": "Automatically prints two receipts when a pledge (deposit) exists and enforces customer mobile. Refunds restricted to pledge only.",
    "description": """
POS Double Receipt for Pledge

Features:
- Non-taxable plate pledge treated as liability
- Automatic double receipt printing (Sales + Pledge)
- Mandatory customer + mobile when pledge exists
- Pledge-only refund lock (sales never affected)
- Works per branch POS configuration
""",
    "author": "Anabtawi Group",
    "license": "LGPL-3",

    "depends": [
        "point_of_sale",
        "account",
    ],

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
    "application": False,
    "auto_install": False,
}
