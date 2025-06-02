// /home/www/froogle/src/app/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Always redirect to /batches
    // The /batches page will then handle checking if the user is logged in
    // and display either the batches content or the login form.
    router.push('/batches');
  }, [router]);

  return (
    <div className="p-8 text-center text-xl font-semibold text-gray-700">
      <p>Redirecting to Lightboxes...</p>
    </div>
  );
}
