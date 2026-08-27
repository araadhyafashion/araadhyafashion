import SwiftUI
import PhotosUI

struct AIStudioView: View {
    @State private var selectedPhotos: [PhotosPickerItem] = []
    @State private var inputImage: UIImage?
    @State private var selectedSceneIndex: Int = 0
    @State private var isGenerating: Bool = false
    @State private var generationProgress: Double = 0.0
    @State private var progressText: String = ""
    @State private var generatedShots: [String] = []
    @State private var isPublished: Bool = false
    
    let scenes = [
        ("Palace Heritage", "Awadh Royal Courtyard, Sandstone Arches", "crown.fill"),
        ("Studio Minimal", "Warm Neutral Softbox, High Luxury", "camera.aperture"),
        ("Golden Hour", "Natural Sunset Glow, Festive Mood", "sun.max.fill"),
        ("Jharokha Balcony", "Intricate Royal Lucknow Carvings", "building.columns.fill")
    ]
    
    let shotAngles = [
        ("Front Silhouette", "Full length royal stance"),
        ("3/4 Profile", "Sleeve flair & drape movement"),
        ("Macro Zoom", "Close-up hand needlework stitches"),
        ("Back Neckline", "Graceful dupatta styling")
    ]
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    
                    // Header Banner
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text("✨ AI VIRTUAL MODEL STUDIO")
                                .font(.caption)
                                .fontWeight(.heavy)
                                .foregroundColor(AraadhyaTheme.gold)
                                .tracking(2)
                            Spacer()
                        }
                        Text("Create Hyper-Realistic Photoshoots")
                            .font(.title3)
                            .fontWeight(.bold)
                            .foregroundColor(AraadhyaTheme.textPrimary)
                        Text("Turn raw Kurti photos into 4-angle Indian model campaigns that look 100% authentic.")
                            .font(.caption)
                            .foregroundColor(AraadhyaTheme.textSecondary)
                    }
                    .padding(16)
                    .background(Color.white)
                    .cornerRadius(16)
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(AraadhyaTheme.borderColor, lineWidth: 1)
                    )
                    
                    // 1. Photo Input Card
                    VStack(alignment: .leading, spacing: 12) {
                        Text("📸 1. Select Flatlay / Mannequin Photo")
                            .font(.subheadline)
                            .fontWeight(.bold)
                            .foregroundColor(AraadhyaTheme.textPrimary)
                        
                        if let img = inputImage {
                            ZStack(alignment: .topTrailing) {
                                Image(uiImage: img)
                                    .resizable()
                                    .scaledToFill()
                                    .frame(maxWidth: .infinity)
                                    .frame(height: 220)
                                    .clipped()
                                    .cornerRadius(12)
                                
                                Button {
                                    inputImage = nil
                                    selectedPhotos = []
                                } label: {
                                    Image(systemName: "xmark.circle.fill")
                                        .font(.title2)
                                        .foregroundColor(.white)
                                        .background(Color.black.opacity(0.6).clipShape(Circle()))
                                        .padding(8)
                                }
                            }
                        } else {
                            PhotosPicker(selection: $selectedPhotos, maxSelectionCount: 1, matching: .images) {
                                VStack(spacing: 10) {
                                    Image(systemName: "photo.badge.plus")
                                        .font(.system(size: 36))
                                        .foregroundColor(AraadhyaTheme.primary)
                                    Text("Tap to Choose Kurti Photo")
                                        .font(.subheadline)
                                        .fontWeight(.semibold)
                                        .foregroundColor(AraadhyaTheme.textPrimary)
                                    Text("Works with vendor shots, flatlays, or hanger photos")
                                        .font(.caption)
                                        .foregroundColor(AraadhyaTheme.textSecondary)
                                }
                                .frame(maxWidth: .infinity)
                                .frame(height: 140)
                                .background(Color.white)
                                .cornerRadius(12)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(AraadhyaTheme.borderColor, style: StrokeStyle(lineWidth: 1.5, dash: [6, 4]))
                                )
                            }
                            .onChange(of: selectedPhotos) { newItems in
                                if let first = newItems.first {
                                    Task {
                                        if let data = try? await first.loadTransferable(type: Data.self),
                                           let uiImg = UIImage(data: data) {
                                            await MainActor.run { self.inputImage = uiImg }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    
                    // 2. Scene / Setting Selection
                    VStack(alignment: .leading, spacing: 12) {
                        Text("🎭 2. Choose Editorial Setting")
                            .font(.subheadline)
                            .fontWeight(.bold)
                            .foregroundColor(AraadhyaTheme.textPrimary)
                        
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                            ForEach(0..<scenes.count, id: \.self) { idx in
                                let scene = scenes[idx]
                                Button {
                                    selectedSceneIndex = idx
                                } label: {
                                    VStack(alignment: .leading, spacing: 6) {
                                        HStack {
                                            Image(systemName: scene.2)
                                                .foregroundColor(selectedSceneIndex == idx ? AraadhyaTheme.primary : AraadhyaTheme.textSecondary)
                                            Spacer()
                                            if selectedSceneIndex == idx {
                                                Image(systemName: "checkmark.circle.fill")
                                                    .foregroundColor(AraadhyaTheme.primary)
                                            }
                                        }
                                        Text(scene.0)
                                            .font(.subheadline)
                                            .fontWeight(.bold)
                                            .foregroundColor(selectedSceneIndex == idx ? AraadhyaTheme.primary : AraadhyaTheme.textPrimary)
                                        Text(scene.1)
                                            .font(.caption2)
                                            .foregroundColor(AraadhyaTheme.textSecondary)
                                            .lineLimit(1)
                                    }
                                    .padding(12)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .background(selectedSceneIndex == idx ? AraadhyaTheme.primary.opacity(0.08) : Color.white)
                                    .cornerRadius(12)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12)
                                            .stroke(selectedSceneIndex == idx ? AraadhyaTheme.primary : AraadhyaTheme.borderColor, lineWidth: 1.5)
                                    )
                                }
                            }
                        }
                    }
                    
                    // 3. Multi-Angle Shots Included
                    VStack(alignment: .leading, spacing: 10) {
                        Text("📐 3. Multi-Angle Editorial Shots (Auto-Generated)")
                            .font(.subheadline)
                            .fontWeight(.bold)
                            .foregroundColor(AraadhyaTheme.textPrimary)
                        
                        VStack(spacing: 8) {
                            ForEach(shotAngles, id: \.0) { shot in
                                HStack {
                                    Image(systemName: "checkmark.seal.fill")
                                        .foregroundColor(AraadhyaTheme.gold)
                                    Text(shot.0)
                                        .font(.caption)
                                        .fontWeight(.semibold)
                                        .foregroundColor(AraadhyaTheme.textPrimary)
                                    Spacer()
                                    Text(shot.1)
                                        .font(.caption2)
                                        .foregroundColor(AraadhyaTheme.textSecondary)
                                }
                                .padding(.horizontal, 12)
                                .padding(.vertical, 8)
                                .background(Color.white)
                                .cornerRadius(8)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 8)
                                        .stroke(AraadhyaTheme.borderColor, lineWidth: 1)
                                )
                            }
                        }
                    }
                    
                    // 4. Action Button & Progress
                    if isGenerating {
                        VStack(spacing: 12) {
                            ProgressView(value: generationProgress, total: 1.0)
                                .tint(AraadhyaTheme.primary)
                            HStack {
                                Text(progressText)
                                    .font(.caption)
                                    .foregroundColor(AraadhyaTheme.textPrimary)
                                Spacer()
                                Text("\(Int(generationProgress * 100))%")
                                    .font(.caption)
                                    .fontWeight(.bold)
                                    .foregroundColor(AraadhyaTheme.primary)
                            }
                        }
                        .padding()
                        .background(Color.white)
                        .cornerRadius(12)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(AraadhyaTheme.borderColor, lineWidth: 1)
                        )
                    } else {
                        Button {
                            Task { await runAIGeneration() }
                        } label: {
                            HStack(spacing: 10) {
                                Image(systemName: "wand.and.stars.inverse")
                                Text("Generate 4-Angle Model Shoot")
                                    .font(.headline)
                                    .fontWeight(.bold)
                            }
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(inputImage == nil ? Color.gray.opacity(0.35) : AraadhyaTheme.primary)
                            .cornerRadius(14)
                        }
                        .disabled(inputImage == nil)
                    }
                    
                    // 5. Success / Generated Showcase
                    if !generatedShots.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            HStack {
                                Text("🎉 AI Photoshoot Ready!")
                                    .font(.headline)
                                    .fontWeight(.bold)
                                    .foregroundColor(AraadhyaTheme.primary)
                                Spacer()
                            }
                            
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 12) {
                                    ForEach(generatedShots, id: \.self) { urlString in
                                        AsyncImage(url: URL(string: urlString)) { phase in
                                            if let img = phase.image {
                                                img.resizable()
                                                    .scaledToFill()
                                                    .frame(width: 140, height: 190)
                                                    .cornerRadius(12)
                                            } else {
                                                Rectangle()
                                                    .fill(AraadhyaTheme.inputBg)
                                                    .frame(width: 140, height: 190)
                                                    .cornerRadius(12)
                                            }
                                        }
                                    }
                                }
                            }
                            
                            Button {
                                isPublished = true
                            } label: {
                                HStack {
                                    Image(systemName: "arrow.up.circle.fill")
                                    Text("Apply & Publish Shoot to Website")
                                        .fontWeight(.bold)
                                }
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(AraadhyaTheme.success)
                                .cornerRadius(12)
                            }
                        }
                        .padding(16)
                        .background(Color.white)
                        .cornerRadius(16)
                        .overlay(
                            RoundedRectangle(cornerRadius: 16)
                                .stroke(AraadhyaTheme.borderColor, lineWidth: 1)
                        )
                    }
                }
                .padding()
            }
            .background(AraadhyaTheme.appBg)
            .navigationTitle("AI Studio")
            .navigationBarHidden(true)
        }
    }
    
    private func runAIGeneration() async {
        isGenerating = true
        generationProgress = 0.15
        progressText = "Analyzing fabric texture & embroidery..."
        
        try? await Task.sleep(nanoseconds: 1_200_000_000)
        generationProgress = 0.45
        progressText = "Generating Royal Awadhi Model & Courtyard Scene..."
        
        try? await Task.sleep(nanoseconds: 1_500_000_000)
        generationProgress = 0.80
        progressText = "Synthesizing 4-Angle Lighting & Macro Stitches..."
        
        try? await Task.sleep(nanoseconds: 1_200_000_000)
        generationProgress = 1.0
        progressText = "Campaign Photoshoot Complete!"
        
        await MainActor.run {
            self.generatedShots = [
                "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800",
                "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800",
                "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=800",
                "https://images.unsplash.com/photo-1609357605129-26f69add5d6e?w=800"
            ]
            self.isGenerating = false
        }
    }
}
