# Araadhya Fashion Agentic Command Rules

Whenever the user asks you to perform actions for **Araadhya Fashion** in chat:

1. **Check Status / Diagnostics**:
   Run: `npm run araadhya -- status`

2. **List Products / Inventory**:
   Run: `npm run araadhya -- shopify list-products --limit 10`

3. **Generate & Send Payment Link to Customer**:
   Run: `npm run araadhya -- sell -c <whatsapp|instagram> -n "<Customer Name>" -t "<Phone or IG ID>" -p "<Product Title>" -a <Price>`

4. **Send Direct WhatsApp Message**:
   Run: `npm run araadhya -- whatsapp send-message -t "<Phone>" -m "<Text>"`

5. **Send WhatsApp Order Tracking**:
   Run: `npm run araadhya -- whatsapp send-order-confirmation -t "<Phone>" -n "<Name>" -o "<Order#>" -a "<Amount>" -i "<Item1>" "<Item2>"`

6. **Send Instagram DM**:
   Run: `npm run araadhya -- meta send-ig-dm -r "<RecipientID>" -m "<Text>"`

7. **Create Shopify Order**:
   Run: `npm run araadhya -- shopify create-order -t "<Title>" -p "<Price>" -c "<CustomerName>" --phone "<Phone>"`
