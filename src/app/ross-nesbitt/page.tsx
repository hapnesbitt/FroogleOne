// /home/www/froogle/src/app/ross-nesbitt/page.tsx
import Link from 'next/link';
import { Github } from 'lucide-react'; // Import Github icon

export const metadata = {
  title: 'Ross Nesbitt - Developer Profile',
  description: 'Learn more about the primary developer of Froogle Lightbox.',
};

export default function RossNesbittPage() {
  return (
    <div className="container mx-auto p-8 text-center min-h-[calc(100vh-128px)] flex flex-col justify-center items-center bg-gray-50 rounded-lg shadow-xl m-4">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Ross Nesbitt</h1>
      <p className="text-lg text-gray-700 mb-6 max-w-2xl">
        Hello! I'm Ross, the primary developer behind Froogle Lightbox.
        This project is a culmination of various technologies and a passion for building
        useful and engaging web applications.
      </p>
      <p className="text-md text-gray-600 mb-8 max-w-2xl">
        It serves as a learning exercise to explore full-stack development
        with Flask, Next.js, Redis, Celery, and other open-source tools.
      </p>
      <Link href="/about" className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-md">
        ← Back to About Froogle Lightbox
      </Link>
      <div className="mt-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-3">Links:</h2>
        <ul className="list-none p-0">
          <li className="mb-2">
            <a 
              href="https://github.com/hapnesbitt" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-blue-500 hover:underline text-lg flex items-center justify-center"
            >
              <Github className="w-6 h-6 mr-2" /> 
              My GitHub Profile
            </a>
          </li>
          {/* Add other links here if you have a personal website, LinkedIn, etc. */}
        </ul>
      </div>
    </div>
  );
}
