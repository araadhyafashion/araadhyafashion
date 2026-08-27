import SwiftUI

struct DashboardView: View {
    @StateObject private var api = APIService.shared
    @State private var stats: DashboardStats?
    @State private var isLoading: Bool = true
    @State private var errorMessage: String?
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 18) {
                    
                    // Brand Header Card
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("👑 ARAADHYA FASHION")
                                    .font(.caption)
                                    .fontWeight(.heavy)
                                    .foregroundColor(Color(red: 0.95, green: 0.85, blue: 0.55))
                                    .tracking(2)
                                Text("Commerce Hub")
                                    .font(.title2)
                                    .fontWeight(.bold)
                                    .foregroundColor(.white)
                            }
                            Spacer()
                            Button {
                                Task { await loadStats() }
                            } label: {
                                Image(systemName: "arrow.clockwise")
                                    .font(.title3)
                                    .foregroundColor(.white)
                                    .rotationEffect(.degrees(isLoading ? 360 : 0))
                                    .animation(isLoading ? Animation.linear(duration: 1).repeatForever(autoreverses: false) : .default, value: isLoading)
                                    .padding(10)
                                    .background(Color.white.opacity(0.2))
                                    .clipShape(Circle())
                            }
                        }
                        
                        HStack(spacing: 8) {
                            Circle().fill(Color.green).frame(width: 8, height: 8)
                            Text("Store Online • Shopify Connected")
                                .font(.caption2)
                                .foregroundColor(.white.opacity(0.95))
                        }
                    }
                    .padding(18)
                    .background(
                        LinearGradient(
                            colors: [AraadhyaTheme.primary, AraadhyaTheme.primaryDark],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .cornerRadius(16)
                    .shadow(color: AraadhyaTheme.primary.opacity(0.25), radius: 8, y: 4)
                    
                    // KPI Metrics Grid
                    if let s = stats {
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 14) {
                            
                            MetricCard(
                                title: "Active Products",
                                value: "\(s.activeProducts)",
                                icon: "bag.fill",
                                color: .purple,
                                subtitle: "Live on Store"
                            )
                            
                            MetricCard(
                                title: "Size Variants",
                                value: "\(s.totalVariants)",
                                icon: "square.grid.2x2.fill",
                                color: .blue,
                                subtitle: "36-S to 46-3XL"
                            )
                            
                            MetricCard(
                                title: "Catalog Value",
                                value: "₹\(Int(s.catalogValuation).formatted())",
                                icon: "indianrupeesign.circle.fill",
                                color: AraadhyaTheme.success,
                                subtitle: "Retail Inventory"
                            )
                            
                            MetricCard(
                                title: "Total Orders",
                                value: "\(s.ordersCount)",
                                icon: "shippingbox.fill",
                                color: .orange,
                                subtitle: "100% Fulfilled"
                            )
                        }
                        
                        // System Integrations Status Card
                        VStack(alignment: .leading, spacing: 14) {
                            Text("⚡ Live Integrations & Health")
                                .font(.subheadline)
                                .fontWeight(.bold)
                                .foregroundColor(Color(red: 0.1, green: 0.1, blue: 0.1))
                            
                            IntegrationRow(name: "Shopify Storefront", status: "Live & Syncing", icon: "cart.fill", isOnline: true)
                            IntegrationRow(name: "Meta WhatsApp & IG", status: "Active (Araadhya Ai)", icon: "message.fill", isOnline: true)
                            IntegrationRow(name: "Razorpay Payments", status: "UPI & Cards Active", icon: "creditcard.fill", isOnline: true)
                            IntegrationRow(name: "AI Studio Photoshoot", status: "Ready", icon: "wand.and.stars", isOnline: true)
                        }
                        .padding(16)
                        .background(Color.white)
                        .cornerRadius(16)
                        .overlay(
                            RoundedRectangle(cornerRadius: 16)
                                .stroke(AraadhyaTheme.borderColor, lineWidth: 1)
                        )
                        
                        // Direct Store Link
                        Link(destination: URL(string: "https://araadhyafashion.myshopify.com")!) {
                            HStack {
                                Image(systemName: "safari.fill")
                                Text("Open Live Store Website")
                                    .fontWeight(.bold)
                                Spacer()
                                Image(systemName: "arrow.up.right")
                            }
                            .foregroundColor(AraadhyaTheme.primary)
                            .padding()
                            .background(Color(red: 0.96, green: 0.92, blue: 0.85))
                            .cornerRadius(12)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(AraadhyaTheme.gold.opacity(0.6), lineWidth: 1)
                            )
                        }
                        
                    } else if isLoading {
                        VStack(spacing: 12) {
                            ProgressView()
                                .tint(AraadhyaTheme.primary)
                            Text("Loading Store Intelligence...")
                                .font(.subheadline)
                                .foregroundColor(Color(red: 0.4, green: 0.4, blue: 0.4))
                        }
                        .padding(.top, 40)
                    } else {
                        VStack(spacing: 12) {
                            Image(systemName: "exclamationmark.triangle")
                                .font(.largeTitle)
                                .foregroundColor(.orange)
                            Text(errorMessage ?? "Unable to load dashboard")
                                .font(.subheadline)
                                .foregroundColor(Color(red: 0.4, green: 0.4, blue: 0.4))
                            Button("Retry") {
                                Task { await loadStats() }
                            }
                            .padding(.horizontal, 20)
                            .padding(.vertical, 8)
                            .background(AraadhyaTheme.primary)
                            .foregroundColor(.white)
                            .cornerRadius(8)
                        }
                        .padding(.top, 40)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 14)
            }
            .background(AraadhyaTheme.appBg.ignoresSafeArea())
            .navigationTitle("Dashboard")
            .navigationBarHidden(true)
            .onAppear {
                Task { await loadStats() }
            }
        }
    }
    
    private func loadStats() async {
        isLoading = true
        errorMessage = nil
        do {
            let s = try await api.fetchDashboardStats()
            await MainActor.run {
                self.stats = s
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

struct MetricCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color
    let subtitle: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Image(systemName: icon)
                    .font(.title3)
                    .foregroundColor(color)
                Spacer()
            }
            
            VStack(alignment: .leading, spacing: 2) {
                Text(value)
                    .font(.title2)
                    .fontWeight(.heavy)
                    .foregroundColor(Color(red: 0.1, green: 0.1, blue: 0.1))
                
                Text(title)
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(Color(red: 0.35, green: 0.35, blue: 0.38))
                
                Text(subtitle)
                    .font(.caption2)
                    .foregroundColor(color)
            }
        }
        .padding(14)
        .background(Color.white)
        .cornerRadius(14)
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(AraadhyaTheme.borderColor, lineWidth: 1)
        )
    }
}

struct IntegrationRow: View {
    let name: String
    let status: String
    let icon: String
    let isOnline: Bool
    
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.body)
                .foregroundColor(AraadhyaTheme.primary)
                .frame(width: 32, height: 32)
                .background(AraadhyaTheme.primary.opacity(0.1))
                .cornerRadius(8)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(name)
                    .font(.subheadline)
                    .fontWeight(.bold)
                    .foregroundColor(Color(red: 0.1, green: 0.1, blue: 0.1))
                Text(status)
                    .font(.caption2)
                    .foregroundColor(Color(red: 0.45, green: 0.45, blue: 0.48))
            }
            
            Spacer()
            
            HStack(spacing: 4) {
                Circle().fill(isOnline ? Color.green : Color.red).frame(width: 6, height: 6)
                Text(isOnline ? "Active" : "Offline")
                    .font(.caption2)
                    .fontWeight(.bold)
                    .foregroundColor(isOnline ? Color(red: 0.08, green: 0.55, blue: 0.25) : .red)
            }
        }
        .padding(.vertical, 4)
    }
}
