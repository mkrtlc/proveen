import React, { useState, useEffect } from 'react';
import { Testimonial } from '../types';
import { useAppDispatch, useAppSelector } from '../store';
import { updateTestimonial } from '../store/slices/testimonialsSlice';
import { fetchAllBrands } from '../store/slices/brandSlice';
import { Icon } from './Icon';

interface EditTestimonialModalProps {
  isOpen: boolean;
  onClose: () => void;
  testimonial: Testimonial & { brandId?: string; brandName?: string };
}

const EditTestimonialModal: React.FC<EditTestimonialModalProps> = ({ isOpen, onClose, testimonial }) => {
  const dispatch = useAppDispatch();
  const { brands } = useAppSelector((state) => state.brand);
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [content, setContent] = useState('');
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');

  // Load brands when modal opens
  useEffect(() => {
    if (isOpen) {
      dispatch(fetchAllBrands());
    }
  }, [isOpen, dispatch]);

  // Populate form when testimonial changes
  useEffect(() => {
    if (isOpen && testimonial) {
      setName(testimonial.customerName);
      setCompany(testimonial.companyTitle);
      setContent(testimonial.content);
      setRating(testimonial.rating);
      setSelectedBrandId((testimonial as any).brandId || '');
    }
  }, [isOpen, testimonial]);

  if (!isOpen) return null;

  const handleUpdate = async () => {
    if (!name || !content) return;
    
    await dispatch(updateTestimonial({
      id: testimonial.id,
      updates: {
        customerName: name,
        companyTitle: company,
        content,
        rating,
        brandId: selectedBrandId || undefined
      }
    }));
    
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Edit Testimonial</h2>
            <p className="text-sm text-gray-500">Update testimonial details and brand linkage</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
          >
            <Icon name="close" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-main">Customer Name *</label>
                <input 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  className="w-full h-11 rounded-lg border-gray-200 bg-background-light text-sm focus:border-primary focus:ring-primary/20 placeholder:text-text-muted/50" 
                  placeholder="e.g. Sarah Jenkins" 
                  type="text" 
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-main">Company / Title</label>
                <input 
                  value={company} 
                  onChange={(e) => setCompany(e.target.value)} 
                  className="w-full h-11 rounded-lg border-gray-200 bg-background-light text-sm focus:border-primary focus:ring-primary/20 placeholder:text-text-muted/50" 
                  placeholder="e.g. VP Marketing at Acme" 
                  type="text" 
                />
              </div>
              <div className="sm:col-span-2 flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-main">Testimonial *</label>
                <textarea 
                  value={content} 
                  onChange={(e) => setContent(e.target.value)} 
                  className="w-full rounded-lg border-gray-200 bg-background-light text-sm focus:border-primary focus:ring-primary/20 placeholder:text-text-muted/50 min-h-[120px] resize-y" 
                  placeholder="Enter the customer's feedback here..."
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-text-main">Rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((s) => {
                    const isFilled = rating >= s;
                    const isHovered = hoveredRating !== null && s <= hoveredRating;
                    
                    let starColor = 'text-gray-200';
                    if (isFilled) {
                      starColor = 'text-black';
                    } else if (isHovered) {
                      starColor = 'text-[#F4B400]';
                    }
                    
                    return (
                      <button 
                        key={s} 
                        onClick={() => setRating(s)} 
                        onMouseEnter={() => setHoveredRating(s)}
                        onMouseLeave={() => setHoveredRating(null)}
                        className="hover:scale-110 transition-all duration-150"
                      >
                        <Icon name="star" fill={isFilled} className={starColor} />
                      </button>
                    );
                  })}
                </div>
              </div>
              {brands.length > 0 && (
                <div className="sm:col-span-2 flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-text-main">Brand</label>
                  <select
                    value={selectedBrandId}
                    onChange={(e) => setSelectedBrandId(e.target.value)}
                    className="w-full h-11 rounded-lg border-gray-200 bg-background-light text-sm focus:border-primary focus:ring-primary/20 text-text-main"
                  >
                    <option value="">-- No brand --</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500">Link this testimonial to a brand for better organization</p>
                </div>
              )}
            </div>
            <div className="lg:col-span-4 flex flex-col gap-5">
              <div className="flex flex-col gap-1.5 h-full">
                <label className="text-sm font-medium text-text-main">Customer Photo</label>
                <div className="flex-1 border-2 border-dashed border-gray-200 rounded-lg bg-background-light hover:bg-gray-100 transition-colors cursor-pointer flex flex-col items-center justify-center p-4 min-h-[140px] text-center group">
                  <div className="size-10 rounded-full bg-white flex items-center justify-center shadow-sm mb-2 group-hover:scale-110 transition-transform">
                    <Icon name="add_a_photo" className="text-primary" />
                  </div>
                  <span className="text-xs font-medium text-primary">Click to upload</span>
                  <span className="text-[10px] text-text-muted mt-1">SVG, PNG, JPG or GIF (max. 800x400px)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUpdate}
            disabled={!name || !content}
            className="px-6 py-2 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span>Save Changes</span>
            <Icon name="check" size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditTestimonialModal;
