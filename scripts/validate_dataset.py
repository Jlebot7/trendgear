#!/usr/bin/env python3
"""
Fase I - Paso 4 (Revision): valida el dataset final contra el checklist
de integridad de la guia metodologica.
"""
import csv
from datetime import date, datetime

PATH = "/home/claude/trendgear/data/trendgear_full_dataset.psv"
TODAY = date(2025, 12, 15)  # "hoy" de referencia del mundo ficticio del dataset

VALID_PAYMENT = {"Credit Card", "Debit Card", "PayPal", "Bank Transfer", "Cash"}
VALID_MEMBERSHIP = {"Bronze", "Silver", "Gold", "Platinum"}
VALID_CITIES = {
    "Bogota", "Bogotá, D.C.", "Medellin", "Medellín", "Cali", "Barranquilla",
    "Cartagena", "Cartagena, Bolívar", "Bucaramanga", "Pereira", "Manizales",
    "Santa Marta", "Cucuta",
}

errors = []
ids_seen = set()

with open(PATH, encoding="utf-8") as f:
    rows = list(csv.DictReader(f, delimiter="|"))

for i, r in enumerate(rows, start=2):  # +2: fila 1 es encabezado
    cid = r["Customer ID"]

    # Unicidad
    if cid in ids_seen:
        errors.append(f"Fila {i}: Customer ID duplicado ({cid})")
    ids_seen.add(cid)

    # Numeros
    age = int(r["Age"])
    if not (13 <= age <= 100):
        errors.append(f"Fila {i} ({cid}): Age fuera de rango ({age})")

    amount = int(r["Amount Spent ($)"])
    if amount < 0:
        errors.append(f"Fila {i} ({cid}): Amount Spent negativo ({amount})")

    # Fechas
    try:
        p_date = datetime.strptime(r["Purchase Date"], "%Y-%m-%d").date()
    except ValueError:
        errors.append(f"Fila {i} ({cid}): Purchase Date no es ISO YYYY-MM-DD")
        p_date = None
    try:
        l_date = datetime.strptime(r["Last Login Date"], "%Y-%m-%d").date()
    except ValueError:
        errors.append(f"Fila {i} ({cid}): Last Login Date no es ISO YYYY-MM-DD")
        l_date = None

    if p_date and p_date > TODAY:
        errors.append(f"Fila {i} ({cid}): Purchase Date futura ({p_date})")
    if l_date and l_date > TODAY:
        errors.append(f"Fila {i} ({cid}): Last Login Date futura ({l_date})")
    if p_date and l_date and p_date > l_date:
        errors.append(f"Fila {i} ({cid}): Purchase Date posterior a Last Login Date")

    # Categorias normalizadas
    if r["Payment Method"] not in VALID_PAYMENT:
        errors.append(f"Fila {i} ({cid}): Payment Method no normalizado ({r['Payment Method']})")
    if r["Membership Status"] not in VALID_MEMBERSHIP:
        errors.append(f"Fila {i} ({cid}): Membership Status no normalizado ({r['Membership Status']})")

    # Coherencia cruzada
    if not r["Email"].endswith("@example.com"):
        errors.append(f"Fila {i} ({cid}): Email no usa dominio seguro example.com")
    if r["City"] not in VALID_CITIES:
        errors.append(f"Fila {i} ({cid}): Ciudad fuera del catalogo ({r['City']})")

print(f"Registros analizados: {len(rows)}")
print(f"IDs unicos: {len(ids_seen)}")
if errors:
    print(f"\nSe encontraron {len(errors)} problema(s):")
    for e in errors:
        print(" -", e)
else:
    print("\nResultado: el dataset PASA las 6 verificaciones del checklist de integridad.")
    print(" - Numeros (Age 13-100, Amount Spent >= 0): OK")
    print(" - Fechas (ISO, Purchase <= Last Login, sin fechas futuras): OK")
    print(" - Categorias normalizadas (Payment Method, Membership Status): OK")
    print(" - Unicidad de Customer ID: OK")
    print(" - Coherencia cruzada (dominio de email, ciudad del catalogo): OK")
