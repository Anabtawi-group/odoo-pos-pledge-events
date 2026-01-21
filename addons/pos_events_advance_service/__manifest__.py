{
    "name": "POS Events (Advance -> Complete Later) + Find by Mobile/QR + Service Persons + Employee Plates",
    "version": "1.0.0",
    "category": "Point of Sale",
    "depends": ["point_of_sale", "account", "hr", "pos_double_receipt_pledge"],
    "data": [
        "data/sequence.xml",
        "security/ir.model.access.csv",
        "views/menu.xml",
        "views/pos_config_view.xml",
        "views/pos_event_views.xml",
    ],
    "assets": {
        "point_of_sale._assets_pos": [
            "pos_events_advance_service/static/src/js/event_print_data.js",
            "pos_events_advance_service/static/src/js/event_qr_scan.js",

            "pos_events_advance_service/static/src/js/find_event_button.js",
            "pos_events_advance_service/static/src/xml/find_event_button.xml",

            "pos_events_advance_service/static/src/js/event_main_buttons.js",
            "pos_ev_
