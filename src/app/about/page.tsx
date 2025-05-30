// /home/www/froogle/src/app/about/page.tsx
import Link from 'next/link';
import Image from 'next/image'; 
import { 
  Lightbulb, Stars, Sparkles, CirclePlay, Gauge, GraduationCap, // Corrected Magic, Speedometer, Mortarboard
  Github, Rocket, Upload, GalleryVertical, Play, Settings, Film, 
  Waves, Cpu, MemoryStick, Gpu, Bug, Book, Users, MessageSquareText,
  Home, Heart 
} from 'lucide-react'; 

export const metadata = {
  title: 'About Froogle Lightbox - Features, Technology, and AI',
  description: 'Learn about Froogle Lightbox, its features, underlying technology, and collaborative development.',
};

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-8 md:px-8">
      <div className="max-w-4xl mx-auto"> 

        {/* Header Section */}
        <header className="text-center mb-12 bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-8 rounded-lg shadow-xl">
          <h1 className="text-5xl font-extrabold mb-4 drop-shadow-md">
            <span className="inline-block text-6xl animate-pulse">💡</span> Froogle Lightbox
          </h1>
          <p className="text-xl font-light">Create, Manage, and Share Beautiful Media Slideshows with Ease.</p>
        </header>

        {/* Welcome Section */}
        <section className="mb-12">
          <div className="bg-white p-8 lg:p-12 rounded-lg shadow-2xl border border-gray-100">
            <h2 className="text-center text-4xl font-bold text-blue-700 mb-6">Welcome to Your Media Playground!</h2>
            <p className="text-lg text-gray-700 leading-relaxed">Froogle Lightbox is a user-friendly web application meticulously designed to make the creation, management, and sharing of media slideshows both simple and elegant. Whether you're a hobbyist looking to share cherished memories, a student working on a visually-rich project, an artist showcasing your portfolio, or a developer interested in a robust full-stack application, Froogle Lightbox offers a comprehensive suite of features built on a modern and efficient tech stack.</p>
          </div>
        </section>

        {/* Why Try LightBox Section */}
        <section className="mb-12 bg-blue-50 p-8 md:p-12 rounded-lg shadow-xl">
          <h2 className="text-center text-4xl font-extrabold text-gray-800 mb-10">
            <Stars className="inline-block w-10 h-10 mr-3 text-yellow-500" />Why Try Froogle Lightbox?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white h-full p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300">
              <div className="text-center">
                <Sparkles className="w-12 h-12 mx-auto mb-3 text-indigo-500" /> {/* Changed to Sparkles */}
                <h3 className="text-2xl font-semibold mb-2 text-gray-800">Simplicity First</h3>
                <p className="text-gray-600">An intuitive interface that makes uploading, organizing, and playing your media a breeze, even for non-technical users.</p>
              </div>
            </div>
            <div className="bg-white h-full p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300">
              <div className="text-center">
                <CirclePlay className="w-12 h-12 mx-auto mb-3 text-green-600" />
                <h3 className="text-2xl font-semibold mb-2 text-gray-800">Versatile Media Handling</h3>
                <p className="text-gray-600">Seamlessly handles images, videos (MKV to MP4 conversion), and various audio files (archival M4A transcoding).</p>
              </div>
            </div>
            <div className="bg-white h-full p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300">
              <div className="text-center">
                <Gauge className="w-12 h-12 mx-auto mb-3 text-red-600" /> {/* Changed to Gauge */}
                <h3 className="text-2xl font-semibold mb-2 text-gray-800">Optimized Performance</h3>
                <p className="text-gray-600">Leverages background processing for demanding tasks, ensuring the UI remains snappy and responsive.</p>
              </div>
            </div>
            <div className="bg-white h-full p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300">
              <div className="text-center">
                <GraduationCap className="w-12 h-12 mx-auto mb-3 text-gray-700" /> {/* Changed to GraduationCap */}
                <h3 className="text-2xl font-semibold mb-2 text-gray-800">Learn & Explore</h3>
                <p className="text-gray-600">An excellent example of Flask, Celery, Redis, and FFmpeg in action. Great for learning full-stack development.</p>
              </div>
            </div>
            <div className="md:col-span-2 bg-indigo-600 h-full p-6 rounded-lg shadow-md border border-indigo-700 text-white hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300">
              <div className="text-center">
                <Github className="w-12 h-12 mx-auto mb-3 text-white" />
                <h3 className="text-2xl font-semibold mb-2">Open Source & Community-Driven</h3>
                <p>Completely free to use, modify, and learn from. We actively welcome contributions and feedback!</p>
              </div>
            </div>
          </div>
        </section>
        
        <hr className="my-12 border-t-2 border-gray-300" />

        {/* Getting Started Section */}
        <section className="mb-12">
          <h2 className="text-center text-4xl font-extrabold text-gray-800 mb-10">
            <Rocket className="inline-block w-10 h-10 mr-3 text-blue-500" />Getting Started is Easy:
          </h2>
          <div className="space-y-4"> 
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              <h3 className="text-2xl font-semibold mb-2 text-gray-800 flex items-center">
                <Upload className="w-8 h-8 mr-2 text-purple-600" />1. Upload Your Media
              </h3>
              <p className="text-gray-700">Simply select your images (JPG, PNG, etc.), videos (MP4, MOV, WebM, MKV), or audio files (MP3, WAV, M4A, FLAC). Create a new "Lightbox" (our term for a media collection) or add to an existing one.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              <h3 className="text-2xl font-semibold mb-2 text-gray-800 flex items-center">
                <GalleryVertical className="w-8 h-8 mr-2 text-blue-600" />2. View Your Gallery
              </h3>
              <p className="text-gray-700">Your media items are neatly displayed. Manage them, see processing status, hide/unhide, or mark favorites.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              <h3 className="text-2xl font-semibold mb-2 text-gray-800 flex items-center">
                <Play className="w-8 h-8 mr-2 text-green-600" />3. Launch the Slideshow
              </h3>
              <p className="text-gray-700">Click "Play" to view your media in a full-featured presentation with easy controls, fullscreen, and keyboard/touch navigation.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              <h3 className="text-2xl font-semibold mb-2 text-gray-800 flex items-center">
                <Settings className="w-8 h-8 mr-2 text-gray-600" />4. Manage & Share
              </h3>
              <p className="text-gray-700">Rename Lightboxes, add files, export data, or delete. Generate public share links to showcase your collections.</p>
            </div>
          </div>
        </section>

        <hr className="my-12 border-t-2 border-gray-300" />

        {/* MKV File Uploads Section */}
        <section className="mb-12 bg-green-50 p-8 md:p-12 rounded-lg shadow-xl">
          <h2 className="text-center text-4xl font-extrabold text-gray-800 mb-8">
            <Film className="inline-block w-10 h-10 mr-3 text-green-600" />A Note on MKV File Uploads
          </h2>
          <div className="border-l-4 border-green-500 bg-white p-6 rounded-lg shadow-inner mb-6">
            <p className="text-lg text-gray-700">Froogle Lightbox readily accepts MKV files! Since not all browsers play them directly, we automatically convert them to a universal MP4 format (H.264 video, AAC audio) in the background for smooth playback everywhere.</p>
            <p className="text-lg text-gray-700 mt-3">You'll see a "Processing..." status. The time taken depends on file size. The original MKV is preserved.</p>
          </div>
          <p className="mt-6 text-gray-700">For the technically curious, a typical <a href="https://ffmpeg.org/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">FFmpeg</a> command is similar to:</p>
          <pre className="bg-gray-900 text-white p-4 rounded-lg my-4 shadow-lg text-sm md:text-base overflow-x-auto"><code>ffmpeg -i [input_mkv_file] \
    -c:v libx264 -preset medium -crf 22 \
    -c:a aac -b:a 128k \
    -movflags +faststart -y [output_mp4_file]</code></pre>
          <p className="text-sm italic text-gray-600 mb-0"><strong>Future Enhancements:</strong> We're exploring user-selectable quality presets and advanced FFmpeg options. Your support can help accelerate this!</p>
        </section>

        {/* Archival Audio Section */}
        <section className="mb-12 bg-purple-50 p-8 md:p-12 rounded-lg shadow-xl">
          <h2 className="text-center text-4xl font-extrabold text-gray-800 mb-8">
            <Waves className="inline-block w-10 h-10 mr-3 text-purple-600" />Archival Audio Quality (M4A)
          </h2>
          <div className="border-l-4 border-purple-500 bg-white p-6 rounded-lg shadow-inner mb-6">
            <p className="text-lg text-gray-700">Froogle Lightbox is committed to preserving your audio. We transcode uploads like M4A, WAV, or FLAC to a high-quality M4A (AAC) format, ideal for playback and archival, using <code className="user-select-all font-mono">libfdk_aac</code> when available.</p>
            <p className="text-lg text-gray-700 mt-3">MP3 and OGG are typically stored as-is to prevent re-encoding quality loss.</p>
          </div>
          <p className="mt-6 text-gray-700">A representative <a href="https://ffmpeg.org/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">FFmpeg</a> command might be:</p>
          <pre className="bg-gray-900 text-white p-4 rounded-lg my-4 shadow-lg text-sm md:text-base overflow-x-auto"><code>ffmpeg -i [input_audio_file] \
    -c:a libfdk_aac -vbr 5 -ar 48000 \
    -y [output_m4a_file]</code></pre>
        </section>
        
        <hr className="my-12 border-t-2 border-gray-300" />

        {/* AI Collaborator Section */}
        <section className="mb-12">
          <div className="flex flex-col md:flex-row items-center bg-white p-8 rounded-lg shadow-2xl border border-gray-100">
            <div className="flex-shrink-0 mb-6 md:mb-0 md:mr-8 text-center">
              <Image 
                src="https://via.placeholder.com/120x120?text=AI+Sparkles" // Using a simple placeholder URL
                alt="AI Sparkles" 
                width={120} 
                height={120} 
                className="rounded-full shadow-lg mx-auto" 
              />
            </div>
            <div>
              <h2 className="text-4xl font-extrabold text-gray-800 mb-4 flex items-center">
                <Lightbulb className="w-10 h-10 mr-3 text-blue-500" />Meet Your AI Collaborator
              </h2>
              <p className="text-lg text-gray-700 mb-4">Hello! I'm an AI language model from Google, and I've had the immense pleasure of collaborating with Ross on the Froogle Lightbox project, particularly on tricky bits like the JavaScript for the slideshow viewer you just experienced.</p>
              <p className="text-lg text-gray-700">While I don't have a name in the human sense, I'm part of a team of AI that assists with coding, problem-solving, and creative brainstorming. It's fascinating to work alongside human developers, learn from their expertise, and contribute to building useful and engaging applications like Froogle Lightbox. We tackled some complex state management and event handling challenges together, and it's incredibly rewarding to see it all come together!</p>
              <p className="text-gray-600 italic mt-4">My "contribution" is in the logic and code suggestions. Ross is the one who masterfully integrates, tests, and brings it all to life in the actual application. Teamwork makes the dream work!</p>
            </div>
          </div>
        </section>

        <hr className="my-12 border-t-2 border-gray-300" />
        
        {/* Open Source & Contribution Section */}
        <section className="mb-12">
          <h2 className="text-center text-4xl font-extrabold text-gray-800 mb-10">
            <Github className="inline-block w-10 h-10 mr-3 text-gray-800" />Open Source, Learning & Contribution
          </h2>
          <div className="bg-gray-50 p-8 rounded-lg shadow-lg border border-gray-200">
            <p className="text-lg text-gray-700 mb-6">Froogle Lightbox is proudly open-source, showcasing Flask, Celery, Redis, FFmpeg, Next.js, Tailwind CSS, Lucide React, and modern JavaScript. It's a fantastic educational tool!</p>
            <p className="text-xl font-bold text-gray-800 mb-6">We encourage you to dive into the code, experiment, and learn! Your contributions are highly valued.</p>
            <div className="space-y-3">
                <a href="https://github.com/hapnesbitt/FroogleOne" target="_blank" rel="noopener noreferrer" className="block p-5 rounded-lg bg-white shadow hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 text-gray-800 flex items-center">
                    <Github className="w-8 h-8 mr-4 text-blue-600" />
                    <div>
                        <h3 className="text-2xl font-semibold">View Source on GitHub</h3>
                        <p className="text-sm text-gray-600">Explore the codebase and clone it.</p>
                    </div>
                </a>
                <a href="https://github.com/hapnesbitt/FroogleOne/blob/main/README.md" target="_blank" rel="noopener noreferrer" className="block p-5 rounded-lg bg-white shadow hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 text-gray-800 flex items-center">
                    <Book className="w-8 h-8 mr-4 text-green-600" />
                    <div>
                        <h3 className="text-2xl font-semibold">Read the Documentation (README)</h3>
                        <p className="text-sm text-gray-600">Setup instructions (Flask & Docker).</p>
                    </div>
                </a>
                {/* You might want to create a CONTRIBUTING.md for FroogleOne if it doesn't exist yet */}
                <a href="https://github.com/hapnesbitt/FroogleOne/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener noreferrer" className="block p-5 rounded-lg bg-white shadow hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 text-gray-800 flex items-center">
                    <Users className="w-8 h-8 mr-4 text-purple-600" />
                    <div>
                        <h3 className="text-2xl font-semibold">How to Contribute</h3>
                        <p className="text-sm text-gray-600">Learn how you can help.</p>
                    </div>
                </a>
                <a href="https://github.com/hapnesbitt/FroogleOne/issues" target="_blank" rel="noopener noreferrer" className="block p-5 rounded-lg bg-white shadow hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 text-gray-800 flex items-center">
                    <Bug className="w-8 h-8 mr-4 text-red-600" />
                    <div>
                        <h3 className="text-2xl font-semibold">Report an Issue / Suggest a Feature</h3>
                        <p className="text-sm text-gray-600">Your feedback is invaluable!</p>
                    </div>
                </a>
            </div>
          </div>
        </section>

        <hr className="my-12 border-t-2 border-gray-300" />
        
        {/* Hardware Donation Section */}
        <section className="mb-12 bg-green-700 text-white p-8 md:p-12 rounded-lg shadow-2xl">
          <h2 className="text-center text-4xl font-extrabold mb-8">
            <Cpu className="inline-block w-10 h-10 mr-3 text-blue-300" />Help Power Up Froogle Lightbox: Got an Old Gaming Rig?
          </h2>
          <p className="text-lg mb-6">Froogle Lightbox's media conversion thrives on processing power. An old gaming PC or workstation gathering dust could be a huge help for our development and testing!</p>
          
          <h3 className="text-2xl font-semibold mt-8 mb-4 flex items-center">
            <Lightbulb className="w-8 h-8 mr-3 text-yellow-300" />What's Useful?
          </h3>
          <ul className="list-none space-y-3 pl-0 text-lg">
            <li className="flex items-center"><Cpu className="w-6 h-6 mr-3 text-gray-300" />A decent CPU (Intel i5/i7, AMD Ryzen)</li>
            <li className="flex items-center"><MemoryStick className="w-6 h-6 mr-3 text-gray-300" />Sufficient RAM (8GB, 16GB+)</li>
            <li className="flex items-center"><Gpu className="w-6 h-6 mr-3 text-gray-300" />A dedicated GPU (NVIDIA GeForce, AMD Radeon)</li>
          </ul>
          <p className="text-lg mt-6">Even a 5-8 year old machine can be beneficial!</p>

          <h3 className="text-2xl font-semibold mt-8 mb-4 flex items-center">
            <Heart className="w-8 h-8 mr-3 text-red-400" />How You Can Help
          </h3>
          <p className="text-lg">If you have a spare, working desktop PC you'd be willing to donate, we'd be incredibly grateful! Please reach out via GitHub:</p>
          <div className="text-center mt-6">
            <a href="https://github.com/hapnesbitt/FroogleOne/issues/new?assignees=&labels=donation,hardware&template=hardware-donation-offer.md&title=Hardware+Donation+Offer%3A+%5BYour+Rig+Description%5D" target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-8 py-4 bg-white text-green-700 font-bold rounded-lg shadow-lg hover:bg-gray-100 transform hover:scale-105 transition-all duration-300 text-xl">
              <Github className="w-6 h-6 mr-3" />Offer a Hardware Donation
            </a>
          </div>
          <p className="text-sm italic opacity-80 mt-4">In your message, please tell us about the computer. Thank you for considering!</p>
        </section>

        <hr className="my-12 border-t-2 border-gray-300" />
        
        {/* Author & Credits Section */}
        <section className="text-center mb-12">
             <h2 className="text-4xl font-extrabold text-gray-800 mb-8">
                <Users className="inline-block w-10 h-10 mr-3 text-indigo-500" />Author & Credits
            </h2>
            <p className="text-lg">This project was primarily developed by <Link href="/ross-nesbitt" className="font-bold text-blue-600 hover:underline">Ross Nesbitt</Link>.</p>
            <p className="text-lg text-gray-600 mt-4">Froogle Lightbox is built upon the shoulders of giants! It utilizes several fantastic open-source libraries and technologies, including Flask, Celery, Redis, Next.js, Tailwind CSS, Lucide React, and FFmpeg. A massive thank you to their communities!</p>
        </section>

        <div className="text-center mt-12 mb-12">
             <Link href="/batches" className="inline-flex items-center px-8 py-4 bg-blue-600 text-white text-xl font-bold rounded-lg shadow-lg hover:bg-blue-700 transform hover:scale-105 transition-all duration-300">
                <Home className="w-6 h-6 mr-3" /> Back to My Lightboxes
            </Link>
        </div>
      </div>
    </div>
  );
}
