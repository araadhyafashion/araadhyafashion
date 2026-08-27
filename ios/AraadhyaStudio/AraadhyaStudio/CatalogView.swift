import SwiftUI

struct CatalogView: View {
    @StateObject private var api = APIService.shared
    @State private var products: [ShopifyProductItem] = []
    @State private var isLoading: Bool = true
    @State private var errorMessage: String? = nil
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 14) {
                    if isLoading {
                        VStack(spacing: 12) {
                            ProgressView()
                                .tint(AraadhyaTheme.primary)
                            Text("Loading Live Catalog...")
                                .font(.subheadline)
                                .foregroundColor(Color(red: 0.4, green: 0.4, blue: 0.4))
                        }
                        .padding(.top, 40)
                    } else if let error = errorMessage {
                        VStack(spacing: 12) {
                            Image(systemName: "exclamationmark.triangle")
                                .font(.largeTitle)
                                .foregroundColor(.orange)
                            Text(error)
                                .font(.subheadline)
                                .foregroundColor(Color(red: 0.4, green: 0.4, blue: 0.4))
                            Button("Retry") { loadCatalog() }
                                .padding(.horizontal, 20)
                                .padding(.vertical, 8)
                                .background(AraadhyaTheme.primary)
                                .foregroundColor(.white)
                                .cornerRadius(8)
                        }
                        .padding(.top, 40)
                    } else if products.isEmpty {
                        Text("No products found on store yet.")
                            .font(.subheadline)
                            .foregroundColor(Color(red: 0.4, green: 0.4, blue: 0.4))
                            .padding(.top, 40)
                    } else {
                        ForEach(products) { item in
                            HStack(spacing: 14) {
                                if let firstImg = item.images?.first, let url = URL(string: firstImg.src) {
                                    AsyncImage(url: url) { phase in
                                        if let img = phase.image {
                                            img.resizable().scaledToFill()
                                        } else {
                                            Color(red: 0.94, green: 0.93, blue: 0.90)
                                        }
                                    }
                                    .frame(width: 70, height: 88)
                                    .clipShape(RoundedRectangle(cornerRadius: 10))
                                } else {
                                    RoundedRectangle(cornerRadius: 10)
                                        .fill(Color(red: 0.94, green: 0.93, blue: 0.90))
                                        .frame(width: 70, height: 88)
                                        .overlay(Text("👗").font(.title2))
                                }
                                
                                VStack(alignment: .leading, spacing: 5) {
                                    Text(item.title)
                                        .font(.subheadline)
                                        .fontWeight(.bold)
                                        .foregroundColor(Color(red: 0.1, green: 0.1, blue: 0.1))
                                        .lineLimit(2)
                                    
                                    if let price = item.variants?.first?.price {
                                        Text("₹\(price)")
                                            .font(.subheadline)
                                            .fontWeight(.heavy)
                                            .foregroundColor(AraadhyaTheme.primary)
                                    }
                                    
                                    Text("\(item.variants?.count ?? 0) Size Variants")
                                        .font(.caption2)
                                        .fontWeight(.medium)
                                        .foregroundColor(Color(red: 0.45, green: 0.45, blue: 0.48))
                                }
                                
                                Spacer()
                                
                                if let storeUrl = URL(string: "https://araadhyafashion.myshopify.com/products/\(item.handle)") {
                                    Link(destination: storeUrl) {
                                        Image(systemName: "arrow.up.right.square.fill")
                                            .font(.title2)
                                            .foregroundColor(AraadhyaTheme.primary)
                                    }
                                }
                            }
                            .padding(12)
                            .background(Color.white)
                            .cornerRadius(14)
                            .overlay(
                                RoundedRectangle(cornerRadius: 14)
                                    .stroke(AraadhyaTheme.borderColor, lineWidth: 1)
                            )
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 14)
            }
            .background(AraadhyaTheme.appBg.ignoresSafeArea())
            .navigationTitle("Live Catalog")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    HStack(spacing: 6) {
                        Text("👗")
                        Text("Live Catalog")
                            .font(.headline)
                            .fontWeight(.bold)
                            .foregroundColor(AraadhyaTheme.primary)
                    }
                }
            }
            .onAppear {
                if products.isEmpty { loadCatalog() }
            }
        }
    }
    
    private func loadCatalog() {
        isLoading = true
        errorMessage = nil
        Task {
            do {
                let items = try await api.fetchCatalog()
                await MainActor.run {
                    self.products = items
                    self.isLoading = false
                }
            } catch {
                await MainActor.run {
                    self.errorMessage = error.localizedDescription
                    self.isLoading = false
                }
            }
        }
    }
}
