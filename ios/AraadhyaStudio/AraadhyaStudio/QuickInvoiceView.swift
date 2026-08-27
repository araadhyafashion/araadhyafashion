import SwiftUI

struct QuickInvoiceView: View {
    @StateObject private var api = APIService.shared
    
    // Customer Details
    @State private var customerName: String = ""
    @State private var phoneNumber: String = ""
    @State private var deliveryCity: String = ""
    
    // Product Details
    @State private var productTitle: String = "Araadhya Nazakat Handcrafted Modal Silk Kurta Set"
    @State private var selectedSize: String = "38-M"
    @State private var priceText: String = "2499"
    @State private var quantity: Int = 1
    
    // State
    @State private var isProcessing: Bool = false
    @State private var generatedInvoice: InvoiceResult?
    @State private var errorMessage: String?
    
    let sizes = ["36-S", "38-M", "40-L", "42-XL", "44-XXL", "46-3XL"]
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 18) {
                    
                    // Header Banner
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text("🧾 QUICK INVOICE & ORDER CREATOR")
                                .font(.caption)
                                .fontWeight(.heavy)
                                .foregroundColor(AraadhyaTheme.gold)
                                .tracking(2)
                            Spacer()
                        }
                        Text("Create Instant Order & Tax Invoice")
                            .font(.title3)
                            .fontWeight(.bold)
                            .foregroundColor(Color(red: 0.1, green: 0.1, blue: 0.1))
                        Text("Generates official Shopify Order in database & sends instant WhatsApp invoice.")
                            .font(.caption)
                            .foregroundColor(Color(red: 0.45, green: 0.45, blue: 0.48))
                    }
                    .padding(16)
                    .background(Color.white)
                    .cornerRadius(16)
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(AraadhyaTheme.borderColor, lineWidth: 1)
                    )
                    
                    // 1. Customer Card
                    VStack(alignment: .leading, spacing: 14) {
                        Text("👤 Customer Details")
                            .font(.subheadline)
                            .fontWeight(.bold)
                            .foregroundColor(Color(red: 0.1, green: 0.1, blue: 0.1))
                        
                        VStack(spacing: 10) {
                            TextField("Customer Full Name (e.g. Priya Sharma)", text: $customerName)
                                .foregroundColor(Color(red: 0.1, green: 0.1, blue: 0.1))
                                .padding(12)
                                .background(Color(red: 0.96, green: 0.95, blue: 0.93))
                                .cornerRadius(10)
                            
                            TextField("WhatsApp Number (e.g. 919920360570)", text: $phoneNumber)
                                .foregroundColor(Color(red: 0.1, green: 0.1, blue: 0.1))
                                .keyboardType(.phonePad)
                                .padding(12)
                                .background(Color(red: 0.96, green: 0.95, blue: 0.93))
                                .cornerRadius(10)
                            
                            TextField("City / Delivery Area (e.g. Mumbai, Bandra)", text: $deliveryCity)
                                .foregroundColor(Color(red: 0.1, green: 0.1, blue: 0.1))
                                .padding(12)
                                .background(Color(red: 0.96, green: 0.95, blue: 0.93))
                                .cornerRadius(10)
                        }
                    }
                    .padding(16)
                    .background(Color.white)
                    .cornerRadius(16)
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(AraadhyaTheme.borderColor, lineWidth: 1)
                    )
                    
                    // 2. Order Item Card
                    VStack(alignment: .leading, spacing: 14) {
                        Text("👗 Order Item & Sizing")
                            .font(.subheadline)
                            .fontWeight(.bold)
                            .foregroundColor(Color(red: 0.1, green: 0.1, blue: 0.1))
                        
                        VStack(alignment: .leading, spacing: 10) {
                            TextField("Product Item Name", text: $productTitle)
                                .foregroundColor(Color(red: 0.1, green: 0.1, blue: 0.1))
                                .padding(12)
                                .background(Color(red: 0.96, green: 0.95, blue: 0.93))
                                .cornerRadius(10)
                            
                            Text("Select Size:")
                                .font(.caption)
                                .fontWeight(.bold)
                                .foregroundColor(Color(red: 0.35, green: 0.35, blue: 0.38))
                            
                            HStack(spacing: 8) {
                                ForEach(sizes, id: \.self) { size in
                                    Button {
                                        selectedSize = size
                                    } label: {
                                        Text(size)
                                            .font(.caption)
                                            .fontWeight(.bold)
                                            .padding(.horizontal, 10)
                                            .padding(.vertical, 8)
                                            .background(selectedSize == size ? AraadhyaTheme.primary : Color.white)
                                            .foregroundColor(selectedSize == size ? .white : Color(red: 0.1, green: 0.1, blue: 0.1))
                                            .cornerRadius(8)
                                            .overlay(
                                                RoundedRectangle(cornerRadius: 8)
                                                    .stroke(selectedSize == size ? AraadhyaTheme.primary : AraadhyaTheme.borderColor, lineWidth: 1)
                                            )
                                    }
                                }
                            }
                            
                            HStack(spacing: 12) {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Selling Price (₹)")
                                        .font(.caption2)
                                        .fontWeight(.bold)
                                        .foregroundColor(Color(red: 0.45, green: 0.45, blue: 0.48))
                                    TextField("Price", text: $priceText)
                                        .foregroundColor(Color(red: 0.1, green: 0.1, blue: 0.1))
                                        .keyboardType(.numberPad)
                                        .padding(10)
                                        .background(Color(red: 0.96, green: 0.95, blue: 0.93))
                                        .cornerRadius(8)
                                }
                                
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Quantity")
                                        .font(.caption2)
                                        .fontWeight(.bold)
                                        .foregroundColor(Color(red: 0.45, green: 0.45, blue: 0.48))
                                    Stepper(value: $quantity, in: 1...10) {
                                        Text("\(quantity)")
                                            .font(.subheadline)
                                            .fontWeight(.bold)
                                            .foregroundColor(Color(red: 0.1, green: 0.1, blue: 0.1))
                                    }
                                    .padding(4)
                                    .background(Color(red: 0.96, green: 0.95, blue: 0.93))
                                    .cornerRadius(8)
                                }
                            }
                        }
                    }
                    .padding(16)
                    .background(Color.white)
                    .cornerRadius(16)
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(AraadhyaTheme.borderColor, lineWidth: 1)
                    )
                    
                    // Error Message
                    if let err = errorMessage {
                        Text(err)
                            .font(.caption)
                            .foregroundColor(.red)
                            .padding(.horizontal)
                    }
                    
                    // 3. Generate & Send Action Button
                    Button {
                        Task { await createInvoiceAndOrder() }
                    } label: {
                        HStack(spacing: 10) {
                            if isProcessing {
                                ProgressView().tint(.white)
                            } else {
                                Image(systemName: "doc.text.badge.plus")
                                    .font(.title3)
                            }
                            Text(isProcessing ? "Recording to Store Database..." : "Create Invoice & Send WhatsApp Link")
                                .font(.headline)
                                .fontWeight(.bold)
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(
                            customerName.isEmpty || phoneNumber.isEmpty ? Color.gray.opacity(0.35) : AraadhyaTheme.primary
                        )
                        .cornerRadius(14)
                    }
                    .disabled(customerName.isEmpty || phoneNumber.isEmpty || isProcessing)
                    
                    // 4. Success Invoice Confirmation Card
                    if let inv = generatedInvoice {
                        VStack(alignment: .leading, spacing: 12) {
                            HStack {
                                Image(systemName: "checkmark.seal.fill")
                                    .foregroundColor(AraadhyaTheme.success)
                                Text("Order Synced to Store Database!")
                                    .font(.headline)
                                    .fontWeight(.bold)
                                    .foregroundColor(AraadhyaTheme.success)
                            }
                            
                            Divider()
                            
                            VStack(alignment: .leading, spacing: 6) {
                                HStack {
                                    Text("Invoice #:")
                                        .font(.caption)
                                        .foregroundColor(Color(red: 0.45, green: 0.45, blue: 0.48))
                                    Spacer()
                                    Text(inv.invoiceNumber)
                                        .font(.caption)
                                        .fontWeight(.bold)
                                        .foregroundColor(Color(red: 0.1, green: 0.1, blue: 0.1))
                                }
                                
                                HStack {
                                    Text("Shopify Order ID:")
                                        .font(.caption)
                                        .foregroundColor(Color(red: 0.45, green: 0.45, blue: 0.48))
                                    Spacer()
                                    Text(inv.shopifyOrderId)
                                        .font(.caption)
                                        .fontWeight(.bold)
                                        .foregroundColor(Color(red: 0.1, green: 0.1, blue: 0.1))
                                }
                                
                                HStack {
                                    Text("Total Amount:")
                                        .font(.caption)
                                        .foregroundColor(Color(red: 0.45, green: 0.45, blue: 0.48))
                                    Spacer()
                                    Text("₹\(inv.totalAmount)")
                                        .font(.headline)
                                        .fontWeight(.heavy)
                                        .foregroundColor(AraadhyaTheme.primary)
                                }
                            }
                            .padding(10)
                            .background(Color(red: 0.96, green: 0.95, blue: 0.93))
                            .cornerRadius(10)
                            
                            Link(destination: URL(string: inv.paymentUrl)!) {
                                HStack {
                                    Image(systemName: "creditcard.fill")
                                    Text("Open Razorpay / UPI Link")
                                        .fontWeight(.bold)
                                    Spacer()
                                    Image(systemName: "arrow.up.right")
                                }
                                .foregroundColor(.white)
                                .padding()
                                .background(Color.blue)
                                .cornerRadius(10)
                            }
                        }
                        .padding(16)
                        .background(Color.white)
                        .cornerRadius(16)
                        .overlay(
                            RoundedRectangle(cornerRadius: 16)
                                .stroke(AraadhyaTheme.success.opacity(0.5), lineWidth: 1.5)
                        )
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 14)
            }
            .background(AraadhyaTheme.appBg.ignoresSafeArea())
            .navigationTitle("Quick Invoice")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    HStack(spacing: 6) {
                        Text("🧾")
                        Text("Quick Invoice")
                            .font(.headline)
                            .fontWeight(.bold)
                            .foregroundColor(AraadhyaTheme.primary)
                    }
                }
            }
        }
    }
    
    private func createInvoiceAndOrder() async {
        isProcessing = true
        errorMessage = nil
        
        let price = Double(priceText) ?? 2499
        let total = price * Double(quantity)
        
        do {
            let inv = try await api.createQuickInvoice(
                customerName: customerName,
                phone: phoneNumber,
                city: deliveryCity,
                productTitle: "\(productTitle) (\(selectedSize))",
                amount: total,
                quantity: quantity
            )
            await MainActor.run {
                self.generatedInvoice = inv
                self.isProcessing = false
            }
        } catch {
            await MainActor.run {
                self.errorMessage = error.localizedDescription
                self.isProcessing = false
            }
        }
    }
}

struct InvoiceResult {
    let invoiceNumber: String
    let shopifyOrderId: String
    let totalAmount: Int
    let paymentUrl: String
}
