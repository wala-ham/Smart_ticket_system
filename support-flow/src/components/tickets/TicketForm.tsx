import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, Send, Save, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TicketCategory, TicketPriority, categoryLabels, priorityLabels } from '@/data/mockData';
import { toast } from '@/hooks/use-toast';

interface TicketFormProps {
  prefilled?: boolean;
}

const TicketForm: React.FC<TicketFormProps> = ({ prefilled = false }) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    category: prefilled ? 'technical' : '' as TicketCategory | '',
    subject: prefilled ? 'Unable to access my account' : '',
    description: prefilled 
      ? 'I am experiencing a login error after submitting my credentials. The system shows "Invalid credentials" even though I am sure my password is correct. I have tried resetting my password but the issue persists.'
      : '',
    priority: prefilled ? 'high' : '' as TicketPriority | '',
    attachments: prefilled ? [{ name: 'error_screenshot.png', size: '245 KB' }] : [] as { name: string; size: string }[],
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newAttachments = Array.from(files).map(file => ({
        name: file.name,
        size: `${(file.size / 1024).toFixed(0)} KB`,
      }));
      setFormData(prev => ({ 
        ...prev, 
        attachments: [...prev.attachments, ...newAttachments] 
      }));
    }
  };

  const removeAttachment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast({
      title: "Ticket Created Successfully!",
      description: "Your ticket has been submitted and is being processed by our AI system.",
    });
    
    setIsSubmitting(false);
    navigate('/tickets');
  };

  const handleSaveDraft = () => {
    toast({
      title: "Draft Saved",
      description: "Your ticket has been saved as a draft.",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
      <div className="card-gradient p-6 lg:p-8 space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">Create New Ticket</h2>
          <p className="text-muted-foreground">
            Fill out the form below and our AI will automatically categorize and prioritize your request.
          </p>
        </div>

        {/* Category */}
        <div className="space-y-2">
          <label htmlFor="category" className="block text-sm font-medium text-foreground">
            Category <span className="text-destructive">*</span>
          </label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            required
            className="form-input"
          >
            <option value="">Select a category</option>
            {Object.entries(categoryLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Subject */}
        <div className="space-y-2">
          <label htmlFor="subject" className="block text-sm font-medium text-foreground">
            Subject <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            id="subject"
            name="subject"
            value={formData.subject}
            onChange={handleInputChange}
            required
            placeholder="Brief summary of your issue"
            className="form-input"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label htmlFor="description" className="block text-sm font-medium text-foreground">
            Description <span className="text-destructive">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            required
            rows={5}
            placeholder="Please describe your issue in detail..."
            className="form-input resize-none"
          />
        </div>

        {/* Priority */}
        <div className="space-y-2">
          <label htmlFor="priority" className="block text-sm font-medium text-foreground">
            Priority <span className="text-destructive">*</span>
          </label>
          <select
            id="priority"
            name="priority"
            value={formData.priority}
            onChange={handleInputChange}
            required
            className="form-input"
          >
            <option value="">Select priority</option>
            {Object.entries(priorityLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Attachments */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            Attachments
          </label>
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
            <input
              type="file"
              id="attachments"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="attachments" className="cursor-pointer">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PNG, JPG, PDF up to 10MB
              </p>
            </label>
          </div>

          {/* Attachment list */}
          {formData.attachments.length > 0 && (
            <div className="space-y-2 mt-3">
              {formData.attachments.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                      <AlertCircle className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{file.size}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachment(index)}
                    className="p-1 hover:bg-background rounded transition-colors"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="btn-gradient flex-1"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Submit Ticket
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveDraft}
            className="flex-1 sm:flex-initial"
          >
            <Save className="h-4 w-4 mr-2" />
            Save as Draft
          </Button>
        </div>
      </div>
    </form>
  );
};

export default TicketForm;
