"use client";

import React, { useState, useEffect } from 'react';
import { FiX } from 'react-icons/fi';

type Whisky = {
  id?: number;
  name?: string;
  price?: string;
  url?: string;
  image_url?: string;
  distillery?: string;
  region?: string;
  volume?: string;
  abv?: string;
  description?: string;
  source?: string;
  month?: string;
};

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  whisky?: Partial<Whisky> | null;
}

export default function WhiskyModal({ isOpen, onClose, onSave, whisky }: ModalProps) {
  const [formData, setFormData] = useState<Partial<Whisky>>({});

  useEffect(() => {
    if (whisky) {
      setFormData(whisky);
    } else {
      setFormData({ source: 'manual', month: new Date().toLocaleString('default', { month: 'long' }) });
    }
  }, [whisky, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = formData.id ? 'PUT' : 'POST';
    try {
      const res = await fetch('/api/whiskies', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (json.success) {
        onSave();
        onClose();
      } else {
        alert('Error: ' + json.error);
      }
    } catch (err) {
      alert('Failed to save');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-xl font-bold dark:text-white">
            {formData.id ? 'Edit Whisky' : 'Add New Whisky'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
            <FiX className="text-xl" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[70vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-zinc-500 mb-1">Whisky Name</label>
              <input
                required
                className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                value={formData.name || ''}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-zinc-500 mb-1">Price</label>
              <input
                className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                value={formData.price || ''}
                onChange={e => setFormData({ ...formData, price: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-500 mb-1">Distillery</label>
              <input
                className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                value={formData.distillery || ''}
                onChange={e => setFormData({ ...formData, distillery: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-500 mb-1">Region</label>
              <input
                className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                value={formData.region || ''}
                onChange={e => setFormData({ ...formData, region: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-zinc-500 mb-1">ABV (%)</label>
                <input
                  className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                  value={formData.abv || ''}
                  onChange={e => setFormData({ ...formData, abv: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-500 mb-1">Volume</label>
                <input
                  className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                  value={formData.volume || ''}
                  onChange={e => setFormData({ ...formData, volume: e.target.value })}
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-zinc-500 mb-1">URL</label>
              <input
                className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                value={formData.url || ''}
                onChange={e => setFormData({ ...formData, url: e.target.value })}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-zinc-500 mb-1">Description</label>
              <textarea
                className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all h-24"
                value={formData.description || ''}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-amber-500 text-zinc-900 font-semibold rounded-xl hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
