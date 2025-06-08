# AI Story Visualizer

An intelligent web application that transforms your written stories into stunning visual sequences using AI-powered image generation. Upload your story, and watch as the AI breaks it down into scenes, generates descriptive prompts, and creates beautiful illustrations that bring your narrative to life.

## ✨ Features

### 🎭 **Dual Generation Modes**
- **Story Mode**: Breaks your narrative into sequential scenes and visualizes each scene
- **Illustration Mode**: Creates artistic concept illustrations that capture key themes and moments

### 🎨 **Rich Customization Options**
- **Art Styles**: Choose from Cinematic, Photorealistic, Anime/Manga, Fantasy Art, Pixel Art, Comic Book, or Default
- **Aspect Ratios**: Automatic, Widescreen (16:9), Square (1:1), or Portrait (9:16)
- **Character Consistency**: Automatic character detection and consistent visual representation across scenes

### 🤖 **AI-Powered Intelligence**
- Automatic story segmentation into meaningful scenes
- Character identification and detailed description generation
- Smart prompt generation for optimal image quality
- Relevant character detection for each scene

### 📚 **Multi-Part Story Support**
- Handles long stories by automatically splitting them into manageable chunks
- Processes stories up to 50,000 characters
- Maintains character consistency across all parts

### 🎯 **Advanced Features**
- Edit generated prompts before image creation
- Batch image generation for entire stories
- Download individual images or complete story archives
- Character race/ethnicity customization options

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v14 or higher)
- **Gemini API Key** (for AI services)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-story-visualizer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up your API key**
   - Create a `.env.local` file in the root directory
   - Add your Gemini API key:
     ```
     GEMINI_API_KEY=your_api_key_here
     ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   - Navigate to `http://localhost:3000`
   - Start visualizing your stories!

## 🎪 How to Use

### Basic Usage

1. **Input Your Story**: Paste your story, script, or any narrative text into the text area
2. **Choose Generation Mode**: 
   - Select "Story Mode" for scene-by-scene visualization
   - Select "Illustration Mode" for artistic concept illustrations
3. **Customize Settings**: 
   - Pick your preferred art style and aspect ratio
   - Optionally specify character race/ethnicity preferences
4. **Generate Prompts**: Click "Analyze Story & Generate Prompts" to process your story
5. **Review & Edit**: Review the generated prompts and edit them if needed
6. **Create Images**: Generate images for individual scenes or all at once
7. **Download**: Save individual images or download the complete story archive

### Advanced Features

#### Character Management
- The AI automatically detects and describes characters in your story
- Characters are consistently portrayed across all scenes
- You can clear auto-detected characters if needed
- Specify character race/ethnicity for more targeted generation

#### Long Story Handling
- Stories over 7,000 characters are automatically split into parts
- Process each part individually while maintaining character consistency
- Maximum total story length: 50,000 characters

#### Prompt Editing
- Edit any generated prompt before creating the image
- Maintain the AI's character descriptions while customizing scene details
- Re-generate images with modified prompts

## 🛠️ Technical Details

### Built With
- **React 19** - Frontend framework
- **TypeScript** - Type safety and better development experience
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **Google Gemini AI** - Text processing and image generation
- **JSZip** - Archive creation for batch downloads

### Project Structure
```
ai-story-visualizer/
├── src/
│   ├── components/          # React components
│   │   ├── SequenceCard.tsx # Individual scene/sequence display
│   │   └── LoadingSpinner.tsx # Loading indicators
│   ├── services/            # AI service integration
│   │   └── geminiService.ts # Gemini AI API calls
│   ├── types.ts            # TypeScript type definitions
│   ├── App.tsx             # Main application component
│   └── index.tsx           # Application entry point
├── public/                 # Static assets
├── package.json           # Dependencies and scripts
└── README.md             # This file
```

### API Services
The application uses Google's Gemini AI for:
- **Text Model**: `gemini-2.5-flash-preview-04-17` - Story analysis and prompt generation
- **Image Model**: `imagen-3.0-generate-002` - Image generation from prompts

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally

## 🎨 Customization Options

### Image Styles
- **Cinematic**: Realistic film-like quality with dramatic lighting
- **Photorealistic**: Camera-like realistic textures and details
- **Anime/Manga**: Vibrant anime style with dynamic compositions
- **Fantasy Art**: Magical elements with epic, otherworldly details
- **Pixel Art**: Retro video game style with limited color palette
- **Comic Book**: Bold outlines with graphic novel aesthetics
- **Default**: Clean, visually appealing standard style

### Aspect Ratios
- **Automatic**: AI chooses the best ratio for each scene
- **Widescreen (16:9)**: Great for landscape and action scenes
- **Square (1:1)**: Perfect for social media and balanced compositions
- **Portrait (9:16)**: Ideal for character portraits and vertical scenes

## 🔧 Configuration

### Environment Variables
Create a `.env.local` file with:
```
GEMINI_API_KEY=your_gemini_api_key_here
```

### Processing Limits
- Maximum story length: 50,000 characters
- Chunk size for multi-part stories: 7,000 characters
- Scene warning threshold: 20+ scenes
- Image generation delay: 12.5 seconds between requests

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

If you encounter any issues:
1. Check that your API key is properly configured
2. Ensure your story is within the character limits
3. Try refreshing the page if the application becomes unresponsive
4. Check the browser console for error messages

## 🎯 Use Cases

- **Writers**: Visualize your stories and novels
- **Game Developers**: Create concept art for game narratives
- **Content Creators**: Generate visual content for social media
- **Educators**: Create visual aids for storytelling lessons
- **Personal Projects**: Bring your creative writing to life

Transform your words into worlds with AI Story Visualizer! 🚀✨
