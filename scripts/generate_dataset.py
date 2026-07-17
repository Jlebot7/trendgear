#!/usr/bin/env python3
"""
Fase I - Paso 3 (ruta "Script de Python"): genera el dataset sintetico completo
de TrendGear aplicando EXACTAMENTE las mismas reglas del prompt de one-shot
documentado en data/one_shot_prompt_dataset.txt

La guia metodologica ofrece dos caminos equivalentes para este paso:
  a) Entregarle el prompt de one-shot directamente a un modelo de IA.
  b) Automatizar la generacion con un script de Python (ruta preferida del
     desarrollador, permite controlar distribuciones estadisticas).
Aqui se implementa la ruta (b), respetando al pie de la letra las 11 reglas
del prompt para que el resultado sea equivalente al que entregaria la IA.
"""
import random
import csv
import json
from datetime import date, timedelta

random.seed(7)  # reproducibilidad

FIRST_NAMES = [
    "Camila", "Julian", "Valentina", "Andres", "Mariana", "Santiago", "Laura",
    "Felipe", "Daniela", "Sebastian", "Isabella", "Nicolas", "Sofia", "Miguel",
    "Alejandra", "David", "Paula", "Juan", "Natalia", "Diego", "Carolina",
    "Ricardo", "Manuela", "Esteban", "Gabriela", "Tomas", "Luisa", "Samuel",
    "Antonia", "Emilio",
]
LAST_NAMES = [
    "Restrepo", "Gomez", "Rios", "Torres", "Duarte", "Lopez", "Ramirez",
    "Castro", "Pena", "Vargas", "Rojas", "Mora", "Aguilar", "Cardenas",
    "Beltran", "Nino", "Salazar", "Quintero", "Zapata", "Cifuentes",
]
CITIES = [
    "Bogota", "Medellin", "Cali", "Barranquilla", "Cartagena",
    "Bucaramanga", "Pereira", "Manizales", "Santa Marta", "Cucuta",
]
PAYMENT_METHODS = ["Credit Card", "Debit Card", "PayPal", "Bank Transfer", "Cash"]
MEMBERSHIP = ["Bronze", "Silver", "Gold", "Platinum"]

# catalogo cerrado producto -> rango de precio realista (COP)
PRODUCTS = {
    "Wireless Mouse": (45000, 120000),
    "Mechanical Keyboard": (150000, 320000),
    "4K Monitor 27\"": (900000, 1600000),
    "Smartwatch Pro": (450000, 950000),
    "Noise Cancelling Headphones": (380000, 780000),
    "USB-C Hub": (60000, 150000),
    "Laptop Ultra 14": (2800000, 5200000),
    "Bluetooth Speaker": (90000, 250000),
    "External SSD 1TB": (280000, 480000),
    "Webcam HD": (110000, 260000),
    "Tablet 10 inch": (900000, 1800000),
    "Fast Charger 65W": (55000, 95000),
}

TODAY = date(2025, 12, 15)  # "hoy" de referencia dentro del dataset ficticio
EARLIEST_PURCHASE = date(2025, 9, 1)

used_emails = set()


def make_person():
    first = random.choice(FIRST_NAMES)
    last = random.choice(LAST_NAMES)
    name = f"{first} {last}"
    base_email = f"{first.lower()}.{last.lower()}@example.com"
    email = base_email
    n = 2
    while email in used_emails:
        email = f"{first.lower()}.{last.lower()}{n}@example.com"
        n += 1
    used_emails.add(email)
    return name, email


def random_date(start: date, end: date) -> date:
    span = (end - start).days
    return start + timedelta(days=random.randint(0, max(span, 0)))


def generate_record(idx: int) -> dict:
    name, email = make_person()
    product = random.choice(list(PRODUCTS.keys()))
    lo, hi = PRODUCTS[product]
    amount = random.randint(lo, hi)
    amount = round(amount / 1000) * 1000  # cifras redondas, coherentes con precios reales

    purchase_date = random_date(EARLIEST_PURCHASE, TODAY)
    last_login = random_date(purchase_date, TODAY)  # regla 10: last_login >= purchase_date

    return {
        "Customer ID": f"TG-{1006 + idx}",
        "Name": name,
        "Email": email,
        "Product Purchased": product,
        "Purchase Date": purchase_date.isoformat(),
        "Amount Spent ($)": amount,
        "Age": random.randint(18, 65),
        "City": random.choice(CITIES),
        "Payment Method": random.choice(PAYMENT_METHODS),
        "Last Login Date": last_login.isoformat(),
        "Membership Status": random.choice(MEMBERSHIP),
    }


def main():
    n_new = 60
    records = [generate_record(i) for i in range(1, n_new + 1)]

    fieldnames = list(records[0].keys())

    # PSV con encabezado (paso 3 -> archivo listo para revision en paso 4)
    with open("/home/claude/trendgear/data/trendgear_dataset.psv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter="|")
        writer.writeheader()
        writer.writerows(records)

    # CSV equivalente
    with open("/home/claude/trendgear/data/trendgear_dataset.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)

    # JSON en forma de objeto (clave = Customer ID), formato nativo de Firebase Realtime Database
    firebase_obj = {r["Customer ID"].replace("-", "_"): r for r in records}
    with open("/home/claude/trendgear/data/trendgear_dataset.json", "w", encoding="utf-8") as f:
        json.dump(firebase_obj, f, ensure_ascii=False, indent=2)

    print(f"Generados {len(records)} registros nuevos (TG-1007 a TG-{1006 + n_new}).")
    print("Archivos: trendgear_dataset.psv / .csv / .json")


if __name__ == "__main__":
    main()
