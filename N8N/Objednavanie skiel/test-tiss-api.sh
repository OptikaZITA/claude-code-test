#!/bin/bash

# TISS API Test Script
# Použi na overenie API štruktúry pred nasadením workflow

# Nastav svoj token
TISS_TOKEN="${TISS_TOKEN:-}"

if [ -z "$TISS_TOKEN" ]; then
    echo "Chyba: Nastav TISS_TOKEN environment variable"
    echo "Príklad: TISS_TOKEN=tvoj-token ./test-tiss-api.sh"
    exit 1
fi

API_URL="https://tiss.sk/api/"

echo "=== TISS API Test ==="
echo ""

# 1. Test orderSearch
echo "1. Testovanie orderSearch (posledných 7 dní)..."
DATE_FROM=$(date -v-7d +%Y-%m-%d 2>/dev/null || date -d "7 days ago" +%Y-%m-%d)
DATE_TO=$(date +%Y-%m-%d)

PAYLOAD=$(cat <<EOF
{"Token":"$TISS_TOKEN","Action":"orderSearch","DateFrom":"$DATE_FROM","DateTo":"$DATE_TO"}
EOF
)

echo "   Payload: $PAYLOAD"
echo ""

RESPONSE=$(curl -s -G "$API_URL" --data-urlencode "data=$PAYLOAD")

echo "   Response:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""

# Extrahuj prvú objednávku pre detail
FIRST_ORDER=$(echo "$RESPONSE" | python3 -c "
import json, sys
data = json.load(sys.stdin)
if data.get('Result') == 'OK' and data.get('Orders'):
    print(data['Orders'][0].get('OrderNumber', ''))
" 2>/dev/null)

if [ -n "$FIRST_ORDER" ]; then
    echo "2. Detail prvej objednávky ($FIRST_ORDER)..."

    PAYLOAD2=$(cat <<EOF
{"Token":"$TISS_TOKEN","Action":"orderSearch","OrderNumber":"$FIRST_ORDER"}
EOF
)

    RESPONSE2=$(curl -s -G "$API_URL" --data-urlencode "data=$PAYLOAD2")

    echo "   Response:"
    echo "$RESPONSE2" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE2"
    echo ""
fi

# 3. Test getProductCategory
echo "3. Testovanie getProductCategory..."

PAYLOAD3=$(cat <<EOF
{"Token":"$TISS_TOKEN","Action":"getProductCategory"}
EOF
)

RESPONSE3=$(curl -s -G "$API_URL" --data-urlencode "data=$PAYLOAD3")

echo "   Response (prvých 5 kategórií):"
echo "$RESPONSE3" | python3 -c "
import json, sys
data = json.load(sys.stdin)
if data.get('Result') == 'OK' and data.get('Data'):
    for cat in data['Data'][:5]:
        print(f\"   - {cat.get('ProductCategoryID')}: {cat.get('Name')}\")
" 2>/dev/null

echo ""
echo "=== Test dokončený ==="
echo ""
echo "Ďalšie kroky:"
echo "1. Skontroluj štruktúru Orders - hlavne polia pre optické parametre"
echo "2. Nájdi kategóriu 'Výroba' v getProductCategory odpovedi"
echo "3. Over IsPaid a Phase polia"
