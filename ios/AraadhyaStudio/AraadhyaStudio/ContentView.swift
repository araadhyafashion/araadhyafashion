import SwiftUI

struct ContentView: View {
    @State private var selectedTab: Int = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            
            // Tab 0: Store Intelligence & Dashboard
            DashboardView()
                .tabItem {
                    Label("Dashboard", systemImage: "chart.bar.xaxis")
                }
                .tag(0)
            
            // Tab 1: Fast Studio Upload
            StudioUploadView()
                .tabItem {
                    Label("Studio", systemImage: "camera.fill")
                }
                .tag(1)
            
            // Tab 2: AI Virtual Model Photoshoot
            AIStudioView()
                .tabItem {
                    Label("AI Studio", systemImage: "wand.and.stars")
                }
                .tag(2)
            
            // Tab 3: Live Store Catalog
            CatalogView()
                .tabItem {
                    Label("Catalog", systemImage: "bag.fill")
                }
                .tag(3)
            
            // Tab 4: Quick Invoice & Order Creator
            QuickInvoiceView()
                .tabItem {
                    Label("Quick Invoice", systemImage: "doc.text.fill")
                }
                .tag(4)
        }
        .tint(AraadhyaTheme.primary)
    }
}
