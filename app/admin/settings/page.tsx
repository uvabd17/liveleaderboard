'use client';

import { useEffect, useState } from 'react';
import { EventFeatures, defaultFeatures, mergeFeatures, featureMetadata, getFeatureValue, setFeatureValue } from '@/lib/features';

export default function AdminSettingsPage() {
  const [features, setFeatures] = useState<EventFeatures>(defaultFeatures);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadFeatures();
  }, []);

  async function loadFeatures() {
    try {
      const res = await fetch('/api/event/settings');
      if (res.ok) {
        const data = await res.json();
        setFeatures(mergeFeatures(data.features));
      }
    } catch (error) {
      console.error('Failed to load features:', error);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  }

  async function saveFeatures() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/event/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Failed to save settings' });
      }
    } catch (error) {
      console.error('Failed to save features:', error);
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  }

  function toggleFeature(path: string) {
    const currentValue = getFeatureValue(features, path);
    const newValue = typeof currentValue === 'boolean' ? !currentValue : true;
    setFeatures(setFeatureValue(features, path, newValue));
  }

  function updateFeatureConfig(path: string, configKey: string, value: any) {
    const currentValue = getFeatureValue(features, path);
    const newValue = { ...currentValue, [configKey]: value };
    setFeatures(setFeatureValue(features, path, newValue));
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading settings...</p>
      </div>
    );
  }

  const highPriority = featureMetadata.filter(f => f.priority === 'high');
  const mediumPriority = featureMetadata.filter(f => f.priority === 'medium');

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '1rem' }}>Event Feature Settings</h1>
      <p style={{ marginBottom: '2rem', color: '#666' }}>
        Configure which features are enabled for your leaderboard event.
      </p>

      {message && (
        <div
          style={{
            padding: '1rem',
            marginBottom: '2rem',
            borderRadius: '4px',
            backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
            color: message.type === 'success' ? '#155724' : '#721c24',
            border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
          }}
        >
          {message.text}
        </div>
      )}

      <div style={{ marginBottom: '3rem' }}>
        <h2 style={{ marginBottom: '1rem', color: '#2563eb' }}>High Priority Features</h2>
        <div style={{ display: 'grid', gap: '1rem' }}>
          {highPriority.map((meta) => (
            <FeatureCard
              key={meta.id}
              meta={meta}
              features={features}
              onToggle={toggleFeature}
              onConfigChange={updateFeatureConfig}
            />
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '3rem' }}>
        <h2 style={{ marginBottom: '1rem', color: '#7c3aed' }}>Medium Priority Features</h2>
        <div style={{ display: 'grid', gap: '1rem' }}>
          {mediumPriority.map((meta) => (
            <FeatureCard
              key={meta.id}
              meta={meta}
              features={features}
              onToggle={toggleFeature}
              onConfigChange={updateFeatureConfig}
            />
          ))}
        </div>
      </div>

      <div style={{ position: 'sticky', bottom: '1rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
        <button
          onClick={() => setFeatures(defaultFeatures)}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#fff',
            color: '#333',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Reset to Defaults
        </button>
        <button
          onClick={saveFeatures}
          disabled={saving}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}

function FeatureCard({
  meta,
  features,
  onToggle,
  onConfigChange,
}: {
  meta: any;
  features: EventFeatures;
  onToggle: (path: string) => void;
  onConfigChange: (path: string, configKey: string, value: any) => void;
}) {
  const value = getFeatureValue(features, meta.id);
  const isEnabled = typeof value === 'boolean' ? value : value?.enabled;

  return (
    <div
      style={{
        padding: '1.5rem',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        backgroundColor: isEnabled ? '#f0f9ff' : '#fff',
        transition: 'all 0.2s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem', fontWeight: 600 }}>
            {meta.name}
          </h3>
          <p style={{ margin: 0, color: '#666', fontSize: '0.875rem' }}>{meta.description}</p>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginLeft: '1rem' }}>
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={() => onToggle(meta.id)}
            style={{
              width: '20px',
              height: '20px',
              cursor: 'pointer',
              accentColor: '#2563eb',
            }}
          />
        </label>
      </div>

      {/* Configuration options */}
      {isEnabled && meta.configurable && (
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
          {meta.configurable.type === 'number' && (
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                Configuration Value:
              </label>
              <input
                type="number"
                min={meta.configurable.min}
                max={meta.configurable.max}
                value={typeof value === 'object' ? value.weight : 0}
                onChange={(e) => onConfigChange(meta.id, 'weight', parseInt(e.target.value))}
                style={{
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  width: '150px',
                }}
              />
              {meta.configurable.min !== undefined && (
                <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem', color: '#666' }}>
                  ({meta.configurable.min}-{meta.configurable.max})
                </span>
              )}
            </div>
          )}

          {meta.configurable.type === 'select' && meta.id === 'presentation.podiumWinners' && (
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                Number of Winners:
              </label>
              <select
                value={value?.topN || 3}
                onChange={(e) => onConfigChange(meta.id, 'topN', parseInt(e.target.value))}
                style={{
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  width: '150px',
                }}
              >
                {meta.configurable.options.map((opt: any) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {meta.configurable.type === 'select' && meta.id === 'leaderboardVisibility.scoreBreakdown' && (
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                Detail Level:
              </label>
              <select
                value={value?.detail || 'total'}
                onChange={(e) => onConfigChange(meta.id, 'detail', e.target.value)}
                style={{
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  width: '200px',
                }}
              >
                {meta.configurable.options.map((opt: any) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {meta.configurable.type === 'multiselect' && (
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                Select Languages:
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {meta.configurable.options.map((opt: any) => (
                  <label
                    key={opt.value}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      backgroundColor: value?.languages?.includes(opt.value) ? '#dbeafe' : '#fff',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={value?.languages?.includes(opt.value) || false}
                      onChange={(e) => {
                        const currentLangs = value?.languages || ['en'];
                        const newLangs = e.target.checked
                          ? [...currentLangs, opt.value]
                          : currentLangs.filter((l: string) => l !== opt.value);
                        onConfigChange(meta.id, 'languages', newLangs);
                      }}
                      style={{ marginRight: '0.5rem', accentColor: '#2563eb' }}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
