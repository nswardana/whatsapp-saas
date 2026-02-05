#!/bin/bash

API_URL="https://evolution-api.beeasy.id/api"

echo "========================================="
echo "Testing WhatsApp SaaS API"
echo "========================================="

# 1. Register User
echo -e "\n1. Register User..."
REGISTER_RESPONSE=$(curl -s -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456!",
    "full_name": "Test User",
    "company_name": "Test Company",
    "plan_type": "business"
  }')

echo "$REGISTER_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$REGISTER_RESPONSE"

# Extract API Key
API_KEY=$(echo "$REGISTER_RESPONSE" | grep -o '"api_key":"[^"]*' | cut -d'"' -f4)
echo -e "\nAPI Key: $API_KEY"

if [ -z "$API_KEY" ]; then
    echo "Failed to get API Key. Exiting..."
    exit 1
fi

# 2. Get Profile
echo -e "\n2. Get Profile..."
curl -s -X GET $API_URL/user/profile \
  -H "x-api-key: $API_KEY" | python3 -m json.tool 2>/dev/null

# 3. Create Phone Number
echo -e "\n3. Create Phone Number..."
PHONE_RESPONSE=$(curl -s -X POST $API_URL/phone-numbers/create \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "display_name": "Test WhatsApp Number"
  }')

echo "$PHONE_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$PHONE_RESPONSE"

# Extract Token & ID
TOKEN=$(echo "$PHONE_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
PHONE_ID=$(echo "$PHONE_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

echo -e "\nToken: $TOKEN"
echo "Phone ID: $PHONE_ID"

if [ -z "$TOKEN" ] || [ -z "$PHONE_ID" ]; then
    echo "Failed to create phone number. Check logs."
    exit 1
fi

# 4. Get QR Code
echo -e "\n4. Get QR Code..."
QR_RESPONSE=$(curl -s -X GET "$API_URL/phone-numbers/$PHONE_ID/qr" \
  -H "x-api-key: $API_KEY")

echo "$QR_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$QR_RESPONSE"

# Extract QR code (first 100 chars)
QR_CODE=$(echo "$QR_RESPONSE" | grep -o '"qr_code":"[^"]*' | cut -d'"' -f4 | head -c 100)
echo -e "\nQR Code (first 100 chars): $QR_CODE..."

# 5. List Phone Numbers
echo -e "\n5. List Phone Numbers..."
curl -s -X GET $API_URL/phone-numbers \
  -H "x-api-key: $API_KEY" | python3 -m json.tool 2>/dev/null

# 6. Get Phone Status
echo -e "\n6. Get Phone Status..."
curl -s -X GET "$API_URL/phone-numbers/$PHONE_ID/status" \
  -H "x-api-key: $API_KEY" | python3 -m json.tool 2>/dev/null

# 7. Get Dashboard
echo -e "\n7. Get Dashboard..."
curl -s -X GET $API_URL/dashboard \
  -H "x-api-key: $API_KEY" | python3 -m json.tool 2>/dev/null

# 8. Get Statistics
echo -e "\n8. Get Statistics..."
curl -s -X GET $API_URL/statistics \
  -H "x-api-key: $API_KEY" | python3 -m json.tool 2>/dev/null

echo -e "\n========================================="
echo "Testing Complete!"
echo "========================================="
echo -e "\nIMPORTANT:"
echo "- API Key: $API_KEY"
echo "- Phone ID: $PHONE_ID"
echo "- Token: $TOKEN"
echo -e "\nNext steps:"
echo "1. Scan the QR code with WhatsApp"
echo "2. Wait for status to become 'connected'"
echo "3. Use the token to send messages"
echo -e "\nExample send message:"
echo "curl -X POST $API_URL/messages/send-text \\"
echo "  -H \"x-api-key: $API_KEY\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"token\": \"$TOKEN\", \"number\": \"628123456789\", \"text\": \"Hello!\"}'"
echo "========================================="
