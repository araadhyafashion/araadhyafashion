import SwiftUI
import PhotosUI

struct StudioUploadView: View {
    @StateObject private var api = APIService.shared
    
    // UI Form State
    @State private var selectedPhotos: [PhotosPickerItem] = []
    @State private var selectedUIImages: [UIImage] = []
    @State private var vendorCaption: String = ""
    @State private var wholesalePriceText: String = "1699"
    @State private var selectedSizes: Set<String> = ["38-M", "40-L", "42-XL", "44-XXL", "46-3XL"]
    
    // Upload & Feedback State
    @State private var isUploading: Bool = false
    @State private var uploadStep: UploadStep = .idle
    @State private var publishedProduct: PublishedProductSummary?
    @State private var showSuccessModal: Bool = false
    @State private var errorMessage: String? = nil
    @State private var showErrorAlert: Bool = false
    
    let availableSizes = ["36-S", "38-M", "40-L", "42-XL", "44-XXL", "46-3XL"]
    
    // Calculated Prices (2x Retail Rule)
    var wholesalePrice: Double {
        Double(wholesalePriceText) ?? 1699.0
    }
    
    var retailPrice: Double {
        let raw = wholesalePrice * 2.0
        let hundreds = floor(raw / 100.0) * 100.0
        return hundreds + 99.0
    }
    
    var compareAtPrice: Double {
        let raw = wholesalePrice * 4.0
        let hundreds = floor(raw / 100.0) * 100.0
        return hundreds + 99.0
    }
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    
                    // 1. Photos Picker Section
                    photoPickerSection
                    
                    // 2. Vendor Caption Input
                    vendorCaptionSection
                    
                    // 3. 2x Pricing Calculator Card
                    pricingCalculatorCard
                    
                    // 4. Size Variants Matrix
                    sizeSelectorSection
                    
                    // 5. Upload Progress Bar (When publishing)
                    if isUploading {
                        uploadProgressBar
                    }
                    
                    // 6. Main Action Button
                    publishButton
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 14)
            }
            .background(AraadhyaTheme.appBg.ignoresSafeArea())
            .navigationTitle("Araadhya Fashion")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    HStack(spacing: 6) {
                        Text("👑")
                        Text("Araadhya Fashion")
                            .font(.headline)
                            .fontWeight(.heavy)
                            .foregroundColor(AraadhyaTheme.primary)
                    }
                }
            }
            .sheet(isPresented: $showSuccessModal) {
                if let product = publishedProduct {
                    SuccessView(product: product) {
                        showSuccessModal = false
                        resetForm()
                    }
                }
            }
            .alert("Publishing Failed", isPresented: $showErrorAlert) {
                Button("OK", role: .cancel) { }
            } message: {
                Text(errorMessage ?? "An unexpected error occurred.")
            }
        }
    }
    
    // MARK: - Subviews
    
    private var photoPickerSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("📸 Kurti Photos (HD)")
                    .font(.subheadline)
                    .fontWeight(.bold)
                    .foregroundColor(AraadhyaTheme.textPrimary)
                Spacer()
                if !selectedUIImages.isEmpty {
                    Text("\(selectedUIImages.count) Selected")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(AraadhyaTheme.success)
                }
            }
            
            PhotosPicker(
                selection: $selectedPhotos,
                maxSelectionCount: 10,
                matching: .images,
                photoLibrary: .shared()
            ) {
                VStack(spacing: 8) {
                    Image(systemName: "photo.badge.plus")
                        .font(.system(size: 34))
                        .foregroundColor(AraadhyaTheme.primary)
                    
                    Text(selectedUIImages.isEmpty ? "Tap to Select Photos from Camera Roll" : "Tap to Change Photos")
                        .font(.subheadline)
                        .fontWeight(.bold)
                        .foregroundColor(AraadhyaTheme.textPrimary)
                    
                    Text("Select multi-angle shots (Front, Back, Close-up embroidery)")
                        .font(.caption)
                        .foregroundColor(AraadhyaTheme.textSecondary)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 24)
                .background(Color.white)
                .cornerRadius(16)
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(AraadhyaTheme.borderColor, style: StrokeStyle(lineWidth: 1.5, dash: [6, 4]))
                )
            }
            .onChange(of: selectedPhotos) { newItems in
                Task {
                    selectedUIImages = []
                    for item in newItems {
                        if let data = try? await item.loadTransferable(type: Data.self),
                           let image = UIImage(data: data) {
                            selectedUIImages.append(image)
                        }
                    }
                }
            }
            
            if !selectedUIImages.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(0..<selectedUIImages.count, id: \.self) { idx in
                            ZStack(alignment: .topTrailing) {
                                Image(uiImage: selectedUIImages[idx])
                                    .resizable()
                                    .scaledToFill()
                                    .frame(width: 80, height: 105)
                                    .clipShape(RoundedRectangle(cornerRadius: 10))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 10)
                                            .stroke(AraadhyaTheme.borderColor, lineWidth: 1)
                                    )
                                
                                Button(action: {
                                    if idx < selectedUIImages.count {
                                        selectedUIImages.remove(at: idx)
                                    }
                                    if idx < selectedPhotos.count {
                                        selectedPhotos.remove(at: idx)
                                    }
                                }) {
                                    Image(systemName: "xmark.circle.fill")
                                        .foregroundColor(.red)
                                        .background(Color.white.clipShape(Circle()))
                                }
                                .offset(x: 4, y: -4)
                            }
                        }
                    }
                    .padding(.vertical, 4)
                }
            }
        }
    }
    
    private var vendorCaptionSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("📝 Vendor WhatsApp Description")
                .font(.subheadline)
                .fontWeight(.bold)
                .foregroundColor(AraadhyaTheme.textPrimary)
            
            ZStack(alignment: .topLeading) {
                if vendorCaption.isEmpty {
                    Text("Paste vendor caption here (e.g. Beautiful Lucknowi modal silk kurta set, Rate 1699, sizes 38-44)...")
                        .font(.subheadline)
                        .foregroundColor(AraadhyaTheme.textSecondary.opacity(0.8))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 12)
                }
                
                TextEditor(text: $vendorCaption)
                    .font(.subheadline)
                    .foregroundColor(AraadhyaTheme.textPrimary)
                    .frame(minHeight: 90)
                    .padding(8)
                    .background(Color.clear)
                    .onChange(of: vendorCaption) { newText in
                        autoDetectPrice(from: newText)
                    }
            }
            .background(Color.white)
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(AraadhyaTheme.borderColor, lineWidth: 1)
            )
        }
    }
    
    private var pricingCalculatorCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Wholesale Rate")
                        .font(.caption2)
                        .fontWeight(.bold)
                        .foregroundColor(AraadhyaTheme.textSecondary)
                    
                    HStack(spacing: 2) {
                        Text("₹")
                            .font(.headline)
                            .foregroundColor(AraadhyaTheme.primary)
                        TextField("1699", text: $wholesalePriceText)
                            .font(.system(size: 22, weight: .bold, design: .rounded))
                            .foregroundColor(AraadhyaTheme.textPrimary)
                            .keyboardType(.numberPad)
                            .frame(width: 85)
                    }
                }
                
                Spacer()
                
                Image(systemName: "arrow.right.circle.fill")
                    .font(.title2)
                    .foregroundColor(AraadhyaTheme.gold)
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 2) {
                    Text("Selling Price (2x)")
                        .font(.caption2)
                        .fontWeight(.bold)
                        .foregroundColor(AraadhyaTheme.success)
                    
                    Text("₹\(Int(retailPrice))")
                        .font(.system(size: 24, weight: .heavy, design: .rounded))
                        .foregroundColor(AraadhyaTheme.success)
                    
                    Text("Compare: ₹\(Int(compareAtPrice)) (50% OFF)")
                        .font(.system(size: 11))
                        .fontWeight(.medium)
                        .foregroundColor(AraadhyaTheme.textSecondary)
                }
            }
        }
        .padding(16)
        .background(Color.white)
        .cornerRadius(14)
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(AraadhyaTheme.gold.opacity(0.4), lineWidth: 1.5)
        )
    }
    
    private var sizeSelectorSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("📏 Size Variants")
                .font(.subheadline)
                .fontWeight(.bold)
                .foregroundColor(AraadhyaTheme.textPrimary)
            
            HStack(spacing: 8) {
                ForEach(availableSizes, id: \.self) { size in
                    let isSelected = selectedSizes.contains(size)
                    Button(action: {
                        if isSelected {
                            selectedSizes.remove(size)
                        } else {
                            selectedSizes.insert(size)
                        }
                    }) {
                        Text(size)
                            .font(.caption)
                            .fontWeight(.bold)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 8)
                            .background(isSelected ? AraadhyaTheme.primary : Color.white)
                            .foregroundColor(isSelected ? .white : AraadhyaTheme.textPrimary)
                            .cornerRadius(8)
                            .overlay(
                                RoundedRectangle(cornerRadius: 8)
                                    .stroke(isSelected ? AraadhyaTheme.primary : AraadhyaTheme.borderColor, lineWidth: 1.2)
                            )
                    }
                }
            }
        }
    }
    
    private var uploadProgressBar: some View {
        VStack(spacing: 8) {
            HStack {
                Text(uploadStep.rawValue)
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(AraadhyaTheme.primary)
                Spacer()
                Text("\(Int(uploadStep.progressValue * 100))%")
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(AraadhyaTheme.primary)
            }
            
            ProgressView(value: uploadStep.progressValue)
                .tint(AraadhyaTheme.primary)
                .scaleEffect(x: 1, y: 1.5, anchor: .center)
        }
        .padding(14)
        .background(Color.white)
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(AraadhyaTheme.borderColor, lineWidth: 1)
        )
    }
    
    private var publishButton: some View {
        Button(action: {
            startPublishing()
        }) {
            HStack(spacing: 8) {
                if isUploading {
                    ProgressView()
                        .tint(.white)
                } else {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.title3)
                }
                
                Text(isUploading ? "Publishing to Store..." : "Publish Live to Website")
                    .font(.headline)
                    .fontWeight(.bold)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(
                LinearGradient(
                    colors: [AraadhyaTheme.primary, AraadhyaTheme.primaryLight],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .foregroundColor(.white)
            .cornerRadius(14)
            .shadow(color: AraadhyaTheme.primary.opacity(0.3), radius: 8, x: 0, y: 4)
        }
        .disabled(isUploading)
    }
    
    // MARK: - Actions
    
    private func autoDetectPrice(from text: String) {
        let pattern = #"(?:rate|price|rs\.?|inr|₹)\s*[:=-]?\s*(\d{3,5})"#
        if let regex = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive),
           let match = regex.firstMatch(in: text, options: [], range: NSRange(location: 0, length: text.utf16.count)),
           let range = Range(match.range(at: 1), in: text) {
            let foundPrice = String(text[range])
            if let num = Double(foundPrice), num >= 250 {
                self.wholesalePriceText = foundPrice
            }
        }
    }
    
    private func startPublishing() {
        guard !selectedUIImages.isEmpty else {
            self.errorMessage = "Please select at least 1 photo of the Kurti."
            self.showErrorAlert = true
            return
        }
        
        isUploading = true
        errorMessage = nil
        
        Task {
            do {
                let product = try await api.publishProduct(
                    caption: vendorCaption,
                    wholesalePrice: wholesalePrice,
                    sizes: Array(selectedSizes),
                    uiImages: selectedUIImages
                ) { step in
                    self.uploadStep = step
                }
                
                await MainActor.run {
                    self.publishedProduct = product
                    self.isUploading = false
                    self.showSuccessModal = true
                }
            } catch {
                await MainActor.run {
                    self.errorMessage = error.localizedDescription
                    self.isUploading = false
                    self.showErrorAlert = true
                }
            }
        }
    }
    
    private func resetForm() {
        selectedPhotos = []
        selectedUIImages = []
        vendorCaption = ""
        wholesalePriceText = "1699"
        uploadStep = .idle
    }
}

struct SuccessView: View {
    let product: PublishedProductSummary
    let onDismiss: () -> Void
    
    var body: some View {
        VStack(spacing: 24) {
            Image(systemName: "checkmark.seal.fill")
                .font(.system(size: 64))
                .foregroundColor(AraadhyaTheme.success)
                .padding(.top, 32)
            
            VStack(spacing: 8) {
                Text("Published Successfully!")
                    .font(.title2)
                    .fontWeight(.heavy)
                    .foregroundColor(AraadhyaTheme.textPrimary)
                
                Text(product.title)
                    .font(.subheadline)
                    .foregroundColor(AraadhyaTheme.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
            }
            
            VStack(spacing: 12) {
                HStack {
                    Text("Selling Price:")
                        .foregroundColor(AraadhyaTheme.textSecondary)
                    Spacer()
                    Text("₹\(Int(product.retailPrice))")
                        .fontWeight(.bold)
                        .foregroundColor(AraadhyaTheme.success)
                }
                
                HStack {
                    Text("Sizes Created:")
                        .foregroundColor(AraadhyaTheme.textSecondary)
                    Spacer()
                    Text("\(product.variantsCount) Variants")
                        .fontWeight(.semibold)
                }
            }
            .padding(16)
            .background(AraadhyaTheme.inputBg)
            .cornerRadius(12)
            .padding(.horizontal)
            
            if let url = URL(string: product.url) {
                Link(destination: url) {
                    HStack {
                        Image(systemName: "safari")
                        Text("View on Araadhya Fashion Store")
                            .fontWeight(.bold)
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(AraadhyaTheme.primary)
                    .foregroundColor(.white)
                    .cornerRadius(12)
                }
                .padding(.horizontal)
            }
            
            Button(action: onDismiss) {
                Text("Upload Another Kurti")
                    .fontWeight(.semibold)
                    .foregroundColor(AraadhyaTheme.primary)
            }
            .padding(.top, 8)
            
            Spacer()
        }
        .background(AraadhyaTheme.appBg)
    }
}
