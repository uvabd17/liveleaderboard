'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Event {
  id: string;
  name: string;
  slug: string;
}

export default function EmbedPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [embedCode, setEmbedCode] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch('/api/events');
        if (res.ok) {
          const data = await res.json();
          setEvents(data.events || []);
          if (data.events?.length > 0) {
            setSelectedEvent(data.events[0].slug);
          }
        }
      } catch (error) {
        console.error('Failed to fetch events:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, []);

  useEffect(() => {
    if (!selectedEvent) return;
    
    const baseUrl = window.location.origin;
    const embedUrl = `${baseUrl}/e/${selectedEvent}/leaderboard`;
    setPreviewUrl(embedUrl);
    
    const code = `<iframe src="${embedUrl}" width="100%" height="600" frameborder="0" style="border: 1px solid #ccc; border-radius: 8px;"></iframe>`;
    setEmbedCode(code);
  }, [selectedEvent]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white">Loading events...</div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8">
        <h1 className="text-2xl font-bold text-white mb-4">No Events Found</h1>
        <p className="text-slate-400 mb-6">Create an event first to generate embed codes.</p>
        <Link 
          href="/dashboard" 
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Embed Leaderboard</h1>
        <p className="text-slate-400 mb-8">
          Embed the live leaderboard on your website using the code below.
        </p>

        {/* Event Selector */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Select Event
          </label>
          <select
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            className="w-full max-w-md px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {events.map((event) => (
              <option key={event.id} value={event.slug}>
                {event.name}
              </option>
            ))}
          </select>
        </div>

        {/* Embed Code */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Embed Code</h2>
          <div className="relative">
            <textarea
              readOnly
              value={embedCode}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg font-mono text-sm text-slate-300 min-h-[120px] resize-y"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(embedCode);
                alert('Embed code copied to clipboard!');
              }}
              className="absolute top-3 right-3 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
            >
              Copy Code
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Preview</h2>
          <div className="border border-slate-700 rounded-lg overflow-hidden">
            {previewUrl && (
              <iframe
                src={previewUrl}
                width="100%"
                height="600"
                style={{ border: 'none', display: 'block' }}
                title="Leaderboard Embed Preview"
              />
            )}
          </div>
        </div>

        {/* Customization Tips */}
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Customization Options</h2>
          <p className="text-slate-400 mb-4">
            Customize the iframe dimensions by modifying the <code className="bg-slate-800 px-1.5 py-0.5 rounded">width</code> and <code className="bg-slate-800 px-1.5 py-0.5 rounded">height</code> attributes:
          </p>
          <ul className="text-slate-400 space-y-2">
            <li>• Standard: width="100%" height="600"</li>
            <li>• Compact: width="100%" height="400"</li>
            <li>• Full Screen: width="100%" height="800"</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
