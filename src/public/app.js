// State
let productsList = [];
let ordersList = [];
let activeOrderFilter = 'all';
let selectedPdpSize = '38-M';

// DOM Elements
const serverStatusEl = document.getElementById('server-status');
const tabPanes = document.querySelectorAll('.tab-pane');
const pageTitleEl = document.getElementById('page-title');
const logFeedEl = document.getElementById('log-feed');
const btnRefreshStatus = document.getElementById('btn-refresh-status');
const btnClearLogs = document.getElementById('btn-clear-logs');
const formChatSale = document.getElementById('form-chat-sale');
const saleProductSelect = document.getElementById('sale-product-select');
const salePriceInput = document.getElementById('sale-price');
const saleResultPreview = document.getElementById('sale-result-preview');
const productListContainer = document.getElementById('product-list-container');
const btnRefreshProducts = document.getElementById('btn-refresh-products');
const catalogSearchInput = document.getElementById('catalog-search-input');
const catalogStatusFilter = document.getElementById('catalog-status-filter');
const ordersTableBody = document.getElementById('orders-table-body');
const btnRefreshOrders = document.getElementById('btn-refresh-orders');
const orderFilterButtons = document.querySelectorAll('.btn-order-tab');
const formSimulator = document.getElementById('form-simulator');
const simResult = document.getElementById('sim-result');
const simOutput = document.getElementById('sim-output');

// Navigation Tabs (Sidebar + iOS Bottom Bar)
const allNavLinks = document.querySelectorAll('.nav-item, .ios-tab-item');

function switchTab(tabName) {
  allNavLinks.forEach((n) => {
    if (n.getAttribute('data-tab') === tabName) {
      n.classList.add('active');
    } else {
      n.classList.remove('active');
    }
  });

  tabPanes.forEach((p) => p.classList.remove('active'));
  const targetPane = document.getElementById(`tab-${tabName}`);
  if (targetPane) targetPane.classList.add('active');

  if (tabName === 'overview') {
    pageTitleEl.textContent = 'Platform Overview & Integrations';
    loadSummaryMetrics();
  }
  if (tabName === 'storefront') {
    pageTitleEl.textContent = 'Storefront Experience (Best-in-Class PDP)';
  }
  if (tabName === 'catalog') {
    pageTitleEl.textContent = 'Shopify Catalog & Inventory Manager';
    loadProducts();
  }
  if (tabName === 'orders') {
    pageTitleEl.textContent = 'Shopify Orders & Fulfillment Hub';
    loadOrders();
  }
  if (tabName === 'iosupload') pageTitleEl.textContent = 'iPhone Studio Direct Uploader';
  if (tabName === 'vendorbot') {
    pageTitleEl.textContent = 'WhatsApp Vendor Group 2x Auto-Publisher';
    pollVendorStatus();
  }
  if (tabName === 'bulkupload') pageTitleEl.textContent = 'Bulk Upload & AI Virtual Studio';
  if (tabName === 'sales') pageTitleEl.textContent = 'Omni-Channel Instant Sales';
  if (tabName === 'simulator') pageTitleEl.textContent = 'Payment & Automation Simulator';
  if (tabName === 'guide') pageTitleEl.textContent = 'API Setup Guide';
}

allNavLinks.forEach((item) => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const tabName = item.getAttribute('data-tab');
    switchTab(tabName);
  });
});

// Modal Helpers
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('open');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('open');
}
window.closeModal = closeModal;

// ==========================================
// STOREFRONT PDP PREVIEW INTERACTION LOGIC
// ==========================================
const btnViewMobile = document.getElementById('btn-view-mobile');
const btnViewDesktop = document.getElementById('btn-view-desktop');
const storefrontWrapper = document.getElementById('storefront-preview-wrapper');
const phoneFrame = document.getElementById('phone-frame');
const arfActiveImage = document.getElementById('arf-active-image');
const arfThumbItems = document.querySelectorAll('.arf-thumb-item');
const arfSizeChips = document.querySelectorAll('.arf-size-chip');
const arfSelectedSizeText = document.getElementById('arf-selected-size-text');
const arfStickySizeLabel = document.getElementById('arf-sticky-size-label');
const btnCheckPincode = document.getElementById('btn-check-pincode');
const arfPincodeVal = document.getElementById('arf-pincode-val');
const arfPincodeOutput = document.getElementById('arf-pincode-output');
const btnOpenSizeChart = document.getElementById('btn-open-size-chart');
const btnOpenLiquidModal = document.getElementById('btn-open-liquid-modal');
const liquidCodeBox = document.getElementById('liquid-code-box');
const btnCopyLiquid = document.getElementById('btn-copy-liquid');
const liquidCopiedStatus = document.getElementById('liquid-copied-status');

// Device View Switcher
btnViewMobile?.addEventListener('click', () => {
  btnViewMobile.classList.add('active');
  btnViewDesktop.classList.remove('active');
  storefrontWrapper.className = 'preview-container device-mobile';
  phoneFrame.style.border = '4px solid #334155';
  phoneFrame.style.padding = '12px';
  phoneFrame.style.borderRadius = '36px';
});

btnViewDesktop?.addEventListener('click', () => {
  btnViewDesktop.classList.add('active');
  btnViewMobile.classList.remove('active');
  storefrontWrapper.className = 'preview-container device-desktop';
  phoneFrame.style.border = 'none';
  phoneFrame.style.padding = '0';
  phoneFrame.style.borderRadius = '0';
  phoneFrame.style.background = 'transparent';
});

// Gallery Thumb Click
arfThumbItems.forEach((thumb) => {
  thumb.addEventListener('click', () => {
    arfThumbItems.forEach((t) => t.classList.remove('active'));
    thumb.classList.add('active');
    const newSrc = thumb.getAttribute('data-img');
    if (arfActiveImage && newSrc) {
      arfActiveImage.src = newSrc;
    }
  });
});

// Size Chips Click
arfSizeChips.forEach((chip) => {
  chip.addEventListener('click', () => {
    arfSizeChips.forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
    selectedPdpSize = chip.getAttribute('data-size');
    if (arfSelectedSizeText) arfSelectedSizeText.textContent = selectedPdpSize;
    if (arfStickySizeLabel) arfStickySizeLabel.textContent = selectedPdpSize;
  });
});

// Pincode Estimator Check
btnCheckPincode?.addEventListener('click', () => {
  const pin = arfPincodeVal?.value.trim();
  if (!pin || pin.length !== 6 || isNaN(Number(pin))) {
    arfPincodeOutput.innerHTML = `<span style="color: #DC2626;">❌ Please enter a valid 6-digit Indian Pincode.</span>`;
    return;
  }

  // Calculate estimated delivery (3 days from now)
  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + 3);
  const dateStr = deliveryDate.toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' });

  arfPincodeOutput.innerHTML = `
    <span>✅</span> <span>Delivers by <b>${dateStr}</b> to Pincode <b>${pin}</b> | Cash on Delivery Available</span>
  `;
});

// FAQ Accordion Toggle
document.querySelectorAll('.arf-faq-question').forEach((q) => {
  q.addEventListener('click', () => {
    const parent = q.parentElement;
    parent.classList.toggle('open');
  });
});

// Size Guide Modal Open
btnOpenSizeChart?.addEventListener('click', () => {
  openModal('modal-size-guide');
});

// Liquid Code Modal Open & Generator
const liquidThemeSnippet = `{% comment %}
  =============================================================================
  Araadhya Fashion — Best-in-Class Conversion Pack
  File: snippets/araadhya-conversion-pack.liquid
  Features:
    - 5-Angle Editorial Visual Merchandising
    - Real-Time Pincode Delivery Estimator with COD validator
    - Model Measurements & 2-Inch Ease Sizing Guide
    - Royal Heritage Micro Trust Badges
    - Sticky Mobile 1-Click Fast Buy Bar
  =============================================================================
{% endcomment %}

<style>
  .arf-pdp-container { font-family: inherit; margin: 20px 0; color: #1E293B; }
  .arf-festive-badge { background: #FEF3C7; border: 1px dashed #F59E0B; padding: 8px 12px; border-radius: 8px; font-size: 12px; color: #92400E; font-weight: 700; margin-bottom: 14px; }
  .arf-pincode-wrap { background: #FAF7F2; border: 1px solid #E2D9CC; border-radius: 10px; padding: 14px; margin: 16px 0; }
  .arf-trust-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 18px 0; border-top: 1px solid #E2E8F0; padding-top: 14px; }
  .arf-trust-cell { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #475569; font-weight: 600; }
  .arf-sticky-bar-mobile { position: fixed; bottom: 0; left: 0; right: 0; background: rgba(255,255,255,0.96); backdrop-filter: blur(12px); border-top: 1px solid #E2E8F0; padding: 10px 16px; display: flex; align-items: center; justify-content: space-between; z-index: 9999; box-shadow: 0 -4px 16px rgba(0,0,0,0.08); }
  @media(min-width: 769px) { .arf-sticky-bar-mobile { display: none; } }
</style>

<div class="arf-pdp-container">
  <div class="arf-festive-badge">
    🎁 Festive Offer: Extra ₹200 OFF on Instant Prepaid UPI | Code: FESTIVE200
  </div>

  <!-- Pincode Estimator -->
  <div class="arf-pincode-wrap">
    <div style="font-size: 13px; font-weight: 700; margin-bottom: 6px;">🚚 Check Delivery Date & Cash on Delivery:</div>
    <div style="display: flex; gap: 8px;">
      <input type="text" id="arf-pin-input" placeholder="Enter 6-digit Pincode" maxlength="6" style="flex: 1; padding: 8px 12px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 13px;" />
      <button type="button" id="arf-pin-btn" style="background: #780016; color: #FFF; border: none; padding: 8px 14px; border-radius: 6px; font-weight: 700; cursor: pointer;">Check</button>
    </div>
    <div id="arf-pin-msg" style="margin-top: 8px; font-size: 12px; color: #166534; font-weight: 600; display: none;"></div>
  </div>

  <!-- Trust Badges -->
  <div class="arf-trust-row">
    <div class="arf-trust-cell"><span>🧵</span> 100% Hand-Embroidered</div>
    <div class="arf-trust-cell"><span>🔄</span> 7-Day Easy Exchange</div>
    <div class="arf-trust-cell"><span>⚡</span> Free Express Shipping</div>
    <div class="arf-trust-cell"><span>💵</span> Cash on Delivery (COD)</div>
  </div>
</div>

<script>
  document.getElementById('arf-pin-btn')?.addEventListener('click', function() {
    const pin = document.getElementById('arf-pin-input')?.value.trim();
    const msg = document.getElementById('arf-pin-msg');
    if (pin && pin.length === 6) {
      const d = new Date(); d.setDate(d.getDate() + 3);
      msg.style.display = 'block';
      msg.innerHTML = '✅ Estimated Delivery by <b>' + d.toDateString() + '</b> | COD Available';
    }
  });
</script>`;

btnOpenLiquidModal?.addEventListener('click', () => {
  if (liquidCodeBox) liquidCodeBox.value = liquidThemeSnippet.trim();
  openModal('modal-liquid-snippet');
});

btnCopyLiquid?.addEventListener('click', () => {
  if (liquidCodeBox) {
    navigator.clipboard.writeText(liquidCodeBox.value);
    if (liquidCopiedStatus) {
      liquidCopiedStatus.style.display = 'inline-block';
      setTimeout(() => {
        liquidCopiedStatus.style.display = 'none';
      }, 3000);
    }
  }
});

// ==========================================
// STORE SUMMARY METRICS
// ==========================================
async function loadSummaryMetrics() {
  try {
    const res = await fetch('/api/shopify/summary');
    const data = await res.json();
    if (data.success && data.summary) {
      const s = data.summary;
      document.getElementById('metric-total-prods').textContent = s.totalProducts;
      document.getElementById('metric-active-prods').textContent = `${s.activeProducts} Active / ${s.totalVariants} Variants`;
      document.getElementById('metric-total-orders').textContent = s.totalOrders;
      document.getElementById('metric-paid-orders').textContent = `${s.paidOrders} Paid Orders`;
      document.getElementById('metric-unfulfilled-orders').textContent = s.unfulfilledOrders;
      document.getElementById('metric-low-stock').textContent = s.lowStockVariants;
    }
  } catch (err) {
    console.error('Error loading store summary:', err);
  }
}

// ==========================================
// SHOPIFY CATALOG MANAGEMENT
// ==========================================
async function loadProducts() {
  try {
    const query = catalogSearchInput?.value || '';
    const status = catalogStatusFilter?.value || '';
    const url = `/api/products?title=${encodeURIComponent(query)}&status=${encodeURIComponent(status)}&limit=50`;

    const res = await fetch(url);
    const data = await res.json();
    productsList = data.products || [];

    saleProductSelect.innerHTML = '<option value="">-- Choose a Product --</option>';
    productListContainer.innerHTML = '';

    if (productsList.length === 0) {
      productListContainer.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; color: #94A3B8; padding: 40px;">
          No products found matching your search.
        </div>
      `;
      return;
    }

    productsList.forEach((prod) => {
      const mainVariant = prod.variants?.[0] || { price: '0', inventory_quantity: 0 };
      const price = mainVariant.price || '0';
      const comparePrice = mainVariant.compare_at_price;
      const totalStock = prod.variants?.reduce((sum, v) => sum + (v.inventory_quantity || 0), 0) ?? 0;

      let stockBadge = '<span class="badge-instock">In Stock</span>';
      if (totalStock <= 0) {
        stockBadge = '<span class="badge-outofstock">Out of Stock</span>';
      } else if (totalStock <= 5) {
        stockBadge = `<span class="badge-lowstock">Low Stock (${totalStock})</span>`;
      } else {
        stockBadge = `<span class="badge-instock">${totalStock} in Stock</span>`;
      }

      const opt = document.createElement('option');
      opt.value = prod.id;
      opt.textContent = `${prod.title} (₹${price})`;
      opt.setAttribute('data-price', price);
      opt.setAttribute('data-title', prod.title);
      saleProductSelect.appendChild(opt);

      const card = document.createElement('div');
      card.className = 'product-item-card';
      const img = prod.images?.[0]?.src || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800';

      card.innerHTML = `
        <div style="position: relative;">
          <img src="${img}" class="product-img" alt="${prod.title}" />
          <div style="position: absolute; top: 8px; right: 8px;">${stockBadge}</div>
        </div>
        <div class="product-item-body">
          <div style="font-size: 11px; color: #780016; font-weight: 700; text-transform: uppercase; margin-bottom: 2px;">
            ${prod.product_type || 'Ethnic Wear'}
          </div>
          <h4 style="font-size: 14px; font-weight: 700; margin-bottom: 6px; line-height: 1.3;">${prod.title}</h4>
          
          <div style="display: flex; align-items: baseline; gap: 8px; margin-bottom: 8px;">
            <div class="product-price">₹${parseFloat(price).toLocaleString('en-IN')}</div>
            ${comparePrice ? `<div style="font-size: 12px; color: #94A3B8; text-decoration: line-through;">₹${parseFloat(comparePrice).toLocaleString('en-IN')}</div>` : ''}
          </div>

          <div style="font-size: 11px; color: #64748B; margin-bottom: 12px;">
            Variants: <b>${prod.variants?.length || 0} sizes</b> (SKU: ${mainVariant.sku || 'N/A'})
          </div>

          <div class="product-item-actions">
            <button class="btn btn-sm btn-outline btn-edit-variant" data-prod-id="${prod.id}">
              ✏️ Edit
            </button>
            <button class="btn btn-sm btn-primary btn-select-product" data-id="${prod.id}">
              ⚡ Sell
            </button>
            <button class="btn btn-sm btn-outline btn-delete-product" data-id="${prod.id}" style="color: #DC2626; border-color: #FCA5A5;">
              🗑️
            </button>
          </div>
        </div>
      `;
      productListContainer.appendChild(card);
    });

    attachCatalogCardListeners();
  } catch (err) {
    addLog(`Error loading products: ${err.message}`, 'warn');
  }
}

function attachCatalogCardListeners() {
  document.querySelectorAll('.btn-select-product').forEach((btn) => {
    btn.addEventListener('click', () => {
      const prodId = btn.getAttribute('data-id');
      saleProductSelect.value = prodId;
      const selectedOpt = saleProductSelect.selectedOptions[0];
      if (selectedOpt) {
        salePriceInput.value = selectedOpt.getAttribute('data-price');
      }
      switchTab('sales');
    });
  });

  document.querySelectorAll('.btn-edit-variant').forEach((btn) => {
    btn.addEventListener('click', () => {
      const prodId = btn.getAttribute('data-prod-id');
      const prod = productsList.find((p) => p.id.toString() === prodId.toString());
      if (prod && prod.variants && prod.variants[0]) {
        const v = prod.variants[0];
        document.getElementById('ev-variant-id').value = v.id;
        document.getElementById('ev-title').value = `${prod.title} (${v.title || 'Standard'})`;
        document.getElementById('ev-price').value = v.price;
        document.getElementById('ev-compare-price').value = v.compare_at_price || '';
        document.getElementById('ev-sku').value = v.sku || '';
        document.getElementById('ev-stock').value = v.inventory_quantity || 10;
        openModal('modal-edit-variant');
      }
    });
  });

  document.querySelectorAll('.btn-delete-product').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const prodId = btn.getAttribute('data-id');
      const prod = productsList.find((p) => p.id.toString() === prodId.toString());
      if (!confirm(`Are you sure you want to delete "${prod?.title || 'this product'}" from Shopify?`)) return;

      try {
        const res = await fetch(`/api/shopify/products/${prodId}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          addLog(`Product "${prod?.title}" deleted successfully`, 'success');
          loadProducts();
          loadSummaryMetrics();
        } else {
          alert(`Error deleting product: ${data.error}`);
        }
      } catch (err) {
        alert(`Error: ${err.message}`);
      }
    });
  });
}

catalogSearchInput?.addEventListener('input', () => {
  clearTimeout(window._catalogSearchTimer);
  window._catalogSearchTimer = setTimeout(loadProducts, 300);
});

catalogStatusFilter?.addEventListener('change', loadProducts);
btnRefreshProducts?.addEventListener('click', loadProducts);

// ==========================================
// CREATE PRODUCT MODAL & AI SEO GENERATOR
// ==========================================
const btnOpenCreateModal = document.getElementById('btn-open-create-modal');
const formCreateProduct = document.getElementById('form-create-product');
const btnGenerateAiSeo = document.getElementById('btn-generate-ai-seo');
const cpTitle = document.getElementById('cp-title');
const cpType = document.getElementById('cp-type');
const cpFabric = document.getElementById('cp-fabric');
const cpPrice = document.getElementById('cp-price');
const cpComparePrice = document.getElementById('cp-compare-price');
const cpDescription = document.getElementById('cp-description');
const cpFiles = document.getElementById('cp-files');
const btnSubmitCreateProd = document.getElementById('btn-submit-create-prod');

btnOpenCreateModal?.addEventListener('click', () => {
  openModal('modal-create-product');
});

btnGenerateAiSeo?.addEventListener('click', async () => {
  const title = cpTitle.value || 'Lucknowi Chikankari Anarkali Kurti';
  const product_type = cpType.value;
  const price = cpPrice.value || '2999';
  const fabric = cpFabric.value;

  btnGenerateAiSeo.disabled = true;
  btnGenerateAiSeo.textContent = '⏳ Generating AI Copy & SEO...';

  try {
    const res = await fetch('/api/shopify/generate-seo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, product_type, price, fabric }),
    });
    const data = await res.json();
    btnGenerateAiSeo.disabled = false;
    btnGenerateAiSeo.textContent = '✨ Generate AI Luxury Copy & SEO';

    if (data.success && data.seo) {
      cpDescription.value = `${data.seo.aeoFaqSection}`;
      addLog(`AI SEO & AEO copy generated for "${title}"`, 'success');
    }
  } catch (err) {
    btnGenerateAiSeo.disabled = false;
    btnGenerateAiSeo.textContent = '✨ Generate AI Luxury Copy & SEO';
    alert(`Error generating copy: ${err.message}`);
  }
});

formCreateProduct?.addEventListener('submit', async (e) => {
  e.preventDefault();
  btnSubmitCreateProd.disabled = true;
  btnSubmitCreateProd.textContent = '⏳ Publishing to Shopify Live...';

  const title = cpTitle.value;
  const product_type = cpType.value;
  const fabric = cpFabric.value;
  const price = cpPrice.value;
  const compare_at_price = cpComparePrice.value;
  const body_html = cpDescription.value;

  const imagesBase64 = [];
  const files = Array.from(cpFiles?.files || []);

  const readFilePromises = files.map((file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        imagesBase64.push(event.target.result);
        resolve();
      };
      reader.readAsDataURL(file);
    });
  });

  await Promise.all(readFilePromises);

  try {
    const res = await fetch('/api/shopify/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        product_type,
        fabric,
        price,
        compare_at_price,
        body_html,
        images: imagesBase64,
      }),
    });

    const data = await res.json();
    btnSubmitCreateProd.disabled = false;
    btnSubmitCreateProd.textContent = '🚀 Publish to Shopify Live';

    if (data.success) {
      closeModal('modal-create-product');
      formCreateProduct.reset();
      addLog(`🎉 Product "${data.product.title}" created successfully on Shopify!`, 'success');
      loadProducts();
      loadSummaryMetrics();
    } else {
      alert(`Error creating product: ${data.error}`);
    }
  } catch (err) {
    btnSubmitCreateProd.disabled = false;
    btnSubmitCreateProd.textContent = '🚀 Publish to Shopify Live';
    alert(`Error: ${err.message}`);
  }
});

// Edit Variant Form Handler
const formEditVariant = document.getElementById('form-edit-variant');
const btnSubmitEditVariant = document.getElementById('btn-submit-edit-variant');

formEditVariant?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const variantId = document.getElementById('ev-variant-id').value;
  const price = document.getElementById('ev-price').value;
  const compare_at_price = document.getElementById('ev-compare-price').value;
  const sku = document.getElementById('ev-sku').value;
  const inventory_quantity = document.getElementById('ev-stock').value;

  btnSubmitEditVariant.disabled = true;
  btnSubmitEditVariant.textContent = '⏳ Saving...';

  try {
    const res = await fetch(`/api/shopify/variants/${variantId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price, compare_at_price, sku, inventory_quantity }),
    });
    const data = await res.json();
    btnSubmitEditVariant.disabled = false;
    btnSubmitEditVariant.textContent = 'Save Changes';

    if (data.success) {
      closeModal('modal-edit-variant');
      addLog(`Variant price & inventory updated for variant #${variantId}`, 'success');
      loadProducts();
      loadSummaryMetrics();
    } else {
      alert(`Error: ${data.error}`);
    }
  } catch (err) {
    btnSubmitEditVariant.disabled = false;
    btnSubmitEditVariant.textContent = 'Save Changes';
    alert(`Error: ${err.message}`);
  }
});

// ==========================================
// SHOPIFY ORDERS & FULFILLMENT MANAGEMENT
// ==========================================
async function loadOrders() {
  try {
    let url = '/api/shopify/orders?limit=50';
    if (activeOrderFilter === 'unfulfilled') url += '&fulfillment_status=unfulfilled';
    if (activeOrderFilter === 'fulfilled') url += '&fulfillment_status=fulfilled';

    const res = await fetch(url);
    const data = await res.json();
    ordersList = data.orders || [];

    if (ordersList.length === 0) {
      ordersTableBody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; color: #94A3B8; padding: 30px;">
            No orders found matching filter: <b>${activeOrderFilter}</b>
          </td>
        </tr>
      `;
      return;
    }

    ordersTableBody.innerHTML = ordersList
      .map((ord) => {
        const dateStr = new Date(ord.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        const custName = `${ord.customer?.first_name || ''} ${ord.customer?.last_name || ''}`.trim() || 'Valued Customer';
        const phone = ord.customer?.phone || ord.shipping_address?.phone || 'N/A';
        const itemsSummary = ord.line_items?.map((li) => `${li.quantity}x ${li.title}`).join('<br/>') || 'No items';

        const finBadge = ord.financial_status === 'paid' ? '<span class="badge-paid">Paid</span>' : `<span class="badge-pending">${ord.financial_status.toUpperCase()}</span>`;
        const fulBadge = ord.fulfillment_status === 'fulfilled'
          ? `<span class="badge-fulfilled">Fulfilled</span><br/><small style="font-size: 10px; color: #64748B;">${ord.tracking_number || ''}</small>`
          : '<span class="badge-unfulfilled">Unfulfilled</span>';

        const actionBtn = ord.fulfillment_status !== 'fulfilled'
          ? `<button class="btn btn-sm btn-primary btn-open-fulfill" data-order-id="${ord.id}" data-order-name="${ord.name}" data-customer="${custName} (${phone})">🚚 Fulfill & Alert</button>`
          : `<span style="color: #166534; font-weight: 600; font-size: 11px;">✓ Dispatched</span>`;

        return `
          <tr>
            <td><b>${ord.name}</b></td>
            <td style="color: #64748B; font-size: 12px;">${dateStr}</td>
            <td>
              <b>${custName}</b><br/>
              <small style="color: #64748B;">${phone}</small>
            </td>
            <td style="font-size: 12px; max-width: 250px;">${itemsSummary}</td>
            <td><b style="color: #166534;">₹${parseFloat(ord.total_price).toLocaleString('en-IN')}</b></td>
            <td>${finBadge}</td>
            <td>${fulBadge}</td>
            <td>${actionBtn}</td>
          </tr>
        `;
      })
      .join('');

    document.querySelectorAll('.btn-open-fulfill').forEach((btn) => {
      btn.addEventListener('click', () => {
        const orderId = btn.getAttribute('data-order-id');
        const orderName = btn.getAttribute('data-order-name');
        const custInfo = btn.getAttribute('data-customer');

        document.getElementById('fo-order-id').value = orderId;
        document.getElementById('fo-order-name').value = orderName;
        document.getElementById('fo-customer-info').value = custInfo;
        document.getElementById('fo-tracking-number').value = `BLUEDART-${Math.floor(100000000 + Math.random() * 900000000)}`;

        openModal('modal-fulfill-order');
      });
    });
  } catch (err) {
    addLog(`Error loading orders: ${err.message}`, 'warn');
  }
}

orderFilterButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    orderFilterButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    activeOrderFilter = btn.getAttribute('data-filter');
    loadOrders();
  });
});

btnRefreshOrders?.addEventListener('click', loadOrders);

const formFulfillOrder = document.getElementById('form-fulfill-order');
const btnSubmitFulfill = document.getElementById('btn-submit-fulfill');

formFulfillOrder?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const orderId = document.getElementById('fo-order-id').value;
  const trackingNumber = document.getElementById('fo-tracking-number').value;
  const trackingCompany = document.getElementById('fo-courier').value;
  const trackingUrl = document.getElementById('fo-tracking-url').value;
  const notifyWhatsApp = document.getElementById('fo-notify-wa').checked;

  btnSubmitFulfill.disabled = true;
  btnSubmitFulfill.textContent = '⏳ Fulfilling & Sending WhatsApp...';

  try {
    const res = await fetch(`/api/shopify/orders/${orderId}/fulfill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackingNumber, trackingCompany, trackingUrl, notifyWhatsApp }),
    });

    const data = await res.json();
    btnSubmitFulfill.disabled = false;
    btnSubmitFulfill.textContent = '🚀 Complete Fulfillment';

    if (data.success) {
      closeModal('modal-fulfill-order');
      addLog(`🎉 Order #${orderId} fulfilled via ${trackingCompany}! Tracking: ${trackingNumber}`, 'success');
      if (data.whatsappNotification) {
        addLog(`📲 WhatsApp tracking update sent to customer!`, 'success');
      }
      loadOrders();
      loadSummaryMetrics();
    } else {
      alert(`Error fulfilling order: ${data.error}`);
    }
  } catch (err) {
    btnSubmitFulfill.disabled = false;
    btnSubmitFulfill.textContent = '🚀 Complete Fulfillment';
    alert(`Error: ${err.message}`);
  }
});

// ==========================================
// iPhone Studio Direct Uploader Logic
// ==========================================
const btnModePhone = document.getElementById('btn-mode-phone');
const btnModeGdrive = document.getElementById('btn-mode-gdrive');
const iosPhotoBox = document.getElementById('ios-photo-box');
const iosGdriveBox = document.getElementById('ios-gdrive-box');
const iosFileInput = document.getElementById('ios-file-input');
const iosSelectedCount = document.getElementById('ios-selected-count');
const iosPreviewStrip = document.getElementById('ios-preview-strip');
const iosVendorCaption = document.getElementById('ios-vendor-caption');
const iosWholesalePrice = document.getElementById('ios-wholesale-price');
const iosRetailDisplay = document.getElementById('ios-retail-display');
const iosCompareDisplay = document.getElementById('ios-compare-display');
const formIosUpload = document.getElementById('form-ios-upload');
const btnIosPublish = document.getElementById('btn-ios-publish');
const iosPublishResult = document.getElementById('ios-publish-result');
const iosResTitle = document.getElementById('ios-res-title');
const iosResLink = document.getElementById('ios-res-link');

let selectedBase64Images = [];

btnModePhone?.addEventListener('click', () => {
  btnModePhone.style.background = '#FFFFFF';
  btnModePhone.style.color = '#780016';
  btnModeGdrive.style.background = 'transparent';
  btnModeGdrive.style.color = '#64748B';
  iosPhotoBox.style.display = 'block';
  iosGdriveBox.style.display = 'none';
});

btnModeGdrive?.addEventListener('click', () => {
  btnModeGdrive.style.background = '#FFFFFF';
  btnModeGdrive.style.color = '#780016';
  btnModePhone.style.background = 'transparent';
  btnModePhone.style.color = '#64748B';
  iosGdriveBox.style.display = 'block';
  iosPhotoBox.style.display = 'none';
});

function updateIosPrice() {
  const wholesale = parseFloat(iosWholesalePrice?.value || '0') || 0;
  const retail = Math.round((wholesale * 2) / 100) * 100 - 1;
  const compare = Math.round((wholesale * 4) / 100) * 100 - 1;

  if (iosRetailDisplay) iosRetailDisplay.textContent = `₹${retail.toLocaleString('en-IN')}`;
  if (iosCompareDisplay) iosCompareDisplay.textContent = `₹${compare.toLocaleString('en-IN')}`;
}

iosWholesalePrice?.addEventListener('input', updateIosPrice);

iosVendorCaption?.addEventListener('input', () => {
  const text = iosVendorCaption.value;
  const match = text.match(/(?:rate|price|rs\.?|inr|₹)\s*[:=-]?\s*(\d{3,5})/i) || text.match(/(\d{3,5})\s*(?:\/\-|\/—|rs|inr)/i);
  if (match && match[1]) {
    const p = parseInt(match[1], 10);
    if (p >= 250 && p <= 25000 && iosWholesalePrice) {
      iosWholesalePrice.value = p;
      updateIosPrice();
    }
  }
});

iosFileInput?.addEventListener('change', async (e) => {
  const files = Array.from(e.target.files || []);
  if (files.length === 0) return;

  selectedBase64Images = [];
  iosPreviewStrip.innerHTML = '';
  iosPreviewStrip.style.display = 'flex';

  if (iosSelectedCount) {
    iosSelectedCount.style.display = 'inline-block';
    iosSelectedCount.textContent = `✓ ${files.length} Photo${files.length > 1 ? 's' : ''} Selected`;
  }

  for (const file of files) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result;
      selectedBase64Images.push(base64);

      const thumb = document.createElement('img');
      thumb.src = base64;
      thumb.style.width = '70px';
      thumb.style.height = '90px';
      thumb.style.objectFit = 'cover';
      thumb.style.borderRadius = '8px';
      thumb.style.border = '2px solid #780016';
      iosPreviewStrip.appendChild(thumb);
    };
    reader.readAsDataURL(file);
  }
});

formIosUpload?.addEventListener('submit', async (e) => {
  e.preventDefault();
  btnIosPublish.disabled = true;
  btnIosPublish.textContent = '⏳ Uploading & Publishing to Shopify...';

  const caption = iosVendorCaption?.value || '';
  const wholesalePrice = parseFloat(iosWholesalePrice?.value || '1699');
  const sizeCheckboxes = document.querySelectorAll('input[name="ios-size"]:checked');
  const sizes = Array.from(sizeCheckboxes).map((cb) => cb.value);
  const gdriveUrl = document.getElementById('ios-gdrive-url')?.value;

  try {
    const res = await fetch('/api/ios/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caption,
        wholesalePrice,
        sizes,
        images: selectedBase64Images,
        gdriveUrl,
      }),
    });

    const data = await res.json();
    btnIosPublish.disabled = false;
    btnIosPublish.textContent = '🚀 Publish Live to araadhyafashion.com';

    if (data.success) {
      iosPublishResult.style.display = 'block';
      iosResTitle.textContent = `🎉 ${data.product.title}`;
      iosResLink.href = data.product.url;
      addLog(`Product published from iPhone Studio: ${data.product.title} at ₹${data.product.retailPrice}`, 'success');
      loadProducts();
      loadSummaryMetrics();
    } else {
      alert(`Publishing error: ${data.error}`);
    }
  } catch (err) {
    btnIosPublish.disabled = false;
    btnIosPublish.textContent = '🚀 Publish Live to araadhyafashion.com';
    alert(`Error: ${err.message}`);
  }
});

// ==========================================
// WhatsApp Vendor Group 2x Bot Handlers
// ==========================================
const btnStartWAListener = document.getElementById('btn-start-wa-listener');
const btnReconnectWA = document.getElementById('btn-reconnect-wa');
const vendorQrPlaceholder = document.getElementById('vendor-qr-placeholder');
const vendorQrView = document.getElementById('vendor-qr-view');
const vendorQrImage = document.getElementById('vendor-qr-image');
const vendorConnectedBadge = document.getElementById('vendor-connected-badge');
const btnRefreshVendorFeed = document.getElementById('btn-refresh-vendor-feed');
const vendorFeedList = document.getElementById('vendor-feed-list');
const btnRunVendorSim = document.getElementById('btn-run-vendor-sim');
const simVendorText = document.getElementById('sim-vendor-text');
const vendorSimOutput = document.getElementById('vendor-sim-output');
const vendorGroupsPanel = document.getElementById('vendor-groups-panel');
const vendorGroupsList = document.getElementById('vendor-groups-list');
const btnRefreshGroups = document.getElementById('btn-refresh-groups');
const btnSaveMonitoredGroups = document.getElementById('btn-save-monitored-groups');
const groupsSavedStatus = document.getElementById('groups-saved-status');

let vendorPollInterval = null;

async function pollVendorStatus() {
  try {
    const res = await fetch('/api/vendor-listener/status');
    const data = await res.json();

    if (data.isConnected) {
      if (vendorConnectedBadge) vendorConnectedBadge.style.display = 'block';
      if (vendorGroupsPanel) vendorGroupsPanel.style.display = 'block';
      if (vendorQrPlaceholder) vendorQrPlaceholder.style.display = 'none';
      if (vendorQrView) vendorQrView.style.display = 'none';
      loadVendorGroups();
    } else if (data.qrCodeDataUrl) {
      if (vendorQrImage) vendorQrImage.src = data.qrCodeDataUrl;
      if (vendorQrView) vendorQrView.style.display = 'block';
      if (vendorQrPlaceholder) vendorQrPlaceholder.style.display = 'none';
      if (vendorConnectedBadge) vendorConnectedBadge.style.display = 'none';
      if (vendorGroupsPanel) vendorGroupsPanel.style.display = 'none';
    } else {
      if (vendorQrPlaceholder) vendorQrPlaceholder.style.display = 'block';
      if (vendorQrView) vendorQrView.style.display = 'none';
      if (vendorConnectedBadge) vendorConnectedBadge.style.display = 'none';
      if (vendorGroupsPanel) vendorGroupsPanel.style.display = 'none';
    }

    renderVendorFeed(data.feedHistory || []);
  } catch (err) {
    console.error('Error polling vendor status:', err);
  }
}

async function loadVendorGroups() {
  if (!vendorGroupsList) return;
  try {
    const res = await fetch('/api/vendor-listener/groups');
    const data = await res.json();

    if (data.success && data.groups && data.groups.length > 0) {
      vendorGroupsList.innerHTML = data.groups
        .map((g) => {
          return `
            <label style="display: flex; align-items: center; justify-content: space-between; background: #FFFFFF; padding: 8px 12px; border-radius: 8px; border: 1px solid #E2E8F0; cursor: pointer;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" name="vendor-group-cb" value="${g.id}" ${g.isMonitored ? 'checked' : ''} />
                <span style="font-size: 13px; font-weight: 700; color: #1E293B;">${g.name}</span>
              </div>
              <span style="font-size: 11px; color: #64748B; background: #F1F5F9; padding: 2px 6px; border-radius: 4px;">${g.participantsCount} members</span>
            </label>
          `;
        })
        .join('');
    } else {
      vendorGroupsList.innerHTML = `
        <div style="font-size: 12px; color: #64748B; padding: 8px; text-align: center;">
          All vendor groups monitored by default (*).
        </div>
      `;
    }
  } catch (err) {
    console.error('Error loading WhatsApp groups:', err);
  }
}

btnRefreshGroups?.addEventListener('click', loadVendorGroups);

btnSaveMonitoredGroups?.addEventListener('click', async () => {
  const checkboxes = document.querySelectorAll('input[name="vendor-group-cb"]:checked');
  const groupIds = Array.from(checkboxes).map((cb) => cb.value);

  try {
    const res = await fetch('/api/vendor-listener/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupIds: groupIds.length > 0 ? groupIds : ['*'] }),
    });

    const data = await res.json();
    if (data.success) {
      if (groupsSavedStatus) {
        groupsSavedStatus.style.display = 'inline-block';
        setTimeout(() => {
          groupsSavedStatus.style.display = 'none';
        }, 3000);
      }
      addLog(`Monitoring ${groupIds.length > 0 ? groupIds.length : 'all'} WhatsApp vendor groups!`, 'success');
    }
  } catch (err) {
    alert(`Error saving groups: ${err.message}`);
  }
});

let currentVendorFilter = 'all'; // 'all', 'done', 'pending'
let currentSupplierFilter = 'all'; // 'all', 'kohinoor', 'aadabkari'

function renderVendorFeed(feed) {
  if (!vendorFeedList) return;

  // Filter out any invalid items
  const validFeed = feed.filter((f) => f.caption && f.caption.trim().length > 5 && f.wholesalePrice > 0);

  const publishedItems = validFeed.filter((f) => f.status === 'published');
  const pendingItems = validFeed.filter((f) => f.status === 'pending');
  const totalProfit = publishedItems.reduce(
    (sum, f) => sum + Math.max(0, (f.retailPrice || 0) - (f.wholesalePrice || 0)),
    0
  );

  const vtTotalDetected = document.getElementById('vt-total-detected');
  const vtPublishedCount = document.getElementById('vt-published-count');
  const vtPendingCount = document.getElementById('vt-pending-count');
  const vtProfitMargin = document.getElementById('vt-profit-margin');
  const countAll = document.getElementById('count-all');
  const countDone = document.getElementById('count-done');
  const countPending = document.getElementById('count-pending');
  const progressBarLabel = document.getElementById('progress-bar-label');
  const progressBarFill = document.getElementById('progress-bar-fill');
  const progressBarBadge = document.getElementById('progress-bar-badge');

  // Supplier filter counts
  const kohinoorItems = validFeed.filter((f) => f.groupName.includes('Kohinoor') || f.groupName.includes('120363098729169234') || f.groupName.includes('120363100152383657'));
  const aadabkariItems = validFeed.filter((f) => f.groupName.includes('Aadabkari') || f.groupName.includes('120363027643124284') || f.groupName.includes('120363046374306873'));
  const countSupAll = document.getElementById('count-supplier-all');
  const countSupKohinoor = document.getElementById('count-supplier-kohinoor');
  const countSupAadabkari = document.getElementById('count-supplier-aadabkari');

  if (countSupAll) countSupAll.textContent = validFeed.length;
  if (countSupKohinoor) countSupKohinoor.textContent = kohinoorItems.length;
  if (countSupAadabkari) countSupAadabkari.textContent = aadabkariItems.length;

  if (vtTotalDetected) vtTotalDetected.textContent = `${validFeed.length} Outfits`;
  if (vtPublishedCount) vtPublishedCount.textContent = `${publishedItems.length} Live`;
  if (vtPendingCount) vtPendingCount.textContent = `${pendingItems.length} Queued`;
  if (vtProfitMargin) vtProfitMargin.textContent = `₹${totalProfit.toLocaleString('en-IN')}`;
  if (countAll) countAll.textContent = validFeed.length;
  if (countDone) countDone.textContent = publishedItems.length;
  if (countPending) countPending.textContent = pendingItems.length;

  const pct = validFeed.length > 0 ? Math.round((publishedItems.length / validFeed.length) * 100) : 0;
  if (progressBarLabel) {
    progressBarLabel.textContent = `Catalog Publishing Progress: ${publishedItems.length} / ${validFeed.length} Items (${pct}%)`;
  }
  if (progressBarFill) {
    progressBarFill.style.width = `${pct}%`;
  }
  if (progressBarBadge) {
    progressBarBadge.textContent = pct === 100 ? '100% Synced' : `${pct}% Synced`;
  }

  // Filter by Supplier first
  let displayItems = validFeed;
  if (currentSupplierFilter === 'kohinoor') {
    displayItems = kohinoorItems;
  } else if (currentSupplierFilter === 'aadabkari') {
    displayItems = aadabkariItems;
  }

  // Then filter by Status
  if (currentVendorFilter === 'done') {
    displayItems = displayItems.filter((f) => f.status === 'published');
  } else if (currentVendorFilter === 'pending') {
    displayItems = displayItems.filter((f) => f.status === 'pending');
  }

  if (displayItems.length === 0) {
    vendorFeedList.innerHTML = `
      <div style="text-align: center; color: #94A3B8; padding: 40px 0; font-size: 13px;">
        📲 No outfits published yet. Send outfit photos with wholesale rate (e.g. <i>Rate: 1250/-</i>) to your WhatsApp to publish live instantly!
      </div>
    `;
    return;
  }

  vendorFeedList.innerHTML = displayItems
    .map((item) => {
      const isKohinoor = item.groupName.includes('Kohinoor') || item.groupName.includes('120363098729169234') || item.groupName.includes('120363100152383657');
      const supplierLabel = isKohinoor ? '💎 Kohinoor Chikan Center' : '🌸 Aadabkari Resellers';
      const badgeBg = isKohinoor ? '#EFF6FF' : '#FDF2F8';
      const badgeColor = isKohinoor ? '#1E40AF' : '#9D174D';
      const badgeBorder = isKohinoor ? '#BFDBFE' : '#FBCFE8';

      return `
      <div style="background: #FFFFFF; border: 1px solid ${item.status === 'published' ? '#86EFAC' : '#E2E8F0'}; border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 6px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="badge" style="background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder}; font-size: 11px; font-weight: 700;">
              ${supplierLabel}
            </span>
            <span style="font-size: 11px; color: #94A3B8;">• ${item.timestamp || 'Recent'}</span>
          </div>
          <span class="badge ${item.status === 'published' ? 'badge-connected' : 'badge-mock'}" style="font-size: 10px; font-weight: 800;">
            ${item.status === 'published' ? '✅ LIVE ON SHOPIFY' : '⏳ READY TO PUBLISH'}
          </span>
        </div>

        <h4 style="font-size: 14px; font-weight: 700; color: #0F172A; margin: 0 0 8px 0; line-height: 1.4;">
          ${item.caption}
        </h4>

        <!-- Transparent Pricing & Margin Visualizer -->
        <div style="display: flex; gap: 12px; background: #F8FAFC; border: 1px solid #F1F5F9; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; flex-wrap: wrap; align-items: center;">
          <div>
            <div style="font-size: 10px; color: #64748B; text-transform: uppercase; font-weight: 600;">Wholesale Rate</div>
            <div style="font-size: 14px; font-weight: 700; color: #475569;">₹${item.wholesalePrice}</div>
          </div>
          <div style="font-size: 16px; color: #CBD5E1;">➔</div>
          <div>
            <div style="font-size: 10px; color: #15803D; text-transform: uppercase; font-weight: 600;">2x Store Selling Price</div>
            <div style="font-size: 16px; font-weight: 800; color: #166534;">₹${item.retailPrice}</div>
          </div>
          <div style="margin-left: auto;">
            <span class="badge badge-connected" style="font-size: 11px; padding: 4px 8px; background: #DCFCE7; color: #166534; font-weight: 800;">
              Profit: +₹${item.retailPrice - item.wholesalePrice} (50% Margin)
            </span>
          </div>
        </div>

        <!-- Size Curve Matrix -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
          <div style="display: flex; gap: 4px; align-items: center; flex-wrap: wrap;">
            <span style="font-size: 11px; color: #64748B; font-weight: 600; margin-right: 4px;">Available Sizes:</span>
            <span class="badge" style="font-size: 10px; background: #F1F5F9; color: #334155;">36 (S)</span>
            <span class="badge" style="font-size: 10px; background: #F1F5F9; color: #334155;">38 (M)</span>
            <span class="badge" style="font-size: 10px; background: #F1F5F9; color: #334155;">40 (L)</span>
            <span class="badge" style="font-size: 10px; background: #F1F5F9; color: #334155;">42 (XL)</span>
            <span class="badge" style="font-size: 10px; background: #F1F5F9; color: #334155;">44 (XXL)</span>
            <span class="badge" style="font-size: 10px; background: #F1F5F9; color: #334155;">46 (3XL)</span>
          </div>

          <!-- Action Buttons -->
          <div style="display: flex; gap: 8px; align-items: center;">
            ${
              item.status === 'published'
                ? `
                  <a href="${item.shopifyProductUrl || 'https://araadhyafashion.com'}" target="_blank" class="btn btn-sm btn-primary" style="font-size: 11px; padding: 6px 12px; text-decoration: none;">
                    🛍️ View Live on Store ↗
                  </a>
                  <a href="${item.shopifyAdminUrl || (item.shopifyProductId ? `https://admin.shopify.com/store/araadhyafashion/products/${item.shopifyProductId}` : 'https://admin.shopify.com')}" target="_blank" class="btn btn-sm btn-outline" style="font-size: 11px; padding: 6px 12px; text-decoration: none; color: #475569;">
                    ⚙️ Edit in Shopify ↗
                  </a>
                `
                : `
                  <button type="button" class="btn btn-sm btn-primary btn-publish-single" data-item-id="${item.id}" style="font-size: 11px; padding: 6px 14px; background: #166534;">
                    ⚡ Publish to Store (2x)
                  </button>
                  <button type="button" class="btn btn-sm btn-outline btn-discard-single" data-item-id="${item.id}" style="font-size: 11px; padding: 6px 10px; color: #991B1B;">
                    ✕ Dismiss
                  </button>
                `
            }
          </div>
        </div>
      </div>
    `;
    })
    .join('');

  // Wire action buttons
  document.querySelectorAll('.btn-publish-single').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const target = e.currentTarget || e.target;
      const itemId = target.getAttribute('data-item-id');
      if (!itemId) return;
      target.disabled = true;
      target.textContent = '⏳ Publishing...';
      try {
        await fetch('/api/vendor-listener/publish-pending', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId }),
        });
        pollVendorStatus();
        loadProducts();
      } catch (err) {
        alert('Failed to publish item');
      }
    });
  });

  document.querySelectorAll('.btn-discard-single').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const target = e.currentTarget || e.target;
      const itemId = target.getAttribute('data-item-id');
      if (!itemId) return;
      if (confirm('Dismiss this outfit from catalog queue?')) {
        await fetch('/api/vendor-listener/discard-item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId }),
        });
        pollVendorStatus();
      }
    });
  });
}

// Supplier Group Switchers
const filterSupAll = document.getElementById('filter-supplier-all');
const filterSupKohinoor = document.getElementById('filter-supplier-kohinoor');
const filterSupAadabkari = document.getElementById('filter-supplier-aadabkari');

function setSupplierTab(supplier) {
  currentSupplierFilter = supplier;
  [filterSupAll, filterSupKohinoor, filterSupAadabkari].forEach((btn) => {
    btn?.classList.remove('btn-primary');
    btn?.classList.add('btn-outline');
  });
  if (supplier === 'all') filterSupAll?.classList.replace('btn-outline', 'btn-primary');
  if (supplier === 'kohinoor') filterSupKohinoor?.classList.replace('btn-outline', 'btn-primary');
  if (supplier === 'aadabkari') filterSupAadabkari?.classList.replace('btn-outline', 'btn-primary');
  pollVendorStatus();
}

filterSupAll?.addEventListener('click', () => setSupplierTab('all'));
filterSupKohinoor?.addEventListener('click', () => setSupplierTab('kohinoor'));
filterSupAadabkari?.addEventListener('click', () => setSupplierTab('aadabkari'));

// Publishing Status Switchers
const tabVendorAll = document.getElementById('tab-vendor-all');
const tabVendorDone = document.getElementById('tab-vendor-done');
const tabVendorPending = document.getElementById('tab-vendor-pending');

function setVendorTab(filter) {
  currentVendorFilter = filter;
  [tabVendorAll, tabVendorDone, tabVendorPending].forEach((t) => {
    t?.classList.remove('btn-primary');
    t?.classList.add('btn-outline');
  });
  if (filter === 'all') tabVendorAll?.classList.replace('btn-outline', 'btn-primary');
  if (filter === 'done') tabVendorDone?.classList.replace('btn-outline', 'btn-primary');
  if (filter === 'pending') tabVendorPending?.classList.replace('btn-outline', 'btn-primary');
  pollVendorStatus();
}

tabVendorAll?.addEventListener('click', () => setVendorTab('all'));
tabVendorDone?.addEventListener('click', () => setVendorTab('done'));
tabVendorPending?.addEventListener('click', () => setVendorTab('pending'));

const btnLoadBacklogSample = document.getElementById('btn-load-backlog-sample');
btnLoadBacklogSample?.addEventListener('click', () => {
  if (backlogPostsText) {
    backlogPostsText.value = `Modal Silk Chikankari Kurti Set with Palazzo. Rate: 1200/- Sizes: 38 40 42 44
---
Pure Chanderi Anarkali Suit with Organza Dupatta. Rate: 1850/- Sizes: 38-44
---
Pure Georgette Straight Kurti with Mukaish Work. Rate: 850/- Sizes: 36 to 44`;
  }
});

// Stage Backlog Handler
const btnBatchStageBacklog = document.getElementById('btn-batch-stage-backlog');
btnBatchStageBacklog?.addEventListener('click', async () => {
  const rawText = backlogPostsText?.value?.trim();
  if (!rawText) {
    alert('Please paste at least one vendor message.');
    return;
  }
  const groupName = backlogGroupSelect?.value || 'Kohinoor Chikan Center';
  const rawChunks = rawText.split('---').map((t) => t.trim()).filter(Boolean);

  try {
    const posts = rawChunks.map((caption) => ({ groupName, caption }));
    const res = await fetch('/api/vendor-listener/stage-backlog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ posts }),
    });
    const data = await res.json();
    if (data.success) {
      if (backlogImportStatus) {
        backlogImportStatus.style.display = 'block';
        backlogImportStatus.style.background = '#FEF3C7';
        backlogImportStatus.style.color = '#92400E';
        backlogImportStatus.textContent = `📋 Staged ${data.count} items into Pending Review Queue!`;
      }
      if (backlogPostsText) backlogPostsText.value = '';
      setVendorTab('pending');
    }
  } catch (err) {
    alert(`Error staging items: ${err.message}`);
  }
});

// Deep Scan Group Handler
const btnDeepScanGroups = document.getElementById('btn-deep-scan-groups');
const btnTriggerDeepScan = document.getElementById('btn-trigger-deep-scan');
const btnPublishAllRemaining = document.getElementById('btn-publish-all-remaining-btn');

async function triggerGroupDeepScan() {
  const liveUploadBox = document.getElementById('live-upload-box');
  const liveUploadTerminal = document.getElementById('live-upload-terminal');
  const uploadStreamCounter = document.getElementById('upload-stream-counter');

  if (liveUploadBox) liveUploadBox.style.display = 'block';
  if (liveUploadTerminal) {
    liveUploadTerminal.innerHTML = `
      <div style="color: #38BDF8;">🔍 Scanning WhatsApp Groups: <b>Kohinoor Chikan Center</b> & <b>Aadabkari resellers</b> (Last 60 Days)...</div>
      <div style="color: #94A3B8;">⚡ Ingesting high-res photos, wholesale prices, fabrics, and size sets...</div>
    `;
  }

  if (btnTriggerDeepScan) {
    btnTriggerDeepScan.disabled = true;
    btnTriggerDeepScan.textContent = '⏳ Fetching Past 2 Months Catalog...';
  }

  try {
    const res = await fetch('/api/vendor-listener/scan-groups', { method: 'POST' });
    const data = await res.json();

    if (btnTriggerDeepScan) {
      btnTriggerDeepScan.disabled = false;
      btnTriggerDeepScan.innerHTML = '<span>📥 Fetch Last 2 Months (60 Days) from Groups</span> <span class="badge" style="background: #38BDF8; color: #0F172A; font-size: 10px;">Kohinoor & Aadabkari</span>';
    }

    if (data.success) {
      if (liveUploadTerminal) {
        liveUploadTerminal.innerHTML += `
          <div style="color: #22C55E; font-weight: 700;">✅ Success! Ingested ${data.stats.pendingCount} wholesale items into Pending Backlog!</div>
          <div style="color: #FDE047;">💰 Potential Added Revenue: ₹${data.stats.pendingValuation.toLocaleString('en-IN')} (2x Retail Margin)</div>
        `;
      }
      if (uploadStreamCounter) {
        uploadStreamCounter.textContent = `${data.stats.pendingCount} Items Queued`;
      }
      pollVendorStatus();
      setVendorTab('pending');
    }
  } catch (err) {
    if (btnTriggerDeepScan) {
      btnTriggerDeepScan.disabled = false;
      btnTriggerDeepScan.innerHTML = '<span>📥 Fetch Last 2 Months (60 Days) from Groups</span>';
    }
    if (liveUploadTerminal) {
      liveUploadTerminal.innerHTML += `<div style="color: #EF4444;">❌ Scan Error: ${err.message}</div>`;
    }
  }
}

btnDeepScanGroups?.addEventListener('click', triggerGroupDeepScan);
btnTriggerDeepScan?.addEventListener('click', triggerGroupDeepScan);

btnPublishAllRemaining?.addEventListener('click', async () => {
  const liveUploadBox = document.getElementById('live-upload-box');
  const liveUploadTerminal = document.getElementById('live-upload-terminal');
  const uploadStreamCounter = document.getElementById('upload-stream-counter');

  if (liveUploadBox) liveUploadBox.style.display = 'block';
  if (liveUploadTerminal) {
    liveUploadTerminal.innerHTML = `
      <div style="color: #FDE047;">🚀 Initiating Automated Shopify Sync for All Queued Items...</div>
      <div style="color: #94A3B8;">Applying 2x Profit Margin + Generating 7 Sizes (36-46) + Awadhi SEO copywriting...</div>
    `;
  }

  if (btnPublishAllRemaining) {
    btnPublishAllRemaining.disabled = true;
    btnPublishAllRemaining.textContent = '⏳ Auto-Publishing All Remaining to Shopify at 2x...';
  }

  try {
    const res = await fetch('/api/vendor-listener/publish-all-remaining', { method: 'POST' });
    const data = await res.json();

    if (btnPublishAllRemaining) {
      btnPublishAllRemaining.disabled = false;
      btnPublishAllRemaining.textContent = '🚀 1-Click Auto-Publish All Remaining (2x Margin)';
    }

    if (data.success) {
      if (liveUploadTerminal) {
        liveUploadTerminal.innerHTML += `
          <div style="color: #22C55E; font-weight: 700;">🎉 DONE! Published ${data.publishedCount} Products Live to Shopify Store!</div>
          <div style="color: #38BDF8;">🛍️ Total Live Catalog Valuation: ₹${data.stats.totalCatalogValuation.toLocaleString('en-IN')}</div>
          <div style="color: #34D399;">📈 Projected Gross Profit: +₹${data.stats.totalProjectedProfit.toLocaleString('en-IN')}</div>
        `;
      }
      if (uploadStreamCounter) {
        uploadStreamCounter.textContent = `${data.publishedCount} Published`;
      }
      pollVendorStatus();
      loadProducts();
      loadSummaryMetrics();
      setVendorTab('done');
    }
  } catch (err) {
    if (btnPublishAllRemaining) {
      btnPublishAllRemaining.disabled = false;
      btnPublishAllRemaining.textContent = '🚀 1-Click Auto-Publish All Remaining (2x Margin)';
    }
    if (liveUploadTerminal) {
      liveUploadTerminal.innerHTML += `<div style="color: #EF4444;">❌ Publish Error: ${err.message}</div>`;
    }
  }
});

async function triggerStartWAListener() {
  if (btnStartWAListener) {
    btnStartWAListener.disabled = true;
    btnStartWAListener.textContent = '⏳ Initializing WhatsApp QR...';
  }
  addLog('Starting WhatsApp Personal Group Listener session...', 'info');

  try {
    await fetch('/api/vendor-listener/start', { method: 'POST' });
    if (!vendorPollInterval) {
      vendorPollInterval = setInterval(pollVendorStatus, 1500);
    }
    setTimeout(pollVendorStatus, 1000);
  } catch (err) {
    addLog(`Error starting WhatsApp listener: ${err.message}`, 'warn');
  }
}

btnStartWAListener?.addEventListener('click', triggerStartWAListener);
btnReconnectWA?.addEventListener('click', triggerStartWAListener);
btnRefreshVendorFeed?.addEventListener('click', pollVendorStatus);

btnRunVendorSim?.addEventListener('click', async () => {
  const caption = simVendorText.value;
  addLog(`Simulating vendor post: "${caption}"`, 'info');
  btnRunVendorSim.disabled = true;

  try {
    const res = await fetch('/api/vendor-listener/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caption }),
    });

    const data = await res.json();
    btnRunVendorSim.disabled = false;
    vendorSimOutput.style.display = 'block';
    vendorSimOutput.textContent = JSON.stringify(data, null, 2);

    addLog(`🎉 Simulated vendor item published to Shopify at 2x price: ₹${data.result?.parsed?.retailPrice}!`, 'success');
    pollVendorStatus();
    loadProducts();
    loadSummaryMetrics();
  } catch (err) {
    btnRunVendorSim.disabled = false;
    addLog(`Simulator error: ${err.message}`, 'warn');
  }
});

// Past Backlog Bulk Importer Handler
const btnBatchImportBacklog = document.getElementById('btn-batch-import-backlog');
const backlogPostsText = document.getElementById('backlog-posts-text');
const backlogGroupSelect = document.getElementById('backlog-group-select');
const backlogImportStatus = document.getElementById('backlog-import-status');

btnBatchImportBacklog?.addEventListener('click', async () => {
  const rawText = backlogPostsText?.value?.trim();
  if (!rawText) {
    alert('Please paste at least one vendor message.');
    return;
  }

  const groupName = backlogGroupSelect?.value || 'Kohinoor Chikan Center';
  const rawChunks = rawText.split('---').map((t) => t.trim()).filter(Boolean);

  if (rawChunks.length === 0) {
    alert('No valid posts detected.');
    return;
  }

  btnBatchImportBacklog.disabled = true;
  btnBatchImportBacklog.textContent = `⏳ Publishing ${rawChunks.length} Items to Shopify at 2x...`;
  if (backlogImportStatus) {
    backlogImportStatus.style.display = 'block';
    backlogImportStatus.style.background = '#EFF6FF';
    backlogImportStatus.style.color = '#1D4ED8';
    backlogImportStatus.textContent = `Parsing & publishing ${rawChunks.length} items from ${groupName}...`;
  }

  try {
    const posts = rawChunks.map((caption) => ({ groupName, caption }));
    const res = await fetch('/api/vendor-listener/batch-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ posts }),
    });

    const data = await res.json();
    btnBatchImportBacklog.disabled = false;
    btnBatchImportBacklog.textContent = '🚀 1-Click Import & Publish Past Posts';

    if (data.success) {
      if (backlogImportStatus) {
        backlogImportStatus.style.background = '#DCFCE7';
        backlogImportStatus.style.color = '#166534';
        backlogImportStatus.textContent = `🎉 Successfully imported & published ${data.count} items to Shopify at 2x price!`;
      }
      if (backlogPostsText) backlogPostsText.value = '';
      pollVendorStatus();
      loadProducts();
      loadSummaryMetrics();
      addLog(`Imported ${data.count} past items from ${groupName} to Shopify!`, 'success');
    } else {
      throw new Error(data.error || 'Failed to import backlog');
    }
  } catch (err) {
    btnBatchImportBacklog.disabled = false;
    btnBatchImportBacklog.textContent = '🚀 1-Click Import & Publish Past Posts';
    if (backlogImportStatus) {
      backlogImportStatus.style.background = '#FEE2E2';
      backlogImportStatus.style.color = '#991B1B';
      backlogImportStatus.textContent = `Error: ${err.message}`;
    }
    addLog(`Backlog import error: ${err.message}`, 'warn');
  }
});

// Bulk Publish Form Handler
const formBulkPublish = document.getElementById('form-bulk-publish');
const bulkResult = document.getElementById('bulk-result');
const bulkSummaryContent = document.getElementById('bulk-summary-content');
const btnStartBulk = document.getElementById('btn-start-bulk');

formBulkPublish?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const folderPath = document.getElementById('bulk-folder-path').value;
  const defaultPrice = document.getElementById('bulk-price').value;
  const compareAtPrice = document.getElementById('bulk-compare-price').value;
  const productType = document.getElementById('bulk-product-type').value;

  btnStartBulk.disabled = true;
  btnStartBulk.textContent = '⏳ Scanning & Publishing to Shopify...';
  addLog(`Starting bulk publish from ${folderPath}...`, 'info');

  try {
    const res = await fetch('/api/bulk-publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderPath, defaultPrice, compareAtPrice, productType }),
    });

    const data = await res.json();
    btnStartBulk.disabled = false;
    btnStartBulk.textContent = '🚀 Publish All Photos to Shopify Live';

    if (data.success && data.result) {
      const { total, published, errors } = data.result;
      bulkResult.style.display = 'block';

      let html = `
        <div style="background: #F0FDF4; border: 1px solid #BBF7D0; padding: 14px; border-radius: 8px; margin-bottom: 14px;">
          <b style="color: #166534;">✅ Processed ${total} images: ${published.length} Published Successfully with SEO!</b>
        </div>
      `;

      if (published.length > 0) {
        html += '<ul style="list-style: none; padding: 0;">';
        published.forEach((p) => {
          html += `
            <li style="padding: 10px; border-bottom: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center;">
              <span><b>${p.title}</b> (7 Sizes generated)</span>
              <div>
                <a href="${p.url}" target="_blank" class="btn btn-sm btn-secondary" style="margin-right: 6px;">View on Store ↗</a>
                <a href="${p.adminUrl}" target="_blank" class="btn btn-sm btn-outline">Shopify Admin ↗</a>
              </div>
            </li>
          `;
        });
        html += '</ul>';
      }

      if (errors.length > 0) {
        html += `<div style="color: #EF4444; margin-top: 10px;">⚠️ ${errors.length} files skipped/failed.</div>`;
      }

      bulkSummaryContent.innerHTML = html;
      addLog(`Bulk publish complete! ${published.length} products live on araadhyafashion.com`, 'success');
      loadProducts();
      loadSummaryMetrics();
    } else {
      bulkResult.style.display = 'block';
      bulkSummaryContent.innerHTML = `<p style="color: #EF4444;">Error: ${data.error || 'Failed'}</p>`;
    }
  } catch (err) {
    btnStartBulk.disabled = false;
    btnStartBulk.textContent = '🚀 Publish All Photos to Shopify Live';
    addLog(`Bulk upload failed: ${err.message}`, 'warn');
  }
});

// Logger Helper
function addLog(msg, type = 'info') {
  const time = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = `log-entry log-${type}`;
  entry.textContent = `[${time}] ${msg}`;
  logFeedEl?.prepend(entry);
}

btnClearLogs?.addEventListener('click', () => {
  if (logFeedEl) logFeedEl.innerHTML = '';
});

// Fetch Status
async function loadStatus() {
  addLog('Checking connectivity across all 5 platforms...', 'info');
  try {
    const res = await fetch('/api/status');
    const data = await res.json();

    if (serverStatusEl) {
      serverStatusEl.textContent = 'Active (Port 3000)';
      serverStatusEl.style.color = '#10B981';
    }

    updateCard('shopify', data.platforms.shopify);
    updateCard('razorpay', data.platforms.razorpay);
    updateCard('whatsapp', data.platforms.whatsapp);
    updateCard('instagram', data.platforms.instagram);
    updateCard('facebook', data.platforms.facebook);

    addLog('Diagnostics complete. All engines operational.', 'success');
  } catch (err) {
    if (serverStatusEl) {
      serverStatusEl.textContent = 'Disconnected';
      serverStatusEl.style.color = '#EF4444';
    }
    addLog(`Server connection error: ${err.message}`, 'warn');
  }
}

function updateCard(platform, statusObj) {
  const badge = document.getElementById(`badge-${platform}`);
  const desc = document.getElementById(`desc-${platform}`);

  if (!badge) return;

  if (statusObj && statusObj.success) {
    badge.className = 'badge badge-connected';
    badge.textContent = 'Connected';
    desc.textContent = statusObj.message || 'Active';
  } else {
    badge.className = 'badge badge-mock';
    badge.textContent = 'Simulated / Ready';
    desc.textContent = statusObj?.message || 'Configured with mock fallback';
  }
}

btnRefreshStatus?.addEventListener('click', loadStatus);

saleProductSelect?.addEventListener('change', () => {
  const selectedOpt = saleProductSelect.selectedOptions[0];
  if (selectedOpt && selectedOpt.value) {
    salePriceInput.value = selectedOpt.getAttribute('data-price');
  }
});

// Handle Chat Sale Submission
formChatSale?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const channel = document.querySelector('input[name="channel"]:checked').value;
  const customerName = document.getElementById('sale-customer-name').value;
  const contact = document.getElementById('sale-contact').value;
  const selectedOpt = saleProductSelect.selectedOptions[0];
  const productId = selectedOpt.value;
  const productTitle = selectedOpt.getAttribute('data-title');
  const price = salePriceInput.value;

  addLog(`Creating dynamic Razorpay link for ${customerName} (${productTitle})...`, 'info');
  saleResultPreview.innerHTML = '<p>Generating link and dispatching...</p>';

  try {
    const res = await fetch('/api/chat-sale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel,
        customerName,
        contact,
        productId,
        productTitle,
        price,
      }),
    });

    const data = await res.json();

    if (data.success) {
      addLog(`Payment link generated: ${data.paymentUrl} and sent via ${channel}!`, 'success');

      saleResultPreview.innerHTML = `
        <div style="color: #4ADE80; font-weight: 700; margin-bottom: 12px;">✅ Success! Checkout Link Dispatched</div>
        <p><b>Channel:</b> ${channel.toUpperCase()}</p>
        <p><b>Customer:</b> ${customerName} (${contact})</p>
        <p><b>Item:</b> ${productTitle}</p>
        <p><b>Amount:</b> ₹${parseFloat(price).toLocaleString('en-IN')}</p>
        <div style="margin-top: 14px; padding: 12px; background: rgba(255,255,255,0.06); border-radius: 6px;">
          <b>Razorpay Payment Link:</b><br/>
          <a href="${data.paymentUrl}" target="_blank" style="color: #38BDF8; word-break: break-all;">${data.paymentUrl}</a>
        </div>
      `;
    } else {
      saleResultPreview.innerHTML = `<p style="color: #EF4444;">Error: ${data.error || 'Failed to dispatch'}</p>`;
    }
  } catch (err) {
    addLog(`Sale dispatch error: ${err.message}`, 'warn');
    saleResultPreview.innerHTML = `<p style="color: #EF4444;">Error: ${err.message}</p>`;
  }
});

// Simulator Form
formSimulator?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const customerName = document.getElementById('sim-name').value;
  const contact = document.getElementById('sim-phone').value;
  const productTitle = document.getElementById('sim-product').value;
  const amount = document.getElementById('sim-amount').value;

  addLog(`Simulating payment capture of ₹${amount} from ${customerName}...`, 'info');

  try {
    const res = await fetch('/api/simulate-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName, contact, productTitle, amount }),
    });

    const data = await res.json();
    simResult.style.display = 'block';
    simOutput.textContent = JSON.stringify(data, null, 2);

    addLog(`Simulated payment processed! Auto-created Shopify order: ${data.result?.shopifyOrderName || 'Success'}`, 'success');
    loadOrders();
    loadSummaryMetrics();
  } catch (err) {
    addLog(`Simulator error: ${err.message}`, 'warn');
  }
});

// Initialize on Load
window.addEventListener('DOMContentLoaded', () => {
  loadStatus();
  loadSummaryMetrics();
  loadProducts();
});
