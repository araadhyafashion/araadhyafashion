import Foundation

struct UploadProductResponse: Codable {
    let success: Bool
    let product: PublishedProductSummary?
    let error: String?
}

struct PublishedProductSummary: Codable, Identifiable {
    let id: Int64
    let title: String
    let retailPrice: Double
    let compareAtPrice: Double
    let variantsCount: Int
    let imagesCount: Int
    let url: String
}

struct ShopifyProductItem: Codable, Identifiable {
    let id: Int64
    let title: String
    let handle: String
    let vendor: String?
    let product_type: String?
    let images: [ShopifyProductImage]?
    let variants: [ShopifyProductVariant]?
}

struct ShopifyProductImage: Codable, Identifiable {
    let id: Int64
    let src: String
}

struct ShopifyProductVariant: Codable, Identifiable {
    let id: Int64
    let title: String
    let price: String
    let compare_at_price: String?
    let sku: String?
}

enum UploadStep: String, CaseIterable {
    case idle = "Ready to Upload"
    case compressing = "Processing High-Res Photos (1/4)"
    case analyzing = "Extracting 2x Pricing & Sizes (2/4)"
    case generatingCopy = "Writing Luxury Lucknowi Copy (3/4)"
    case syncingShopify = "Publishing to araadhyafashion.com (4/4)"
    case completed = "🎉 Successfully Published!"
    case failed = "Upload Failed"
    
    var progressValue: Double {
        switch self {
        case .idle: return 0.0
        case .compressing: return 0.25
        case .analyzing: return 0.50
        case .generatingCopy: return 0.75
        case .syncingShopify: return 0.95
        case .completed: return 1.0
        case .failed: return 0.0
        }
    }
}
