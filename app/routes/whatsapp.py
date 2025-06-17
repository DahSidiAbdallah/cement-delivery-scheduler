from flask import Blueprint, request
import requests
import re
import uuid
from app.models import Client, Product
from datetime import datetime

bp = Blueprint('whatsapp', __name__, url_prefix='/whatsapp')

def simple_parse_order(message):

    """
    Parse a WhatsApp order message using regex and keyword matching.
    Example: "Commande : ciment 42,5, 50 tonnes, demain, client tasiast"
    Returns a dict with keys: client, product_name, product_type, quantity, date
    """
    result = {"ok": False}
    try:
        # Extract product name and type (e.g., "ciment" and "42,5")
        prod_match = re.search(r'ciment\s*([0-9.,]+)?', message, re.IGNORECASE)
        product_name = "ciment"
        product_type = prod_match.group(1).replace(',', '.').strip() if prod_match and prod_match.group(1) else None

        # Extract quantity
        qty_match = re.search(r'(\d+(\.\d+)?)\s*(tonnes?|t)\b', message, re.IGNORECASE)
        quantity = float(qty_match.group(1)) if qty_match else None

        # Extract client
        client_match = re.search(r'client\s*([\w\- ]+)', message, re.IGNORECASE)
        client = client_match.group(1).strip() if client_match else None

        # Extract date
        if "demain" in message.lower():
            from datetime import date, timedelta
            order_date = (date.today() + timedelta(days=1)).isoformat()
        elif "aujourd" in message.lower():
            from datetime import date
            order_date = date.today().isoformat()
        else:
            date_match = re.search(r'(\d{2}/\d{2}/\d{4})|(\d{4}-\d{2}-\d{2})', message)
            order_date = date_match.group(0) if date_match else None

        if all([client, product_name, product_type, quantity, order_date]):
            result = {
                "ok": True,
                "client": client,
                "product_name": product_name,
                "product_type": product_type,
                "quantity": quantity,
                "date": order_date
            }
    except Exception as e:
        print("Parse error:", e)
    return result

def get_client_id(client_name):
    from app.models import Client
    # Try partial, case-insensitive match
    client = Client.query.filter(Client.name.ilike(f"%{client_name.strip()}%")).first()
    if client:
        return str(client.id)
    # Try splitting and matching any word
    for c in Client.query.all():
        if client_name.lower() in c.name.lower():
            return str(c.id)
    return None

def get_product_id(product_name, product_type):
    from app.models import Product
    # Try to match both name and type (case-insensitive)
    product = Product.query.filter(
        Product.name.ilike(f"%{product_name.strip()}%"),
        Product.type.ilike(f"%{product_type.strip()}%")
    ).first()
    if product:
        return str(product.id)
    # Fallback: try matching just name
    product = Product.query.filter(Product.name.ilike(f"%{product_name.strip()}%")).first()
    if product:
        return str(product.id)
    return None

def reply_whatsapp_message(to, message):
    # Dummy: Implement Twilio API call here if needed
    print(f"Reply to {to}: {message}")

@bp.route('/webhook', methods=['POST'])
def whatsapp_webhook():
    incoming = request.form if request.form else request.json
    wa_msg = incoming.get('Body')
    wa_sender = incoming.get('From')
    print("WhatsApp received:", wa_msg)

    # 1. Parse using simple regex
    parsed = simple_parse_order(wa_msg)
    print("Available clients:", [c.name for c in Client.query.all()])
    print("Available products:", [f"{p.name} ({p.type})" for p in Product.query.all()])
    print("Parsed client:", parsed.get('client'))
    print("Parsed product_name:", parsed.get('product_name'))
    print("Parsed product_type:", parsed.get('product_type'))

    # 2. Lookup client and product IDs here...
    client_id = get_client_id(parsed['client'])
    product_id = get_product_id(parsed['product_name'], parsed['product_type'])
    print("Client ID:", client_id)
    print("Product ID:", product_id)
    print("quantity:", parsed.get('quantity'))
    print("date:", parsed.get('date'))

    if not parsed.get('ok') or not all([client_id, product_id, parsed.get('quantity'), parsed.get('date')]):
        reply_whatsapp_message(wa_sender, "Merci, il manque une information (client, produit, quantité, ou date). Merci de vérifier votre message.")
        return "Missing data", 200
    
    current_time = datetime.now().strftime("%H:%M")
    # 3. Post order to your backend (replace <your real token>)
    order_data = {
        "client_id": client_id,
        "product_id": product_id,
        "quantity": parsed['quantity'],
        "requested_date": parsed['date'],
        "requested_time": current_time,  # Use current time as requested time
        "status": "Pending"  # Default status
    }
    print("Order data being sent:", order_data)
    print("Client ID type:", type(client_id), "Product ID type:", type(product_id))
    order_resp = requests.post(
        "http://localhost:5000/orders",
        json=order_data,
        headers={"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc1MDE2ODQ3NywianRpIjoiZGQyMjI3MTYtMTNkOS00MThjLWE2ZDktZmMzZDQ5M2ZkNGU2IiwidHlwZSI6ImFjY2VzcyIsInN1YiI6ImFiNmExZjIzLWIyZjktNDg3Zi1iNWFlLTZmYTc1ZmU1ZDE3MyIsIm5iZiI6MTc1MDE2ODQ3NywiY3NyZiI6ImMxYTk2MTQ0LTAyNGYtNGExZS05NGY1LWRjODg4Njc4ZWQzZSIsImV4cCI6MTc1MDE2OTM3N30.4s_euYFRER0HtzQ8bfYgjPzlPv99TZ5-sUs0znmuvLE"}
    )
    print("Order API response:", order_resp.status_code, order_resp.text)
    if order_resp.status_code == 201:
        reply_whatsapp_message(wa_sender, "Votre commande a été enregistrée avec succès. Merci !")
        return "Order received", 200
    else:
        reply_whatsapp_message(wa_sender, "Une erreur est survenue. Veuillez réessayer plus tard.")
        return "Order failed", 200 
    
   