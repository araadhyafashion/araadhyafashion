import SwiftUI

enum AraadhyaTheme {
    // Brand Colors
    static let primary = Color(red: 0.47, green: 0.0, blue: 0.09) // Royal Burgundy #780016
    static let primaryDark = Color(red: 0.32, green: 0.0, blue: 0.05)
    static let primaryLight = Color(red: 0.61, green: 0.07, blue: 0.12)
    
    static let gold = Color(red: 0.72, green: 0.53, blue: 0.15) // Antique Gold #B8860B
    static let goldLight = Color(red: 0.95, green: 0.88, blue: 0.70)
    
    // Luxury Off-White / Ivory Light Theme
    static let appBg = Color(red: 0.98, green: 0.97, blue: 0.95) // Warm Ivory #FAF8F5
    static let cardBg = Color.white
    static let inputBg = Color(red: 0.95, green: 0.94, blue: 0.92)
    static let borderColor = Color(red: 0.88, green: 0.86, blue: 0.82)
    
    static let textPrimary = Color(red: 0.12, green: 0.12, blue: 0.14)
    static let textSecondary = Color(red: 0.45, green: 0.45, blue: 0.48)
    
    static let success = Color(red: 0.10, green: 0.55, blue: 0.30)
}

struct LuxuryCardStyle: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(AraadhyaTheme.cardBg)
            .cornerRadius(16)
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(AraadhyaTheme.borderColor, lineWidth: 1)
            )
            .shadow(color: Color.black.opacity(0.03), radius: 8, x: 0, y: 2)
    }
}

extension View {
    func luxuryCard() -> some View {
        self.modifier(LuxuryCardStyle())
    }
}
