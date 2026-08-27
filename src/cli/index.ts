import { Command } from 'commander';
import { shopifyService } from '../services/shopify';
import { razorpayService } from '../services/razorpay';
import { whatsappService } from '../services/whatsapp';
import { metaService } from '../services/meta';
import { orchestrator } from '../services/orchestrator';
import { logger } from '../utils/logger';

const program = new Command();

program
  .name('araadhya')
  .description('Araadhya Fashion AI Agent CLI - Unified Commerce Command Center')
  .version('1.0.0');

// ==========================================
// 1. SHOPIFY COMMANDS
// ==========================================
const shopifyCmd = program.command('shopify').description('Shopify store & catalog operations');

shopifyCmd
  .command('summary')
  .description('Display Shopify store metrics, inventory alerts & order stats')
  .action(async () => {
    try {
      const summary = await shopifyService.getStoreSummary();
      console.log(JSON.stringify({ success: true, summary }, null, 2));
    } catch (err: any) {
      console.error(JSON.stringify({ success: false, error: err.message }));
      process.exit(1);
    }
  });

shopifyCmd
  .command('list-products')
  .description('List products and inventory from Shopify')
  .option('-l, --limit <number>', 'Number of products to fetch', '10')
  .option('-t, --title <query>', 'Filter by title or tag')
  .option('-s, --status <status>', 'Filter by status (active/draft/archived)')
  .action(async (options) => {
    try {
      const products = await shopifyService.getProducts({
        limit: parseInt(options.limit, 10),
        title: options.title,
        status: options.status,
      });
      console.log(JSON.stringify({ success: true, count: products.length, products }, null, 2));
    } catch (err: any) {
      console.error(JSON.stringify({ success: false, error: err.message }));
      process.exit(1);
    }
  });

shopifyCmd
  .command('get-product')
  .description('Get single product details with all variants and images')
  .requiredOption('-i, --id <productId>', 'Shopify Product ID')
  .action(async (options) => {
    try {
      const product = await shopifyService.getProductById(options.id);
      if (!product) {
        console.error(JSON.stringify({ success: false, error: 'Product not found' }));
        process.exit(1);
      }
      console.log(JSON.stringify({ success: true, product }, null, 2));
    } catch (err: any) {
      console.error(JSON.stringify({ success: false, error: err.message }));
      process.exit(1);
    }
  });

shopifyCmd
  .command('update-price')
  .description('Update price and compare price of a variant')
  .requiredOption('-v, --variant-id <variantId>', 'Shopify Variant ID')
  .requiredOption('-p, --price <price>', 'New Price in INR')
  .option('-c, --compare-at <compareAt>', 'Compare-At Price in INR')
  .action(async (options) => {
    try {
      const variant = await shopifyService.updateVariant(options.variantId, {
        price: options.price,
        compare_at_price: options.compareAt,
      });
      console.log(JSON.stringify({ success: true, message: 'Price updated successfully', variant }, null, 2));
    } catch (err: any) {
      console.error(JSON.stringify({ success: false, error: err.message }));
      process.exit(1);
    }
  });

shopifyCmd
  .command('update-stock')
  .description('Update available inventory quantity at a location')
  .requiredOption('-i, --inventory-item-id <id>', 'Inventory Item ID')
  .requiredOption('-l, --location-id <id>', 'Location ID')
  .requiredOption('-q, --quantity <qty>', 'Available quantity')
  .action(async (options) => {
    try {
      const result = await shopifyService.updateInventoryLevel(options.inventoryItemId, options.locationId, parseInt(options.quantity, 10));
      console.log(JSON.stringify({ success: true, result }, null, 2));
    } catch (err: any) {
      console.error(JSON.stringify({ success: false, error: err.message }));
      process.exit(1);
    }
  });

shopifyCmd
  .command('delete-product')
  .description('Delete or archive a product from Shopify')
  .requiredOption('-i, --id <productId>', 'Shopify Product ID')
  .action(async (options) => {
    try {
      const result = await shopifyService.deleteProduct(options.id);
      console.log(JSON.stringify(result, null, 2));
    } catch (err: any) {
      console.error(JSON.stringify({ success: false, error: err.message }));
      process.exit(1);
    }
  });

shopifyCmd
  .command('bulk-publish')
  .description('Bulk publish all photos from a folder to Shopify with size variants and luxury descriptions')
  .requiredOption('-f, --folder <path>', 'Path to local folder containing product images')
  .option('-p, --price <price>', 'Default price in INR', '2499')
  .option('-c, --compare-at <price>', 'Compare-at price in INR', '4999')
  .option('-t, --type <type>', 'Product type / category', 'Chikankari Kurti')
  .action(async (options) => {
    try {
      console.log(`🚀 Starting bulk upload from: ${options.folder}...`);
      const result = await shopifyService.bulkPublishFromFolder({
        folderPath: options.folder,
        defaultPrice: parseFloat(options.price),
        compareAtPrice: parseFloat(options.compareAt),
        productType: options.type,
      });
      console.log(JSON.stringify({ success: true, summary: result }, null, 2));
    } catch (err: any) {
      console.error(JSON.stringify({ success: false, error: err.message }));
      process.exit(1);
    }
  });

shopifyCmd
  .command('list-orders')
  .description('List recent customer orders from Shopify')
  .option('-l, --limit <number>', 'Number of orders to fetch', '10')
  .option('-s, --status <status>', 'Order status: any | open | closed', 'any')
  .option('-f, --fulfillment-status <status>', 'Fulfillment status: unfulfilled | fulfilled | partial')
  .action(async (options) => {
    try {
      const orders = await shopifyService.getOrders({
        limit: parseInt(options.limit, 10),
        status: options.status,
        fulfillment_status: options.fulfillmentStatus,
      });
      console.log(JSON.stringify({ success: true, count: orders.length, orders }, null, 2));
    } catch (err: any) {
      console.error(JSON.stringify({ success: false, error: err.message }));
      process.exit(1);
    }
  });

shopifyCmd
  .command('fulfill-order')
  .description('Fulfill an order with tracking and notification')
  .requiredOption('-o, --order-id <orderId>', 'Shopify Order ID')
  .requiredOption('-t, --tracking-number <number>', 'Courier Tracking Number')
  .option('-c, --company <company>', 'Courier Company Name', 'Blue Dart Express')
  .option('-u, --url <url>', 'Tracking URL')
  .action(async (options) => {
    try {
      const result = await shopifyService.fulfillOrder({
        orderId: options.orderId,
        trackingNumber: options.trackingNumber,
        trackingCompany: options.company,
        trackingUrl: options.url,
        notifyCustomer: true,
      });
      console.log(JSON.stringify({ success: true, fulfillment: result.fulfillment }, null, 2));
    } catch (err: any) {
      console.error(JSON.stringify({ success: false, error: err.message }));
      process.exit(1);
    }
  });

// ==========================================
// 2. RAZORPAY COMMANDS
// ==========================================
const razorpayCmd = program.command('razorpay').description('Razorpay payment operations');

razorpayCmd
  .command('create-link')
  .description('Generate instant dynamic Razorpay Payment Link')
  .requiredOption('-a, --amount <amount>', 'Amount in INR')
  .requiredOption('-d, --desc <description>', 'Description / Product Name')
  .requiredOption('-n, --name <name>', 'Customer Name')
  .requiredOption('-c, --contact <contact>', 'Customer Phone number (e.g. 919876543210)')
  .option('-e, --email <email>', 'Customer Email')
  .action(async (options) => {
    try {
      const link = await razorpayService.createPaymentLink({
        amount: parseFloat(options.amount),
        description: options.desc,
        customer: {
          name: options.name,
          contact: options.contact,
          email: options.email,
        },
      });
      console.log(JSON.stringify({
        success: true,
        paymentLinkId: link.id,
        paymentUrl: link.short_url || link.url || `https://rzp.io/mock/${link.id}`,
        details: link,
      }, null, 2));
    } catch (err: any) {
      console.error(JSON.stringify({ success: false, error: err.message }));
      process.exit(1);
    }
  });

// ==========================================
// 3. WHATSAPP COMMANDS
// ==========================================
const whatsappCmd = program.command('whatsapp').description('WhatsApp Cloud API operations');

whatsappCmd
  .command('send-message')
  .description('Send direct WhatsApp text message')
  .requiredOption('-t, --to <phone>', 'Recipient phone number with country code (e.g. 919876543210)')
  .requiredOption('-m, --message <text>', 'Message text')
  .action(async (options) => {
    try {
      const result = await whatsappService.sendTextMessage({
        to: options.to,
        text: options.message,
      });
      console.log(JSON.stringify({ success: true, result }, null, 2));
    } catch (err: any) {
      console.error(JSON.stringify({ success: false, error: err.message }));
      process.exit(1);
    }
  });

whatsappCmd
  .command('send-payment-link')
  .description('Send branded Razorpay Payment Link to customer via WhatsApp')
  .requiredOption('-t, --to <phone>', 'Recipient phone number (e.g. 919876543210)')
  .requiredOption('-n, --name <name>', 'Customer Name')
  .requiredOption('-p, --product <title>', 'Product Title')
  .requiredOption('-a, --amount <amount>', 'Amount in INR')
  .requiredOption('-u, --url <url>', 'Payment URL')
  .action(async (options) => {
    try {
      const result = await whatsappService.sendPaymentLinkMessage({
        to: options.to,
        customerName: options.name,
        productTitle: options.product,
        amount: parseFloat(options.amount),
        paymentUrl: options.url,
      });
      console.log(JSON.stringify({ success: true, result }, null, 2));
    } catch (err: any) {
      console.error(JSON.stringify({ success: false, error: err.message }));
      process.exit(1);
    }
  });

whatsappCmd
  .command('send-order-confirmation')
  .description('Send order confirmation & tracking update via WhatsApp')
  .requiredOption('-t, --to <phone>', 'Recipient phone number')
  .requiredOption('-n, --name <name>', 'Customer Name')
  .requiredOption('-o, --order <orderNumber>', 'Order Number (e.g. #AF-1082)')
  .requiredOption('-a, --amount <amount>', 'Total Amount in INR')
  .requiredOption('-i, --items <items...>', 'List of items')
  .action(async (options) => {
    try {
      const result = await whatsappService.sendOrderConfirmation({
        to: options.to,
        customerName: options.name,
        orderNumber: options.order,
        totalAmount: options.amount,
        items: options.items,
      });
      console.log(JSON.stringify({ success: true, result }, null, 2));
    } catch (err: any) {
      console.error(JSON.stringify({ success: false, error: err.message }));
      process.exit(1);
    }
  });

// ==========================================
// 4. INSTAGRAM & FACEBOOK COMMANDS
// ==========================================
const metaCmd = program.command('meta').description('Meta (Instagram / Facebook / CAPI) operations');

metaCmd
  .command('send-ig-dm')
  .description('Send Instagram Direct Message')
  .requiredOption('-r, --recipient <id>', 'Instagram recipient ID')
  .requiredOption('-m, --message <text>', 'Message text')
  .action(async (options) => {
    try {
      const result = await metaService.sendInstagramDM({
        recipientId: options.recipient,
        messageText: options.message,
      });
      console.log(JSON.stringify({ success: true, result }, null, 2));
    } catch (err: any) {
      console.error(JSON.stringify({ success: false, error: err.message }));
      process.exit(1);
    }
  });

metaCmd
  .command('send-conversion')
  .description('Send Meta Conversions API (CAPI) purchase event')
  .requiredOption('-e, --event <name>', 'Event name: Purchase | Lead | InitiateCheckout')
  .requiredOption('-p, --phone <phone>', 'Customer phone')
  .requiredOption('-v, --value <value>', 'Order Value in INR')
  .option('-o, --order-id <orderId>', 'Order ID')
  .action(async (options) => {
    try {
      const result = await metaService.sendConversionEvent({
        eventName: options.event,
        userData: { phone: options.phone },
        customData: { currency: 'INR', value: parseFloat(options.value), orderId: options.orderId },
      });
      console.log(JSON.stringify({ success: true, result }, null, 2));
    } catch (err: any) {
      console.error(JSON.stringify({ success: false, error: err.message }));
      process.exit(1);
    }
  });

// ==========================================
// 5. UNIFIED OMNI-CHANNEL SELL COMMAND
// ==========================================
program
  .command('sell')
  .description('End-to-end Omni-Channel sale: Generates Razorpay link & sends via WhatsApp or Instagram')
  .requiredOption('-c, --channel <channel>', 'Channel: whatsapp | instagram')
  .requiredOption('-n, --name <name>', 'Customer Name')
  .requiredOption('-t, --to <contact>', 'Phone number (WhatsApp) or User ID (Instagram)')
  .requiredOption('-p, --product <title>', 'Product title')
  .requiredOption('-a, --amount <amount>', 'Price in INR')
  .option('--product-id <id>', 'Shopify Product ID', '101')
  .action(async (options) => {
    try {
      const result = await orchestrator.initiateChatSale({
        channel: options.channel as any,
        customerName: options.name,
        contact: options.to,
        productTitle: options.product,
        price: parseFloat(options.amount),
        productId: options.productId,
      });
      console.log(JSON.stringify({ success: true, result }, null, 2));
    } catch (err: any) {
      console.error(JSON.stringify({ success: false, error: err.message }));
      process.exit(1);
    }
  });

// ==========================================
// 6. HEALTH & DIAGNOSTICS COMMAND
// ==========================================
program
  .command('status')
  .description('Run full connection diagnostics on all 5 platforms')
  .action(async () => {
    try {
      const diagnostics = await orchestrator.runFullDiagnostics();
      console.log(JSON.stringify(diagnostics, null, 2));
    } catch (err: any) {
      console.error(JSON.stringify({ success: false, error: err.message }));
      process.exit(1);
    }
  });

program.parse(process.argv);
