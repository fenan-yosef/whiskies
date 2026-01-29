'use client';

import React from "react"

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Whisky } from '@/lib/mockData';

interface WhiskyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (whisky: any) => Promise<void>;
  whisky?: Whisky | null;
}

const emptyForm = {
  name: '',
  price: '',
  url: '',
  image_url: '',
  volume: '',
  abv: '',
  description: '',
  distillery: '',
  region: '',
  age: '',
  cask_type: '',
  tasting_notes: '',
  source: 'distillery',
  month: 'January',
};

export default function WhiskyModal({ isOpen, onClose, onSave, whisky }: WhiskyModalProps) {
  const [formData, setFormData] = useState<any>(whisky || emptyForm);
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
      const payload = whisky
        ? {
            id: whisky.id,
            ...formData,
          }
        : formData;

      await onSave(payload);

      if (!whisky) {
        toast.success('Whisky added successfully!');
      } else {
        toast.success('Whisky updated successfully!');
      }

      setFormData(emptyForm);
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save whisky');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setFormData(whisky || emptyForm);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{whisky ? 'Edit Whisky' : 'Add New Whisky'}</DialogTitle>
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
                placeholder="e.g., Glenmorangie The Original"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price *</Label>
              <Input
                id="price"
                name="price"
                value={formData.price}
                onChange={handleChange}
                placeholder="e.g., $45.99"
                required
              />
            </div>
          </div>

          {/* Distillery and Region */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="distillery">Distillery *</Label>
              <Input
                id="distillery"
                name="distillery"
                value={formData.distillery}
                onChange={handleChange}
                placeholder="e.g., Glenmorangie"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="region">Region *</Label>
              <Input
                id="region"
                name="region"
                value={formData.region}
                onChange={handleChange}
                placeholder="e.g., Highlands"
                required
              />
            </div>
          </div>

          {/* Volume and ABV */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="volume">Volume</Label>
              <Input
                id="volume"
                name="volume"
                value={formData.volume}
                onChange={handleChange}
                placeholder="e.g., 700ml"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="abv">ABV</Label>
              <Input
                id="abv"
                name="abv"
                value={formData.abv}
                onChange={handleChange}
                placeholder="e.g., 40%"
              />
            </div>
          </div>

          {/* Age and Cask Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                name="age"
                value={formData.age}
                onChange={handleChange}
                placeholder="e.g., 10 years"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cask_type">Cask Type</Label>
              <Input
                id="cask_type"
                name="cask_type"
                value={formData.cask_type}
                onChange={handleChange}
                placeholder="e.g., ex-Bourbon"
              />
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
              placeholder="Enter a detailed description of the whisky"
              rows={3}
            />
          </div>

          {/* Tasting Notes */}
          <div className="space-y-2">
            <Label htmlFor="tasting_notes">Tasting Notes</Label>
            <Textarea
              id="tasting_notes"
              name="tasting_notes"
              value={formData.tasting_notes}
              onChange={handleChange}
              placeholder="e.g., Citrus, floral, vanilla"
              rows={2}
            />
          </div>

          {/* Source and Month */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <select
                id="source"
                name="source"
                value={formData.source}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
              >
                <option value="distillery">Distillery</option>
                <option value="distributor">Distributor</option>
                <option value="retailer">Retailer</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="month">Month</Label>
              <select
                id="month"
                name="month"
                value={formData.month}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
              >
                {[
                  'January',
                  'February',
                  'March',
                  'April',
                  'May',
                  'June',
                  'July',
                  'August',
                  'September',
                  'October',
                  'November',
                  'December',
                ].map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Whisky'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
