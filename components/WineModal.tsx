'use client';

import React from "react"

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Wine } from '@/lib/mockData';

interface WineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (wine: any) => Promise<void>;
  wine?: Wine | null;
}

const emptyForm = {
  name: '',
  price: '',
  url: '',
  image_url: '',
  description: '',
  brand: '',
  source: 'wine.com',
};

export default function WineModal({ isOpen, onClose, onSave, wine }: WineModalProps) {
  const [formData, setFormData] = useState<any>(wine || emptyForm);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const payload = wine
        ? {
            id: wine.id,
            ...formData,
            price: parseFloat(formData.price) || null,
          }
        : {
            ...formData,
            price: parseFloat(formData.price) || null,
          };

      await onSave(payload);

      if (!wine) {
        toast.success('Wine added successfully!');
      } else {
        toast.success('Wine updated successfully!');
      }

      setFormData(emptyForm);
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save wine');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setFormData(wine || emptyForm);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{wine ? 'Edit Wine' : 'Add New Wine'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Chateau Margaux 2015"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price *</Label>
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={handleChange}
                placeholder="e.g., 450.00"
                required
              />
            </div>
          </div>

          {/* Brand and Source */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand">Brand *</Label>
              <Input
                id="brand"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                placeholder="e.g., Chateau Margaux"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <select
                id="source"
                name="source"
                value={formData.source}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
              >
                <option value="wine.com">wine.com</option>
                <option value="vivino">vivino</option>
                <option value="wine-searcher">wine-searcher</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* URL and Image */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                name="url"
                type="url"
                value={formData.url}
                onChange={handleChange}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="image_url">Image URL</Label>
              <Input
                id="image_url"
                name="image_url"
                type="url"
                value={formData.image_url}
                onChange={handleChange}
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter a detailed description of the wine"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Wine'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
